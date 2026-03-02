import { NextRequest, NextResponse } from "next/server";
import { assertTestMode, signMockIdToken } from "@/app/api/test/telegram-oidc/_mock";

function parseCode(code: string) {
  const [, nonce, sub] = code.split(":");
  return {
    nonce: nonce || "test-nonce",
    sub: sub || "test-subject",
  };
}

export async function POST(request: NextRequest) {
  try {
    assertTestMode();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await request.formData();
  const code = String(body.get("code") ?? "");
  const clientId = String(body.get("client_id") ?? "");
  const grantType = String(body.get("grant_type") ?? "");

  if (!code || !clientId || grantType !== "authorization_code") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = parseCode(code);
  const idToken = await signMockIdToken({
    aud: clientId,
    nonce: parsed.nonce,
    sub: parsed.sub,
  });

  return NextResponse.json({
    token_type: "Bearer",
    access_token: "mock-access-token",
    expires_in: 3600,
    id_token: idToken,
  });
}
