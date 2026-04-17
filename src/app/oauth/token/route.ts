import { NextResponse } from "next/server";
import {
  getByDeviceCode,
  markPolled,
} from "@/lib/device-code-store";
import { DEVICE_TOKEN_EXPIRES_IN_SEC } from "@/lib/device-token";

const DEVICE_CODE_GRANT =
  "urn:ietf:params:oauth:grant-type:device_code";

const MIN_INTERVAL_MS = 5_000;

async function readForm(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await request.text());
  }
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      if (v != null) params.set(k, String(v));
    }
    return params;
  }
  return new URLSearchParams(await request.text());
}

export async function POST(request: Request) {
  let form: URLSearchParams;
  try {
    form = await readForm(request);
  } catch {
    return error("invalid_request", "Failed to parse request body");
  }

  const grantType = form.get("grant_type");
  if (grantType !== DEVICE_CODE_GRANT) {
    return error(
      "unsupported_grant_type",
      `Only ${DEVICE_CODE_GRANT} is supported`,
    );
  }

  const clientId = form.get("client_id");
  const deviceCode = form.get("device_code");
  if (!clientId || !deviceCode) {
    return error(
      "invalid_request",
      "client_id and device_code are required",
    );
  }

  const record = getByDeviceCode(deviceCode);
  if (!record || record.clientId !== clientId) {
    return error("invalid_grant", "Unknown device_code");
  }

  const now = Date.now();

  if (now > record.expiresAt && record.status !== "approved") {
    record.status = "expired";
  }

  if (record.status === "expired") {
    return error("expired_token", "Device code has expired");
  }
  if (record.status === "denied") {
    return error("access_denied", "The user denied the authorization request");
  }

  if (record.status === "pending") {
    if (
      record.lastPolledAt &&
      now - record.lastPolledAt < MIN_INTERVAL_MS
    ) {
      markPolled(deviceCode);
      return error("slow_down", "Polling too fast");
    }
    markPolled(deviceCode);
    return error("authorization_pending", "User has not completed authorization");
  }

  if (record.status === "approved") {
    if (!record.accessToken) {
      return error("invalid_grant", "Access token was not issued");
    }
    const expiresIn = record.accessTokenExpiresAt
      ? Math.max(
          0,
          Math.floor((record.accessTokenExpiresAt - now) / 1000),
        )
      : DEVICE_TOKEN_EXPIRES_IN_SEC;

    return NextResponse.json(
      {
        access_token: record.accessToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        scope: record.scopes.join(" "),
      },
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  }

  return error("invalid_grant", "Unknown device code state");
}

function error(code: string, description: string) {
  return NextResponse.json(
    { error: code, error_description: description },
    {
      status: 400,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
