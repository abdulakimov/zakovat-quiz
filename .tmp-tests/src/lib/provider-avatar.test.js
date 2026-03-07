"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProviderAvatarTests = runProviderAvatarTests;
const strict_1 = __importDefault(require("node:assert/strict"));
const provider_avatar_1 = require("./provider-avatar");
function runProviderAvatarTests() {
    const googlePicture = (0, provider_avatar_1.getInitialProviderImageUrl)("https://lh3.googleusercontent.com/a/avatar");
    strict_1.default.equal(googlePicture, "https://lh3.googleusercontent.com/a/avatar");
    const telegramPicture = (0, provider_avatar_1.getInitialProviderImageUrl)("https://cdn4.telegram-cdn.org/file/test.jpg");
    strict_1.default.equal(telegramPicture, "https://cdn4.telegram-cdn.org/file/test.jpg");
    const providerUpdate = (0, provider_avatar_1.getProviderAvatarUpdate)({
        providerPicture: "https://example.com/avatar.png",
        currentImageUrl: null,
        avatarSource: "PROVIDER",
    });
    strict_1.default.deepEqual(providerUpdate, { imageUrl: "https://example.com/avatar.png" });
    const customUpdate = (0, provider_avatar_1.getProviderAvatarUpdate)({
        providerPicture: "https://example.com/new-avatar.png",
        currentImageUrl: "https://example.com/current.png",
        avatarSource: "CUSTOM",
    });
    strict_1.default.deepEqual(customUpdate, {});
    const missingPictureUpdate = (0, provider_avatar_1.getProviderAvatarUpdate)({
        providerPicture: undefined,
        currentImageUrl: "https://example.com/current.png",
        avatarSource: "PROVIDER",
    });
    strict_1.default.deepEqual(missingPictureUpdate, {});
}
