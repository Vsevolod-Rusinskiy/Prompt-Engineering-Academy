export interface RagChunk {
  id: string;
  sourceType: 'article';
  sourceId: string;
  title: string;
  sectionTitle: string;
  text: string;
  url: string;
}

export interface IndexedRagChunk extends RagChunk {
  embedding: number[];
}

export interface RagIndex {
  version: 1;
  generatedAt: string;
  embeddingModel: string;
  dimensions: number;
  chunks: IndexedRagChunk[];
}

export interface RagSearchResult extends RagChunk {
  score: number;
}

export interface RagSearchResponse {
  query: string;
  topK: number;
  results: RagSearchResult[];
}

export interface RagAskResponse {
  query: string;
  answer: string;
  sources: RagSearchResult[];
}
