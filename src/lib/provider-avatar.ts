export type AvatarSourceValue = "PROVIDER" | "CUSTOM";

function normalizeProviderPicture(picture: string | undefined) {
  const value = picture?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getInitialProviderImageUrl(picture: string | undefined) {
  return normalizeProviderPicture(picture);
}

export function getProviderAvatarUpdate(input: {
  providerPicture: string | undefined;
  currentImageUrl: string | null;
  avatarSource: AvatarSourceValue;
}) {
  const normalizedPicture = normalizeProviderPicture(input.providerPicture);
  if (!normalizedPicture || input.avatarSource !== "PROVIDER" || input.currentImageUrl === normalizedPicture) {
    return {};
  }

  return {
    imageUrl: normalizedPicture,
  };
}
