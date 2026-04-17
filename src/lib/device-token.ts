import { SignJWT, jwtVerify } from "jose";

export const DEVICE_TOKEN_AUDIENCE = "a2x-sample-nextjs";
export const DEVICE_TOKEN_ISSUER = "a2x-sample-nextjs";
export const DEVICE_TOKEN_EXPIRES_IN_SEC = 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export interface DeviceTokenPayload {
  sub: string;
  email?: string;
  scope: string;
  client_id: string;
}

export async function signDeviceToken(
  payload: DeviceTokenPayload,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: payload.email,
    scope: payload.scope,
    client_id: payload.client_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(DEVICE_TOKEN_ISSUER)
    .setAudience(DEVICE_TOKEN_AUDIENCE)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + DEVICE_TOKEN_EXPIRES_IN_SEC)
    .sign(getSecret());
}

export interface VerifiedDeviceToken {
  sub: string;
  email?: string;
  scopes: string[];
  clientId: string;
}

export async function verifyDeviceToken(
  token: string,
): Promise<VerifiedDeviceToken> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: DEVICE_TOKEN_ISSUER,
    audience: DEVICE_TOKEN_AUDIENCE,
  });
  if (!payload.sub) {
    throw new Error("Token has no subject");
  }
  const scopeStr =
    typeof payload.scope === "string" ? payload.scope : "";
  return {
    sub: payload.sub,
    email:
      typeof payload.email === "string" ? payload.email : undefined,
    scopes: scopeStr.split(/\s+/).filter(Boolean),
    clientId:
      typeof payload.client_id === "string" ? payload.client_id : "",
  };
}
