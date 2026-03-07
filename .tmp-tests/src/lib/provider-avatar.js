"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialProviderImageUrl = getInitialProviderImageUrl;
exports.getProviderAvatarUpdate = getProviderAvatarUpdate;
function normalizeProviderPicture(picture) {
    const value = picture === null || picture === void 0 ? void 0 : picture.trim();
    if (!value) {
        return null;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }
        return url.toString();
    }
    catch (_a) {
        return null;
    }
}
function getInitialProviderImageUrl(picture) {
    return normalizeProviderPicture(picture);
}
function getProviderAvatarUpdate(input) {
    const normalizedPicture = normalizeProviderPicture(input.providerPicture);
    if (!normalizedPicture || input.avatarSource !== "PROVIDER" || input.currentImageUrl === normalizedPicture) {
        return {};
    }
    return {
        imageUrl: normalizedPicture,
    };
}
