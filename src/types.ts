/**
 * Outline API Types
 * Based on https://www.getoutline.com/developers
 */

export interface OutlineConfig {
  baseUrl: string;
  apiKey: string;
}

export interface TransportConfig {
  transport: 'stdio' | 'http';
  port: number;
}

export interface OutlineUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface OutlineCollection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  permission: 'read' | 'read_write' | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OutlineDocument {
  id: string;
  urlId: string;
  title: string;
  text: string;
  emoji: string | null;
  collectionId: string | null;
  parentDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  template: boolean;
  fullWidth: boolean;
  createdBy: OutlineUser;
  updatedBy: OutlineUser;
}

export interface OutlineSearchResult {
  ranking: number;
  context: string;
  document: OutlineDocument;
}

export interface OutlinePagination {
  limit: number;
  offset: number;
  nextPath: string | null;
}

export interface OutlineApiResponse<T> {
  ok: boolean;
  data: T;
  pagination?: OutlinePagination;
  policies?: Array<{
    id: string;
    abilities: Record<string, boolean>;
  }>;
}

export interface OutlineApiError {
  ok: false;
  error: string;
  message?: string;
}

export type OutlineResponse<T> = OutlineApiResponse<T> | OutlineApiError;

export interface DocumentListParams {
  collectionId?: string;
  parentDocumentId?: string;
  userId?: string;
  template?: boolean;
  sort?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  direction?: 'ASC' | 'DESC';
}

export interface DocumentSearchParams {
  query: string;
  collectionId?: string;
  userId?: string;
  dateFilter?: 'day' | 'week' | 'month' | 'year';
  includeArchived?: boolean;
  includeDrafts?: boolean;
}

export interface DocumentCreateParams {
  title: string;
  text?: string;
  collectionId: string;
  parentDocumentId?: string;
  template?: boolean;
  publish?: boolean;
}

export interface DocumentUpdateParams {
  id: string;
  title?: string;
  text?: string;
  append?: boolean;
  publish?: boolean;
  done?: boolean;
}

export interface DocumentMoveParams {
  id: string;
  collectionId?: string;
  parentDocumentId?: string | null;
}

export interface CollectionCreateParams {
  name: string;
  description?: string;
  color?: string;
  permission?: 'read' | 'read_write';
}

export interface CollectionUpdateParams {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  permission?: 'read' | 'read_write';
}
