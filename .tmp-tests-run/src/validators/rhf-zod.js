"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodResolverCompat = zodResolverCompat;
function toPath(path) {
    return path.map(String).join(".");
}
function setNestedError(target, path, error) {
    const segments = path.split(".");
    let cursor = target;
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const isLast = index === segments.length - 1;
        if (isLast) {
            cursor[segment] = error;
            return;
        }
        const existing = cursor[segment];
        if (!existing || typeof existing !== "object") {
            cursor[segment] = {};
        }
        cursor = cursor[segment];
    }
}
function hasNestedError(target, path) {
    const segments = path.split(".");
    let cursor = target;
    for (let index = 0; index < segments.length; index += 1) {
        if (!cursor || typeof cursor !== "object") {
            return false;
        }
        const segment = segments[index];
        const value = cursor[segment];
        const isLast = index === segments.length - 1;
        if (isLast) {
            return Boolean(value);
        }
        cursor = value;
    }
    return false;
}
function zodResolverCompat(schema) {
    return (async (values) => {
        const parsed = await schema.safeParseAsync(values);
        if (parsed.success) {
            return {
                values: parsed.data,
                errors: {},
            };
        }
        const errors = {};
        for (const issue of parsed.error.issues) {
            const path = toPath(issue.path);
            if (!path || hasNestedError(errors, path)) {
                continue;
            }
            setNestedError(errors, path, {
                type: issue.code,
                message: issue.message,
            });
        }
        return {
            values: {},
            errors,
        };
    });
}
