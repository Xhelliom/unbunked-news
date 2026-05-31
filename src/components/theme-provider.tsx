"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Resolved;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "theme";
const MEDIA = "(prefers-color-scheme: dark)";

function getSystemTheme(): Resolved {
  return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

function resolve(theme: Theme): Resolved {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: Resolved, disableTransition: boolean) {
  const el = document.documentElement;
  let restore: (() => void) | undefined;
  if (disableTransition) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode("*,*::before,*::after{transition:none!important}"),
    );
    document.head.appendChild(style);
    restore = () => {
      // Force a reflow so the disabled transitions take effect before removal.
      window.getComputedStyle(document.body);
      setTimeout(() => document.head.removeChild(style), 1);
    };
  }
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
  restore?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<Resolved>("light");

  // Hydrate the persisted choice after mount. The inline bootstrap script in
  // the root layout has already applied the correct class pre-paint, so this
  // only syncs React state — it never causes a visible flash.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only, so the persisted choice can only be read post-mount
    if (stored) setThemeState(stored);
  }, []);

  const apply = useCallback(
    (next: Theme) => {
      const r = resolve(next);
      setResolvedTheme(r);
      applyTheme(r, disableTransitionOnChange);
    },
    [disableTransitionOnChange],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the resolved theme to the DOM; "system" needs matchMedia, unavailable during render
    apply(theme);
  }, [theme, apply]);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia(MEDIA);
    const onChange = () => apply("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme, apply]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors (private mode, disabled storage).
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
