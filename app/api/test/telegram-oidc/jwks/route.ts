import { NextResponse } from "next/server";
import { assertTestMode, getMockJwks } from "@/app/api/test/telegram-oidc/_mock";

export async function GET() {
  try {
    assertTestMode();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(await getMockJwks());
}
