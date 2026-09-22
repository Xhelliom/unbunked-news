import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { SearchBox } from "@/components/search-box";
import { SiteMenu } from "@/components/site-menu";

export function SiteHeader() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="Unbunked" className="shrink-0">
          <Logo className="text-[28px]" />
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchBox />
          <SiteMenu />
        </div>
      </div>
    </header>
  );
}
