import type { Pinecone } from "@pinecone-database/pinecone";
export type PineCtx = {
    index: ReturnType<Pinecone["index"]>;
    namespace?: string;
};
type IngestOpts = {
    openaiApiKey: string;
    pine: PineCtx;
    workdir?: string;
    repoName?: string;
    githubToken?: string;
};
export declare function ingestRepo(gitUrlOrPath: string, opts: IngestOpts): Promise<{
    repo: string;
    namespace: string;
    files: number;
    chunks: number;
    model: string;
}>;
export {};
