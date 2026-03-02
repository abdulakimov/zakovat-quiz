"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const url_1 = require("../src/lib/url");
function makeHeaders(values) {
    return {
        get(name) {
            var _a;
            const key = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase());
            return key ? (_a = values[key]) !== null && _a !== void 0 ? _a : null : null;
        },
    };
}
function run() {
    process.env.PUBLIC_APP_URL = "https://example.com";
    strict_1.default.equal((0, url_1.getCanonicalBaseUrl)(makeHeaders({
        "x-forwarded-proto": "http",
        "x-forwarded-host": "internal.local:3000",
    })), "https://example.com");
    delete process.env.PUBLIC_APP_URL;
    strict_1.default.equal((0, url_1.getCanonicalBaseUrl)(makeHeaders({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "9935-89-236-218-41.ngrok-free.app",
    })), "https://9935-89-236-218-41.ngrok-free.app");
    strict_1.default.equal((0, url_1.getCanonicalBaseUrl)(makeHeaders({
        host: "localhost:3000",
    })), "http://localhost:3000");
    strict_1.default.equal((0, url_1.getCanonicalBaseUrl)(makeHeaders({
        "x-forwarded-proto": "https,http",
        "x-forwarded-host": "proxy.example.com,internal.local",
        host: "localhost:3000",
    })), "https://proxy.example.com");
    strict_1.default.equal((0, url_1.getCanonicalBaseUrl)(makeHeaders({
        "x-forwarded-proto": "https",
        host: "localhost:3000",
    })), "http://localhost:3000");
    console.log("All URL origin tests passed.");
}
run();
