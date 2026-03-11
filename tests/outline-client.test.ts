import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutlineClient } from '../src/outline-client.js';

describe('OutlineClient', () => {
  let client: OutlineClient;
  const mockConfig = {
    baseUrl: 'https://outline.example.com',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    client = new OutlineClient(mockConfig);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockFetchResponse = (data: unknown, ok = true, status = 200) => {
    vi.mocked(fetch).mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => data,
      headers: new Headers(),
    } as Response);
  };

  describe('listCollections', () => {
    it('should fetch all collections', async () => {
      const mockCollections = [
        { id: '1', name: 'Collection 1' },
        { id: '2', name: 'Collection 2' },
      ];

      mockFetchResponse({
        ok: true,
        data: { collections: mockCollections },
      });

      const collections = await client.listCollections();

      expect(collections).toEqual(mockCollections);
      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/collections.list',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        })
      );
    });
  });

  describe('getCollection', () => {
    it('should fetch a single collection by ID', async () => {
      const mockCollection = { id: '1', name: 'Collection 1' };

      mockFetchResponse({
        ok: true,
        data: mockCollection,
      });

      const collection = await client.getCollection('1');

      expect(collection).toEqual(mockCollection);
      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/collections.info',
        expect.objectContaining({
          body: JSON.stringify({ id: '1' }),
        })
      );
    });
  });

  describe('getDocument', () => {
    it('should fetch a single document by ID', async () => {
      const mockDocument = { id: 'doc-1', title: 'Test Document' };

      mockFetchResponse({
        ok: true,
        data: mockDocument,
      });

      const document = await client.getDocument('doc-1');

      expect(document).toEqual(mockDocument);
      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/documents.info',
        expect.objectContaining({
          body: JSON.stringify({ id: 'doc-1' }),
        })
      );
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with query', async () => {
      const mockResults = [
        { ranking: 1, context: 'test', document: { id: 'doc-1' } },
      ];

      mockFetchResponse({
        ok: true,
        data: { results: mockResults },
      });

      const results = await client.searchDocuments({ query: 'test' });

      expect(results).toEqual(mockResults);
    });
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const mockDocument = { id: 'new-doc', title: 'New Document' };

      mockFetchResponse({
        ok: true,
        data: mockDocument,
      });

      const document = await client.createDocument({
        title: 'New Document',
        collectionId: 'collection-1',
      });

      expect(document).toEqual(mockDocument);
      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/documents.create',
        expect.objectContaining({
          body: JSON.stringify({
            title: 'New Document',
            collectionId: 'collection-1',
          }),
        })
      );
    });
  });

  describe('updateDocument', () => {
    it('should update an existing document', async () => {
      const mockDocument = { id: 'doc-1', title: 'Updated Document' };

      mockFetchResponse({
        ok: true,
        data: mockDocument,
      });

      const document = await client.updateDocument({
        id: 'doc-1',
        title: 'Updated Document',
      });

      expect(document).toEqual(mockDocument);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      mockFetchResponse({ ok: true, data: undefined });

      await client.deleteDocument('doc-1');

      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/documents.delete',
        expect.objectContaining({
          body: JSON.stringify({ id: 'doc-1', permanent: false }),
        })
      );
    });

    it('should permanently delete a document', async () => {
      mockFetchResponse({ ok: true, data: undefined });

      await client.deleteDocument('doc-1', true);

      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/documents.delete',
        expect.objectContaining({
          body: JSON.stringify({ id: 'doc-1', permanent: true }),
        })
      );
    });
  });

  describe('archiveDocument', () => {
    it('should archive a document', async () => {
      const mockDocument = { id: 'doc-1', archivedAt: '2024-01-01' };

      mockFetchResponse({
        ok: true,
        data: mockDocument,
      });

      const document = await client.archiveDocument('doc-1');

      expect(document).toEqual(mockDocument);
    });
  });

  describe('unarchiveDocument', () => {
    it('should unarchive a document', async () => {
      const mockDocument = { id: 'doc-1', archivedAt: null };

      mockFetchResponse({
        ok: true,
        data: mockDocument,
      });

      const document = await client.unarchiveDocument('doc-1');

      expect(document).toEqual(mockDocument);
    });
  });

  describe('exportDocument', () => {
    it('should export a document as markdown', async () => {
      mockFetchResponse({
        ok: true,
        data: '# Document Content',
      });

      const markdown = await client.exportDocument('doc-1');

      expect(markdown).toBe('# Document Content');
    });
  });

  describe('error handling', () => {
    it('should throw error on API error response', async () => {
      mockFetchResponse(
        { ok: false, error: 'not_found', message: 'Document not found' },
        false,
        404
      );

      await expect(client.getDocument('invalid')).rejects.toThrow(
        'Outline API error'
      );
    });

    it('should throw error on network failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(client.getDocument('doc-1')).rejects.toThrow(
        'Network error connecting to Outline API'
      );
    });
  });

  describe('collection operations', () => {
    it('should create a collection', async () => {
      const mockCollection = { id: 'col-1', name: 'New Collection' };

      mockFetchResponse({
        ok: true,
        data: mockCollection,
      });

      const collection = await client.createCollection({
        name: 'New Collection',
      });

      expect(collection).toEqual(mockCollection);
    });

    it('should update a collection', async () => {
      const mockCollection = { id: 'col-1', name: 'Updated Collection' };

      mockFetchResponse({
        ok: true,
        data: mockCollection,
      });

      const collection = await client.updateCollection({
        id: 'col-1',
        name: 'Updated Collection',
      });

      expect(collection).toEqual(mockCollection);
    });

    it('should delete a collection', async () => {
      mockFetchResponse({ ok: true, data: undefined });

      await client.deleteCollection('col-1');

      expect(fetch).toHaveBeenCalledWith(
        'https://outline.example.com/api/collections.delete',
        expect.objectContaining({
          body: JSON.stringify({ id: 'col-1' }),
        })
      );
    });
  });
});
