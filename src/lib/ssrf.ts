import { lookup } from "node:dns/promises";
import { BlockList, isIP, type LookupFunction } from "node:net";

import { Agent } from "undici";

// SSRF guard for the scraper. The article URL (and every redirect hop) is
// attacker-influenced: an admin routinely accepts URLs proposed anonymously via
// /submit. Without this, `fetch`/`page.goto` would happily reach cloud metadata
// (169.254.169.254), the Postgres service, or any RFC1918 host on the cluster
// network. We resolve the host and reject any address that isn't publicly
// routable, before the request and again after each redirect — then pin the
// connection to the address we validated so DNS can't rebind underneath us.

// Every non-public IPv4/IPv6 range we refuse to connect to. Loopback,
// link-local (covers the 169.254.169.254 cloud metadata endpoint), private
// (RFC1918 / RFC4193 ULA), carrier-grade NAT, benchmarking and the unspecified
// address. node:net's BlockList does the range maths for us.
function buildPrivateRanges(): BlockList {
  const list = new BlockList();
  // IPv4
  list.addSubnet("0.0.0.0", 8, "ipv4"); // "this" network / unspecified
  list.addSubnet("10.0.0.0", 8, "ipv4"); // RFC1918
  list.addSubnet("100.64.0.0", 10, "ipv4"); // CGNAT (RFC6598)
  list.addSubnet("127.0.0.0", 8, "ipv4"); // loopback
  list.addSubnet("169.254.0.0", 16, "ipv4"); // link-local + cloud metadata
  list.addSubnet("172.16.0.0", 12, "ipv4"); // RFC1918
  list.addSubnet("192.0.0.0", 24, "ipv4"); // IETF protocol assignments
  list.addSubnet("192.168.0.0", 16, "ipv4"); // RFC1918
  list.addSubnet("198.18.0.0", 15, "ipv4"); // benchmarking (RFC2544)
  list.addAddress("255.255.255.255", "ipv4"); // broadcast
  // IPv6
  list.addAddress("::", "ipv6"); // unspecified
  list.addAddress("::1", "ipv6"); // loopback
  list.addSubnet("fc00::", 7, "ipv6"); // unique local (RFC4193)
  list.addSubnet("fe80::", 10, "ipv6"); // link-local
  return list;
}

const PRIVATE_RANGES = buildPrivateRanges();
const MAPPED_V4_PREFIX = "::ffff:";

type ResolvedAddress = { address: string; family: 4 | 6 };

// An IPv4-mapped IPv6 address (::ffff:127.0.0.1) tunnels a v4 target through a
// v6 literal; check the embedded v4 against the v4 ranges so it can't bypass.
function isBlockedAddress(address: string, family: 4 | 6): boolean {
  if (family === 6 && address.toLowerCase().startsWith(MAPPED_V4_PREFIX)) {
    const embedded = address.slice(MAPPED_V4_PREFIX.length);
    if (isIP(embedded) === 4) {
      return PRIVATE_RANGES.check(embedded, "ipv4");
    }
  }
  return PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class BlockedUrlError extends Error {
  constructor(reason: string) {
    super(`Refused to fetch a non-public URL: ${reason}`);
    this.name = "BlockedUrlError";
  }
}

// Resolves `rawUrl`'s host and throws unless EVERY resolved address is publicly
// routable. DNS can map one host to several addresses, so we reject if any of
// them is private. Returns the normalized URL plus the validated addresses so a
// caller can connect to exactly what was checked.
async function validateUrl(
  rawUrl: string,
): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError(`unsupported protocol ${url.protocol}`);
  }

  const host = url.hostname;
  const literalFamily = isIP(host);
  const addresses =
    literalFamily !== 0
      ? [{ address: host, family: literalFamily as 4 | 6 }]
      : await resolveHost(host);

  if (addresses.length === 0) {
    throw new BlockedUrlError(`host did not resolve: ${host}`);
  }
  for (const { address, family } of addresses) {
    if (isBlockedAddress(address, family)) {
      throw new BlockedUrlError(`${host} resolves to internal address ${address}`);
    }
  }
  return { url, addresses };
}

// Validation-only entry point: throws on a non-public target, otherwise returns
// the normalized URL string. Used where the connection isn't ours to pin (the
// headless render, where Chromium resolves DNS itself) or for a fail-fast check.
export async function assertPublicUrl(rawUrl: string): Promise<string> {
  const { url } = await validateUrl(rawUrl);
  return url.toString();
}

// The validated URL plus an undici dispatcher whose connector resolves the host
// only to addresses we already verified are public. This closes the DNS-rebinding
// window: `assertPublicUrl` checks the name, but a plain `fetch` would re-resolve
// it at connect time and could land on a private address the attacker swapped in.
// The hostname is preserved for the TLS SNI / Host header, only the connect IP is
// pinned. The caller MUST close the dispatcher when done.
export type PinnedTarget = { url: string; dispatcher: Agent };

export async function resolvePinnedUrl(rawUrl: string): Promise<PinnedTarget> {
  const { url, addresses } = await validateUrl(rawUrl);
  return { url: url.toString(), dispatcher: pinnedDispatcher(addresses) };
}

function pinnedDispatcher(addresses: ResolvedAddress[]): Agent {
  // Hand back the addresses we already validated instead of consulting DNS
  // again. net.connect calls lookup in two shapes: the `all` form (used by
  // autoSelectFamily, the Node 20+ default) expects the full list, the plain
  // form a single address — answer both so the connection can't rebind.
  const lookupPinned: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, addresses.map(({ address, family }) => ({ address, family })));
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  };
  return new Agent({ connect: { lookup: lookupPinned } });
}

async function resolveHost(host: string): Promise<ResolvedAddress[]> {
  try {
    const records = await lookup(host, { all: true });
    return records.map((record) => ({
      address: record.address,
      family: record.family === 6 ? 6 : 4,
    }));
  } catch {
    throw new BlockedUrlError(`host did not resolve: ${host}`);
  }
}
