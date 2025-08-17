"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const pinecone_1 = require("@pinecone-database/pinecone");
const ingest_1 = require("./ingest");
const answer_1 = require("./answer");
const ask_1 = require("./ask");
const app = (0, fastify_1.default)({ logger: true });
// Env checks
const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, } = process.env;
if (!OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY required");
if (!PINECONE_API_KEY)
    throw new Error("PINECONE_API_KEY required");
if (!PINECONE_INDEX)
    throw new Error("PINECONE_INDEX required");
// Pinecone
const pc = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index(PINECONE_INDEX);
// Optional: verify index dim
// const info = await pc.describeIndex(PINECONE_INDEX);
// app.log.info({ dim: info.dimension }, "pinecone index");
// Basic CORS for browser-based realtime clients
app.addHook("onSend", async (req, rep, payload) => {
    rep.header("Access-Control-Allow-Origin", "*");
    rep.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    rep.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    return payload;
});
app.options("/*", async (_req, rep) => rep.send());
// Routes
app.post("/ingest", async (req, rep) => {
    const { gitUrl } = req.body || {};
    if (!gitUrl)
        return rep.code(400).send({ error: "gitUrl required" });
    const res = await (0, ingest_1.ingestRepo)(gitUrl, { openaiApiKey: OPENAI_API_KEY, pine: { index } });
    return rep.send(res);
});
app.post("/ask", async (req, rep) => {
    const { repo, query, limit, includeText } = req.body || {};
    if (!repo || !query)
        return rep.code(400).send({ error: "repo and query required" });
    const snippets = await (0, ask_1.askFast)({
        repo,
        query,
        limit: typeof limit === "number" ? limit : undefined,
        includeText: includeText !== false,
        workdir: ".",
        openaiApiKey: OPENAI_API_KEY,
        pine: { index },
    });
    return rep.send({ snippets });
});
app.post("/answer", async (req, rep) => {
    const { repo, question } = req.body || {};
    if (!repo || !question)
        return rep.code(400).send({ error: "repo and question required" });
    const text = await (0, answer_1.answerAboutProject)({
        repo,
        question,
        workdir: ".",
        openaiApiKey: OPENAI_API_KEY,
        pine: { index },
    });
    return rep.send({ text });
});
// Start
app.listen({ port: 3000, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
