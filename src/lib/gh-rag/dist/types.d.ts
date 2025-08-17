export type Chunk = {
    repo: string;
    path: string;
    start: number;
    end: number;
    text: string;
    fileType: string;
    commit: string;
};
