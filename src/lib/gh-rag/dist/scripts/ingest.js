"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/ingest.ts
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const pinecone_1 = require("@pinecone-database/pinecone");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), ".env.local"), override: true });
const ingest_1 = require("../ingest");
function mask(v) {
    return v ? v.slice(0, 6) + "…" + v.slice(-4) : "";
}
console.log("OPENAI_API_KEY:", mask(process.env.OPENAI_API_KEY));
console.log("PINECONE_API_KEY:", mask(process.env.PINECONE_API_KEY));
async function main() {
    const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX = "repo-chunks", TEST_REPO = "https://github.com/jchaffin/JobLaunch.git" } = process.env;
    if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_INDEX) {
        console.error("Missing env. Need OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX");
        process.exit(1);
    }
    const pc = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(PINECONE_INDEX);
    console.time("ingest");
    const ingestRes = await (0, ingest_1.ingestRepo)(TEST_REPO, {
        openaiApiKey: OPENAI_API_KEY,
        pine: { index: index }
    });
    console.timeEnd("ingest");
    console.log("Ingested:", ingestRes);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
