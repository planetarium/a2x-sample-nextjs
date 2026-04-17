import { NextResponse } from "next/server";
import { createDeviceCode } from "@/lib/device-code-store";
import { getBaseUrl } from "@/lib/base-url";

const SUPPORTED_SCOPES = new Set(["agent:invoke"]);

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
    return error("invalid_request", "Failed to parse request body", 400);
  }

  const clientId = form.get("client_id");
  if (!clientId) {
    return error("invalid_request", "client_id is required", 400);
  }

  const scopeParam = (form.get("scope") ?? "agent:invoke").trim();
  const requestedScopes = scopeParam.split(/\s+/).filter(Boolean);
  for (const s of requestedScopes) {
    if (!SUPPORTED_SCOPES.has(s)) {
      return error("invalid_scope", `Unsupported scope: ${s}`, 400);
    }
  }

  const baseUrl = await getBaseUrl();
  const record = createDeviceCode({
    clientId,
    scopes: requestedScopes.length > 0 ? requestedScopes : ["agent:invoke"],
  });

  const verificationUri = `${baseUrl}/device`;
  const verificationUriComplete = `${verificationUri}?user_code=${encodeURIComponent(record.userCode)}`;

  return NextResponse.json(
    {
      device_code: record.deviceCode,
      user_code: record.userCode,
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      expires_in: Math.max(
        0,
        Math.floor((record.expiresAt - Date.now()) / 1000),
      ),
      interval: record.interval,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function error(code: string, description: string, status: number) {
  return NextResponse.json(
    { error: code, error_description: description },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
