"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

// Shared "Continue with Google" button for login and sign-up. Sign-in for an
// existing Google user is unaffected by the sign-up gate (which only runs on
// user creation); a brand-new Google account is gated like email sign-up.
export function GoogleButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    // On success the browser navigates away; only reached if the call rejected.
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium text-foreground shadow-xs transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8Z"
        />
        <path
          fill="#34A853"
          d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4Z"
        />
      </svg>
      {label}
    </button>
  );
}
