"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askFast = askFast;
const search_1 = require("./search");
async function askFast(params) {
    const { workdir, openaiApiKey, pine, repo, query, limit = 8, includeText = true } = params;
    const ctx = await (0, search_1.hybridSearch)({ workdir, openaiApiKey, pine, repo, query });
    const top = (ctx || []).slice(0, limit);
    return top.map((c) => ({
        path: c.path,
        start: c.start,
        end: c.end,
        ...(includeText ? { text: c.text } : {}),
    }));
}
