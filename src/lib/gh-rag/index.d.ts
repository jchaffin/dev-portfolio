export type CreateOpts = {
    openaiApiKey: string;
    githubToken?: string;
};
export declare function createGhRag(opts: CreateOpts & {
    pine: {
        index: any;
    };
}): {
    ingest: (p: {
        gitUrl: string;
        ref?: string;
        fileGlobs?: string[];
    }) => Promise<{
        repo: string;
        namespace: string;
        files: number;
        chunks: number;
        model: string;
    }>;
    search: (p: {
        repo: string;
        query: string;
    }) => Promise<any[]>;
    ask: (p: {
        repo: string;
        query: string;
        limit?: number;
        includeText?: boolean;
    }) => Promise<import("./ask").AskSnippet[]>;
    answer: (p: {
        repo: string;
        question: string;
    }) => Promise<import("./answer").AnswerResult>;
};
