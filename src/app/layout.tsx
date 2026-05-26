import type { ReactNode } from "react";

import "./globals.css";

// Passthrough root layout. The <html>/<body> shell lives in [locale]/layout
// so that the lang attribute and i18n provider are locale-aware.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
