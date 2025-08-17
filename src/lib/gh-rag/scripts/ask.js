#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const pinecone_1 = require("@pinecone-database/pinecone");
const _lib_1 = require("../index");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(process.cwd(), ".env.local"), override: true });
function usage() {
    const u = `
gh-rag ask - Ask questions about a repo

Usage:
  gh-rag-ask --repo <name> --question <text>
  gh-rag-ask -r <name> -q <text>
  gh-rag-ask -r <name> "What does X do?"

 Ingest:
   gh-rag-ask --repo-url <git_url> [--repo <name>] [--question <text>]
   - If --question is provided, ingests then answers in one run.

Options:
  -r, --repo <name>        Repo identifier used during ingest (e.g., joblaunch)
  -q, --question <text>    Question to ask (or pass as positional)
      --index <name>       Pinecone index name (default: env PINECONE_INDEX or repo-chunks)
  -u, --repo-url <git>     GitHub repo URL or local path to ingest before asking
      --json               Output JSON with answer + citations
      --debug              Enable verbose debug logging
  -h, --help               Show help

Environment:
  OPENAI_API_KEY, PINECONE_API_KEY, [PINECONE_INDEX], [GITHUB_TOKEN]
  You may also set REPO, QUESTION, REPO_URL (or TEST_REPO) as defaults.
`;
    console.log(u.trimStart());
}
function parseArgs(argv) {
    const opts = {};
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "-h" || a === "--help") {
            opts.help = true;
            continue;
        }
        if (a === "--json") {
            opts.json = true;
            continue;
        }
        if (a === "--debug") {
            opts.debug = true;
            continue;
        }
        if (a === "-r" || a === "--repo") {
            opts.repo = argv[++i];
            continue;
        }
        if (a === "-q" || a === "--question") {
            opts.question = argv[++i];
            continue;
        }
        if (a === "--index") {
            opts.index = argv[++i];
            continue;
        }
        if (a === "-u" || a === "--repo-url") {
            opts.repoUrl = argv[++i];
            continue;
        }
        if (!a.startsWith("-")) {
            rest.push(a);
            continue;
        }
        // ignore unknown flags for now
    }
    if (!opts.question && rest.length) {
        opts.question = rest.join(" ");
    }
    return opts;
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
    const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, GITHUB_TOKEN, REPO, QUESTION, REPO_URL, TEST_REPO } = process.env;
    const indexName = args.index || PINECONE_INDEX || "repo-chunks";
    const repo = args.repo || REPO;
    const question = args.question || QUESTION;
    const repoUrl = args.repoUrl || REPO_URL || TEST_REPO;
    if (!OPENAI_API_KEY || !PINECONE_API_KEY || !indexName) {
        console.error("Missing env. Need OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX (or --index)");
        process.exit(1);
    }
    if (!repoUrl) {
        if (!repo || !question) {
            console.error("Missing required input: --repo and --question (or positional question). Use -h for help.");
            process.exit(1);
        }
    }
    if (process.env.DEBUG) {
        console.error("OPENAI_API_KEY:", mask(OPENAI_API_KEY));
        console.error("PINECONE_API_KEY:", mask(PINECONE_API_KEY));
        console.error("PINECONE_INDEX:", indexName);
        console.error("REPO:", repo);
    }
    const pc = new pinecone_1.Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pc.index(indexName);
    const rag = (0, _lib_1.createGhRag)({
        openaiApiKey: OPENAI_API_KEY,
        githubToken: GITHUB_TOKEN,
        pine: { index },
    });
    let finalRepo = repo;
    if (repoUrl) {
        console.time("ingest");
        const ing = await rag.ingest({ gitUrl: repoUrl });
        console.timeEnd("ingest");
        finalRepo = repo || ing.repo;
        if (!finalRepo) {
            console.error("Ingest completed but repo name could not be resolved. Pass --repo explicitly.");
            process.exit(1);
        }
    }
    let res;
    if (question) {
        console.time("answer");
        res = await rag.answer({ repo: finalRepo, question });
        console.timeEnd("answer");
    }
    else {
        // If no question was asked and ingest happened, just exit gracefully
        if (repoUrl) {
            console.log(`Ingested repo into index '${indexName}' as '${finalRepo}'.`);
            return;
        }
        console.error("No question provided. Use --question or pass it positionally.");
        process.exit(1);
    }
    if (args.json) {
        console.log(JSON.stringify(res, null, 2));
    }
    else {
        console.log("\n=== ANSWER ===\n");
        console.log(res.text);
        if (res.used?.length) {
            console.log("\nCitations:");
            for (const u of res.used) {
                console.log(`- ${u.path}#L${u.start}-L${u.end}`);
            }
        }
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
