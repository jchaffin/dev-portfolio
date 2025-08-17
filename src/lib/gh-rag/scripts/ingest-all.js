#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const pinecone_1 = require("@pinecone-database/pinecone");
const p_limit_1 = __importDefault(require("p-limit"));
const ingest_1 = require("../ingest");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), ".env.local"), override: true });
function usage() {
    const u = `
gh-rag ingest-all - Ingest all your GitHub repos

Usage:
  gh-rag-ingest-all [options]

Options:
  --index <name>           Pinecone index (default env PINECONE_INDEX or repo-chunks)
  --affiliation <list>     Repo affiliation list (default: owner). E.g. owner,organization_member
  --visibility <type>      Filter by visibility: all|public|private (default: all)
  --include-forks          Include forked repos (default: false)
  --include-archived       Include archived repos (default: false)
  --concurrency <n>        Concurrent ingests (default: 2)
  --dry-run                List targets without ingesting
  --debug                  Verbose logging
  -h, --help               Show help

Environment:
  OPENAI_API_KEY, PINECONE_API_KEY, [PINECONE_INDEX], GITHUB_TOKEN
`;
    console.log(u.trimStart());
}
function parseArgs(argv) {
    const opts = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "-h" || a === "--help") {
            opts.help = true;
            continue;
        }
        if (a === "--debug") {
            opts.debug = true;
            continue;
        }
        if (a === "--dry-run") {
            opts.dryRun = true;
            continue;
        }
        if (a === "--include-forks") {
            opts.includeForks = true;
            continue;
        }
        if (a === "--include-archived") {
            opts.includeArchived = true;
            continue;
        }
        if (a === "--index") {
            opts.index = argv[++i];
            continue;
        }
        if (a === "--affiliation") {
            opts.affiliation = argv[++i];
            continue;
        }
        if (a === "--visibility") {
            opts.visibility = argv[++i];
            continue;
        }
        if (a === "--concurrency") {
            opts.concurrency = Number(argv[++i] ?? 2);
            continue;
        }
    }
    return opts;
}
async function listUserRepos(params) {
    const { token, affiliation = "owner", visibility = "all", debug } = params;
    const perPage = 100;
    let page = 1;
    const all = [];
    for (;;) {
        const url = new URL("https://api.github.com/user/repos");
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));
        url.searchParams.set("affiliation", affiliation);
        url.searchParams.set("visibility", visibility);
        const res = await fetch(url, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github+json",
            },
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`GitHub API ${res.status}: ${body}`);
        }
        const batch = (await res.json());
        if (debug)
            console.error(`Fetched page ${page} (${batch.length})`);
        all.push(...batch);
        if (batch.length < perPage)
            break;
        page++;
        // small delay to be nice to API
        await new Promise(r => setTimeout(r, 100));
    }
    return all;
}
function mask(v) {
    return v ? v.slice(0, 6) + "…" + v.slice(-4) : "";
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help)
        return usage();
    if (args.debug)
        process.env.DEBUG = "1";
    const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, GITHUB_TOKEN, } = process.env;
    const indexName = args.index || PINECONE_INDEX || "repo-chunks";
    if (!OPENAI_API_KEY || !PINECONE_API_KEY || !indexName || !GITHUB_TOKEN) {
        console.error("Missing env. Need OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX (or --index), and GITHUB_TOKEN");
        process.exit(1);
    }
    if (process.env.DEBUG) {
        console.error("OPENAI_API_KEY:", mask(OPENAI_API_KEY));
        console.error("PINECONE_API_KEY:", mask(PINECONE_API_KEY));
        console.error("PINECONE_INDEX:", indexName);
    }
    console.log("Listing GitHub repositories…");
    const repos = await listUserRepos({
        token: GITHUB_TOKEN,
        affiliation: args.affiliation || "owner",
        visibility: args.visibility || "all",
        debug: args.debug,
    });
    const filtered = repos.filter(r => (args.includeForks || !r.fork) &&
        (args.includeArchived || !r.archived));
    if (repos.length && !filtered.length) {
        console.warn("No repos after filters. You may want --include-forks or --include-archived");
    }
    console.log(`Found ${repos.length} repos, ${filtered.length} after filters`);
    if (args.dryRun) {
        for (const r of filtered)
            console.log("-", r.full_name, r.private ? "(private)" : "(public)");
        return;
    }
    const pc = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(indexName);
    const limit = (0, p_limit_1.default)(Math.max(1, Math.min(args.concurrency ?? 2, 5)));
    let ok = 0, fail = 0;
    const tasks = filtered.map(repo => limit(async () => {
        const gitUrl = `https://github.com/${repo.full_name}.git`;
        console.log(`Ingesting ${repo.full_name}…`);
        try {
            const res = await (0, ingest_1.ingestRepo)(gitUrl, { openaiApiKey: OPENAI_API_KEY, pine: { index } });
            if (process.env.DEBUG)
                console.log("  →", res);
            ok++;
        }
        catch (e) {
            fail++;
            console.error(`Failed ${repo.full_name}:`, e.message || e);
        }
    }));
    await Promise.allSettled(tasks);
    console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
