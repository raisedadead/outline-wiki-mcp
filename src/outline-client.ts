import type {
  OutlineConfig,
  OutlineCollection,
  OutlineDocument,
  OutlineSearchResult,
  OutlineApiResponse,
  OutlineApiError,
  DocumentListParams,
  DocumentSearchParams,
  DocumentCreateParams,
  DocumentUpdateParams,
  DocumentMoveParams,
  CollectionCreateParams,
  CollectionUpdateParams,
} from './types.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_RETRIES = 3;
const MAX_PAGES = 100;
const INITIAL_RETRY_DELAY = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

export class OutlineClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: OutlineConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown> = {},
    retries = MAX_RETRIES
  ): Promise<OutlineApiResponse<T>> {
    const url = `${this.baseUrl}/api/${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Network error connecting to Outline API: ${message}`, {
        cause: error,
      });
    }

    // Handle retryable errors
    if (RETRYABLE_STATUS_CODES.has(response.status) && retries > 0) {
      const retryAfter = response.headers.get('Retry-After');
      const parsedRetryAfter = retryAfter ? parseInt(retryAfter, 10) : NaN;
      const delay = !isNaN(parsedRetryAfter)
        ? parsedRetryAfter * 1000
        : INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);

      await this.sleep(delay);
      return this.request<T>(endpoint, body, retries - 1);
    }

    // Validate HTTP status before parsing
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as OutlineApiError;
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.message) {
            errorMessage += ` - ${errorData.message}`;
          }
        }
      } catch {
        // JSON parse failed, use status text
      }
      throw new Error(`Outline API error: ${errorMessage}`);
    }

    let data: OutlineApiResponse<T> | OutlineApiError;
    try {
      data = (await response.json()) as OutlineApiResponse<T> | OutlineApiError;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON response from Outline API: ${message}`, {
        cause: error,
      });
    }

    if (!data.ok) {
      const error = data as OutlineApiError;
      throw new Error(
        `Outline API error: ${error.error}${error.message ? ` - ${error.message}` : ''}`
      );
    }

    return data as OutlineApiResponse<T>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchAllPages<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    dataKey: string = 'data'
  ): Promise<T[]> {
    const allResults: T[] = [];
    let offset = 0;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;

      // eslint-disable-next-line no-await-in-loop -- sequential pagination is intentional
      const response = await this.request<T[] | Record<string, T[]>>(endpoint, {
        ...params,
        limit: DEFAULT_PAGE_SIZE,
        offset,
      });

      // Handle both array responses and object responses with nested data
      let items: T[];
      if (Array.isArray(response.data)) {
        items = response.data;
      } else if (
        typeof response.data === 'object' &&
        response.data !== null &&
        dataKey in response.data
      ) {
        const nested = (response.data as Record<string, unknown>)[dataKey];
        items = Array.isArray(nested) ? (nested as T[]) : [];
      } else {
        items = [];
      }

      allResults.push(...items);

      if (response.pagination?.nextPath && items.length > 0) {
        offset += DEFAULT_PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allResults;
  }

  // Collection methods

  async listCollections(): Promise<OutlineCollection[]> {
    return this.fetchAllPages<OutlineCollection>(
      'collections.list',
      {},
      'collections'
    );
  }

  async getCollection(id: string): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>('collections.info', {
      id,
    });
    return response.data;
  }

  // Document methods

  async listDocuments(
    params: DocumentListParams = {}
  ): Promise<OutlineDocument[]> {
    return this.fetchAllPages<OutlineDocument>(
      'documents.list',
      { ...params },
      'documents'
    );
  }

  async getDocument(id: string): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>('documents.info', {
      id,
    });
    return response.data;
  }

  async searchDocuments(
    params: DocumentSearchParams
  ): Promise<OutlineSearchResult[]> {
    return this.fetchAllPages<OutlineSearchResult>(
      'documents.search',
      { ...params },
      'results'
    );
  }

  async createDocument(params: DocumentCreateParams): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>('documents.create', {
      ...params,
    });
    return response.data;
  }

  async updateDocument(params: DocumentUpdateParams): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>('documents.update', {
      ...params,
    });
    return response.data;
  }

  async moveDocument(params: DocumentMoveParams): Promise<OutlineDocument[]> {
    const response = await this.request<{ documents: OutlineDocument[] }>(
      'documents.move',
      { ...params }
    );
    return response.data.documents;
  }

  async deleteDocument(id: string, permanent = false): Promise<void> {
    await this.request<void>('documents.delete', { id, permanent });
  }

  async archiveDocument(id: string): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>('documents.archive', {
      id,
    });
    return response.data;
  }

  async unarchiveDocument(id: string): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>(
      'documents.unarchive',
      { id }
    );
    return response.data;
  }

  async listDrafts(): Promise<OutlineDocument[]> {
    return this.fetchAllPages<OutlineDocument>(
      'documents.drafts',
      {},
      'documents'
    );
  }

  async exportDocument(id: string): Promise<string> {
    const response = await this.request<string>('documents.export', {
      id,
    });
    return response.data;
  }

  // Additional collection methods

  async createCollection(
    params: CollectionCreateParams
  ): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>(
      'collections.create',
      { ...params }
    );
    return response.data;
  }

  async updateCollection(
    params: CollectionUpdateParams
  ): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>(
      'collections.update',
      { ...params }
    );
    return response.data;
  }

  async deleteCollection(id: string): Promise<void> {
    await this.request<void>('collections.delete', { id });
  }
}
