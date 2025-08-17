type Cfg = {
    workdir: string;
    openaiApiKey: string;
    pine: {
        index: any;
    };
};
export type AskSnippet = {
    path: string;
    start: number;
    end: number;
    text?: string;
};
export declare function askFast(params: Cfg & {
    repo: string;
    query: string;
    limit?: number;
    includeText?: boolean;
}): Promise<AskSnippet[]>;
export {};
