"use client";

import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin, so no public env var is needed.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
