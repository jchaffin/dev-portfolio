type Cfg = {
    workdir: string;
    openaiApiKey: string;
    pine: {
        index: any;
    };
};
export declare function hybridSearch({ workdir, openaiApiKey, pine, repo, query }: Cfg & {
    repo: string;
    query: string;
}): Promise<any[]>;
export {};
