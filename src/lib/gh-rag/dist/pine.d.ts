import { Pinecone } from "@pinecone-database/pinecone";
export type PCVector = {
    id: string;
    values: number[];
    metadata?: Record<string, any>;
};
/** Singleton Pinecone client */
export declare function pinecone(): Pinecone;
/** Ensure serverless index exists with the given dimension */
export declare function ensureIndex(params?: {
    name?: string;
    dimension?: number;
    metric?: "cosine" | "dotproduct" | "euclidean";
    cloud?: "aws" | "gcp";
    region?: string;
}): Promise<string>;
/** Get a namespaced index handle (auto-ensure) */
export declare function getNamespace(ns?: string): Promise<import("@pinecone-database/pinecone").Index<import("@pinecone-database/pinecone").RecordMetadata>>;
/** Upsert vectors in batches */
export declare function upsert(vectors: PCVector[], opts?: {
    namespace?: string;
    batchSize?: number;
}): Promise<void>;
/** Query topK with optional metadata filter */
export declare function query(vector: number[], opts?: {
    topK?: number;
    namespace?: string;
    filter?: Record<string, any>;
    includeValues?: boolean;
    includeMetadata?: boolean;
}): Promise<any[]>;
