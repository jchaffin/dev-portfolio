type Cfg = {
    workdir: string;
    openaiApiKey: string;
    pine: {
        index: any;
    };
};
export type AnswerResult = {
    text: string;
    used: {
        path: string;
        start: number;
        end: number;
    }[];
};
export declare function answerAboutProject({ workdir, openaiApiKey, pine, repo, question }: Cfg & {
    repo: string;
    question: string;
}): Promise<AnswerResult>;
export {};
