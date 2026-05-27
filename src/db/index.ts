import "server-only";

// Server-guarded entry point for application code. Scripts and the BetterAuth
// CLI import the node-safe client directly from "@/db/client".
export { db } from "./client";
