import { headers } from "next/headers";

export async function getBaseUrl(): Promise<string> {
  const explicit =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.BASE_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host && host.startsWith("localhost") ? "http" : "https");
  if (host) {
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
