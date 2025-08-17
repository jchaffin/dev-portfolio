"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGhRag = createGhRag;
// src/index.ts
const ingest_1 = require("./ingest");
const search_1 = require("./search");
const answer_1 = require("./answer");
const ask_1 = require("./ask");
function createGhRag(opts) {
    const cfg = {
        openaiApiKey: opts.openaiApiKey,
        githubToken: opts.githubToken,
        workdir: ".",
        pine: opts.pine
    };
    return {
        ingest: (p) => (0, ingest_1.ingestRepo)(p.gitUrl, {
            openaiApiKey: cfg.openaiApiKey,
            pine: cfg.pine
        }),
        search: (p) => (0, search_1.hybridSearch)({ ...cfg, repo: p.repo, query: p.query }),
        ask: (p) => (0, ask_1.askFast)({ ...cfg, repo: p.repo, query: p.query, limit: p.limit, includeText: p.includeText }),
        answer: (p) => (0, answer_1.answerAboutProject)({ ...cfg, repo: p.repo, question: p.question })
    };
}
