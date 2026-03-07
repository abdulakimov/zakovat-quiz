import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";

type MockTokenClaims = {
  sub: string;
  nonce: string;
  aud: string;
};

const MOCK_ISSUER = "https://oauth.telegram.org";
const KEY_ID = "telegram-oidc-test-key";

const keyPairPromise = generateKeyPair("RS256");

export function assertTestMode() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Not found");
  }
}

export function getMockIssuer() {
  return MOCK_ISSUER;
}

export async function getMockJwks() {
  const { publicKey } = await keyPairPromise;
  const publicJwk = (await exportJWK(publicKey)) as JWK;
  return {
    keys: [{ ...publicJwk, kid: KEY_ID, alg: "RS256", use: "sig" }],
  };
}

export async function signMockIdToken(input: MockTokenClaims) {
  const { privateKey } = await keyPairPromise;
  return new SignJWT({
    sub: input.sub,
    nonce: input.nonce,
    name: "Telegram Test User",
    preferred_username: "telegram_test_user",
    picture: "https://example.com/avatar.png",
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID, typ: "JWT" })
    .setIssuer(MOCK_ISSUER)
    .setAudience(input.aud)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);
}
