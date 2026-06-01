import { extract } from "@extractus/article-extractor";

async function main() {
  const url = process.argv[2];
  if (!url) { console.error("Usage: tsx fetch-article.ts <url>"); process.exit(1); }
  const r = await extract(url);
  console.log(JSON.stringify(r, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
