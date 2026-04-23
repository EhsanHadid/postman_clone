"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueBy = exports.createSortOrder = exports.safeJsonParse = exports.toEnabledRecord = exports.interpolateObject = exports.interpolateTemplate = void 0;
const interpolateTemplate = (template, values) => template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey) => {
    const key = rawKey.trim();
    return values[key] ?? "";
});
exports.interpolateTemplate = interpolateTemplate;
const interpolateObject = (value, variables) => {
    if (typeof value === "string") {
        return (0, exports.interpolateTemplate)(value, variables);
    }
    if (Array.isArray(value)) {
        return value.map((item) => (0, exports.interpolateObject)(item, variables));
    }
    if (value && typeof value === "object") {
        const next = {};
        for (const [key, item] of Object.entries(value)) {
            next[key] = (0, exports.interpolateObject)(item, variables);
        }
        return next;
    }
    return value;
};
exports.interpolateObject = interpolateObject;
const toEnabledRecord = (pairs) => pairs.reduce((accumulator, pair) => {
    if (pair.enabled !== false && pair.key.trim()) {
        accumulator[pair.key.trim()] = pair.value;
    }
    return accumulator;
}, {});
exports.toEnabledRecord = toEnabledRecord;
const safeJsonParse = (value, fallback) => {
    try {
        return JSON.parse(value);
    }
    catch (_error) {
        return fallback;
    }
};
exports.safeJsonParse = safeJsonParse;
const createSortOrder = (index) => index * 100;
exports.createSortOrder = createSortOrder;
const uniqueBy = (items, keySelector) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = keySelector(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
exports.uniqueBy = uniqueBy;
//# sourceMappingURL=index.js.map