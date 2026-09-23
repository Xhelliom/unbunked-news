"use client";

import { LogOut, Menu, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { authClient, useSession } from "@/lib/auth-client";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES: readonly Theme[] = ["light", "dark", "system"];

// Everything the public header used to spread across five controls: the method
// link, the submit link, the account, the language picker and the theme picker.
// The header keeps only what a reader reaches for while browsing, which is
// search. The admin layout still uses the standalone switchers.
export function SiteMenu() {
  const t = useTranslations("nav");
  const tAccount = useTranslations("userMenu");
  const tTheme = useTranslations("themeToggle");
  const tLocale = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  async function onSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("menu")}>
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/methode">{t("method")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/submit">{t("submit")}</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) =>
            router.replace(pathname, { locale: next as Locale })
          }
        >
          {routing.locales.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {tLocale(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(next) => setTheme(next as Theme)}
        >
          {THEMES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {tTheme(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {/* The session resolves client-side; hide the account row until it has,
            so the menu never flashes "sign in" at someone already signed in. */}
        {!isPending && (
          <>
            <DropdownMenuSeparator />
            {user ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound className="size-4" />
                    {tAccount("profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive"
                >
                  <LogOut className="size-4" />
                  {tAccount("signOut")}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login">
                  <UserRound className="size-4" />
                  {tAccount("login")}
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
