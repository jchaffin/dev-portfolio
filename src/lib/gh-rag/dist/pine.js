"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinecone = pinecone;
exports.ensureIndex = ensureIndex;
exports.getNamespace = getNamespace;
exports.upsert = upsert;
exports.query = query;
// src/pine.ts
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const fs_1 = require("fs");
if ((0, fs_1.existsSync)((0, path_1.resolve)(process.cwd(), ".env.local"))) {
    (0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), ".env.local"), override: true });
}
else {
    (0, dotenv_1.config)(); // fallback to .env
}
const DEFAULTS = {
    index: process.env.PINECONE_INDEX ?? "repo-chunks",
    cloud: process.env.PINECONE_CLOUD ?? "aws",
    region: process.env.PINECONE_REGION ?? "us-east-1",
    metric: process.env.PINECONE_METRIC ?? "cosine",
    // Set one of: EMBEDDING_DIM or EMBEDDING_MODEL
    dim: (process.env.EMBEDDING_DIM && Number(process.env.EMBEDDING_DIM)) ||
        modelToDim(process.env.OPENAI_EMBED_MODEL ?? process.env.EMBEDDING_MODEL) ||
        1536, // sane default if you use text-embedding-3-small
};
function modelToDim(model) {
    if (!model)
        return undefined;
    const m = model.toLowerCase();
    if (m.includes("3-large"))
        return 3072;
    if (m.includes("3-small"))
        return 1536;
    if (m.includes("ada-002"))
        return 1536;
    return undefined;
}
let _pc = null;
/** Singleton Pinecone client */
function pinecone() {
    if (_pc)
        return _pc;
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey)
        throw new Error("PINECONE_API_KEY missing");
    _pc = new pinecone_1.Pinecone({ apiKey });
    return _pc;
}
/** Ensure serverless index exists with the given dimension */
async function ensureIndex(params) {
    const name = params?.name ?? DEFAULTS.index;
    const dimension = params?.dimension ?? DEFAULTS.dim;
    const metric = params?.metric ?? DEFAULTS.metric;
    const cloud = params?.cloud ?? DEFAULTS.cloud;
    const region = params?.region ?? DEFAULTS.region;
    const pc = pinecone();
    // Describe first. Create if missing or mismatched dim.
    let needCreate = false;
    try {
        const desc = await pc.describeIndex(name);
        const currentDim = desc.dimension;
        if (currentDim !== dimension) {
            throw new Error(`Index "${name}" dimension ${currentDim} != required ${dimension}. Create a new index or change EMBEDDING_DIM.`);
        }
    }
    catch (e) {
        if (String(e?.message || "").toLowerCase().includes("not found")) {
            needCreate = true;
        }
        else if (String(e).includes("Index not found")) {
            needCreate = true;
        }
        else {
            throw e;
        }
    }
    if (needCreate) {
        await pc.createIndex({
            name,
            dimension,
            metric,
            spec: { serverless: { cloud, region } },
        });
        // optional: small wait until ready
        await waitReady(name);
    }
    return name;
}
async function waitReady(name) {
    const pc = pinecone();
    for (let i = 0; i < 30; i++) {
        try {
            await pc.describeIndex(name);
            return;
        }
        catch {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    // continue anyway; serverless becomes ready quickly
}
/** Get a namespaced index handle (auto-ensure) */
async function getNamespace(ns) {
    const name = await ensureIndex();
    const pc = pinecone();
    return pc.index(name).namespace(ns ?? "default");
}
/** Upsert vectors in batches */
async function upsert(vectors, opts) {
    const ns = await getNamespace(opts?.namespace);
    const B = opts?.batchSize ?? 100;
    for (let i = 0; i < vectors.length; i += B) {
        const batch = vectors.slice(i, i + B);
        await ns.upsert(batch);
    }
}
/** Query topK with optional metadata filter */
async function query(vector, opts) {
    const ns = await getNamespace(opts?.namespace);
    const res = await ns.query({
        vector,
        topK: opts?.topK ?? 10,
        filter: opts?.filter,
        includeValues: opts?.includeValues ?? false,
        includeMetadata: opts?.includeMetadata ?? true,
    });
    return res.matches ?? [];
}
