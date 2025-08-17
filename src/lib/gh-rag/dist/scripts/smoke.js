"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/smoke.ts
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const pinecone_1 = require("@pinecone-database/pinecone");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), ".env.local"), override: true });
const _lib_1 = require("../index");
const ingest_1 = require("../ingest");
function mask(v) {
    return v ? v.slice(0, 6) + "…" + v.slice(-4) : "";
}
console.log("OPENAI_API_KEY:", mask(process.env.OPENAI_API_KEY));
console.log("PINECONE_API_KEY:", mask(process.env.PINECONE_API_KEY));
async function main() {
    const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX = "repo-chunks", GITHUB_TOKEN, TEST_REPO = "https://github.com/jchaffin/JobLaunch.git" } = process.env;
    if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX) {
        console.error("Missing env. Need OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX");
        process.exit(1);
    }
    // Create Pinecone instance
    const pc = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX);
    const rag = (0, _lib_1.createGhRag)({
        openaiApiKey: OPENAI_API_KEY,
        githubToken: GITHUB_TOKEN, // optional
        pine: {
            index: index, // Pass the actual index instance, not the string
        },
    });
    console.time("ingest");
    const ingestRes = await (0, ingest_1.ingestRepo)(TEST_REPO, {
        openaiApiKey: OPENAI_API_KEY,
        pine: { index: index }
    });
    console.timeEnd("ingest");
    console.log("Ingested:", ingestRes);
    console.time("answer");
    const res = await rag.answer({
        repo: ingestRes.repo,
        question: "Tell me about the API Integrations",
    });
    console.timeEnd("answer");
    console.log("\n=== ANSWER ===\n");
    console.log(res.text);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
