import { NextRequest, NextResponse } from "next/server";
import { assertTestMode, getMockIssuer } from "@/app/api/test/telegram-oidc/_mock";

export async function GET(request: NextRequest) {
  try {
    assertTestMode();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const base = new URL(request.url);
  const auth = new URL("/api/test/telegram-oidc/auth", base);
  const token = new URL("/api/test/telegram-oidc/token", base);
  const jwks = new URL("/api/test/telegram-oidc/jwks", base);

  return NextResponse.json({
    issuer: getMockIssuer(),
    authorization_endpoint: auth.toString(),
    token_endpoint: token.toString(),
    jwks_uri: jwks.toString(),
  });
}
