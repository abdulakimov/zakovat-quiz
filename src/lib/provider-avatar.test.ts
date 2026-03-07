import assert from "node:assert/strict";
import { getInitialProviderImageUrl, getProviderAvatarUpdate } from "./provider-avatar";

export function runProviderAvatarTests() {
  const googlePicture = getInitialProviderImageUrl("https://lh3.googleusercontent.com/a/avatar");
  assert.equal(googlePicture, "https://lh3.googleusercontent.com/a/avatar");

  const telegramPicture = getInitialProviderImageUrl("https://cdn4.telegram-cdn.org/file/test.jpg");
  assert.equal(telegramPicture, "https://cdn4.telegram-cdn.org/file/test.jpg");

  const providerUpdate = getProviderAvatarUpdate({
    providerPicture: "https://example.com/avatar.png",
    currentImageUrl: null,
    avatarSource: "PROVIDER",
  });
  assert.deepEqual(providerUpdate, { imageUrl: "https://example.com/avatar.png" });

  const customUpdate = getProviderAvatarUpdate({
    providerPicture: "https://example.com/new-avatar.png",
    currentImageUrl: "https://example.com/current.png",
    avatarSource: "CUSTOM",
  });
  assert.deepEqual(customUpdate, {});

  const missingPictureUpdate = getProviderAvatarUpdate({
    providerPicture: undefined,
    currentImageUrl: "https://example.com/current.png",
    avatarSource: "PROVIDER",
  });
  assert.deepEqual(missingPictureUpdate, {});
}
