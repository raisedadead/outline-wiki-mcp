import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../src/tools.js';
import type { OutlineClient } from '../src/outline-client.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

function createMockClient(): OutlineClient {
  return {
    searchDocuments: vi.fn(),
    getDocument: vi.fn(),
    listCollections: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    moveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    archiveDocument: vi.fn(),
    unarchiveDocument: vi.fn(),
    listDrafts: vi.fn(),
    exportDocument: vi.fn(),
    getCollection: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
  } as unknown as OutlineClient;
}

function extractToolHandlers(client: OutlineClient) {
  const handlers = new Map<string, ToolHandler>();

  const server = {
    tool: vi.fn(
      (
        name: string,
        _description: string,
        _schema: Record<string, unknown>,
        handler: ToolHandler
      ) => {
        handlers.set(name, handler);
      }
    ),
  } as unknown as McpServer;

  registerTools(server, client);

  return { server, handlers };
}

function parseResult(result: {
  content: Array<{ type: string; text: string }>;
}) {
  return JSON.parse(result.content[0].text);
}

describe('registerTools', () => {
  let client: OutlineClient;
  let handlers: Map<string, ToolHandler>;

  beforeEach(() => {
    client = createMockClient();
    const result = extractToolHandlers(client);
    handlers = result.handlers;
  });

  it('should register all 16 tools', () => {
    expect(handlers.size).toBe(16);
    expect(handlers.has('outline_search')).toBe(true);
    expect(handlers.has('outline_get_document')).toBe(true);
    expect(handlers.has('outline_list_collections')).toBe(true);
    expect(handlers.has('outline_list_documents')).toBe(true);
    expect(handlers.has('outline_create_document')).toBe(true);
    expect(handlers.has('outline_update_document')).toBe(true);
    expect(handlers.has('outline_move_document')).toBe(true);
    expect(handlers.has('outline_delete_document')).toBe(true);
    expect(handlers.has('outline_archive_document')).toBe(true);
    expect(handlers.has('outline_unarchive_document')).toBe(true);
    expect(handlers.has('outline_list_drafts')).toBe(true);
    expect(handlers.has('outline_export_document')).toBe(true);
    expect(handlers.has('outline_get_collection')).toBe(true);
    expect(handlers.has('outline_create_collection')).toBe(true);
    expect(handlers.has('outline_update_collection')).toBe(true);
    expect(handlers.has('outline_delete_collection')).toBe(true);
  });

  describe('outline_search', () => {
    it('should search documents and return formatted results', async () => {
      const mockResults = [
        {
          ranking: 1,
          context: 'This is some context for the search result',
          document: {
            id: 'doc-1',
            title: 'Test Doc',
            collectionId: 'col-1',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      ];
      vi.mocked(client.searchDocuments).mockResolvedValue(mockResults);

      const handler = handlers.get('outline_search')!;
      const result = await handler({ query: 'test' });
      const parsed = parseResult(result);

      expect(client.searchDocuments).toHaveBeenCalledWith({
        query: 'test',
        collectionId: undefined,
        includeArchived: undefined,
        includeDrafts: undefined,
      });
      expect(parsed).toEqual([
        {
          id: 'doc-1',
          title: 'Test Doc',
          context: 'This is some context for the search result',
          collectionId: 'col-1',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);
    });

    it('should pass optional filters to search', async () => {
      vi.mocked(client.searchDocuments).mockResolvedValue([]);

      const handler = handlers.get('outline_search')!;
      await handler({
        query: 'test',
        collectionId: 'col-1',
        includeArchived: true,
        includeDrafts: true,
      });

      expect(client.searchDocuments).toHaveBeenCalledWith({
        query: 'test',
        collectionId: 'col-1',
        includeArchived: true,
        includeDrafts: true,
      });
    });

    it('should truncate long context to 200 characters', async () => {
      const longContext = 'a'.repeat(300);
      const mockResults = [
        {
          ranking: 1,
          context: longContext,
          document: {
            id: 'doc-1',
            title: 'Test',
            collectionId: 'col-1',
            updatedAt: '2024-01-01',
          },
        },
      ];
      vi.mocked(client.searchDocuments).mockResolvedValue(mockResults);

      const handler = handlers.get('outline_search')!;
      const result = await handler({ query: 'test' });
      const parsed = parseResult(result);

      expect(parsed[0].context.length).toBeLessThanOrEqual(201);
    });
  });

  describe('outline_get_document', () => {
    it('should return document metadata and preview', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Test Document',
        collectionId: 'col-1',
        parentDocumentId: null,
        updatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        text: 'Hello world content',
      };
      vi.mocked(client.getDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_get_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(client.getDocument).toHaveBeenCalledWith('doc-1');
      expect(parsed.id).toBe('doc-1');
      expect(parsed.title).toBe('Test Document');
      expect(parsed.wordCount).toBe(3);
      expect(parsed.charCount).toBe(19);
      expect(parsed.preview).toBe('Hello world content');
    });

    it('should truncate long previews to 500 characters', async () => {
      const longText = 'word '.repeat(200);
      const mockDoc = {
        id: 'doc-1',
        title: 'Long Doc',
        collectionId: 'col-1',
        parentDocumentId: null,
        updatedAt: '2024-01-01',
        createdAt: '2024-01-01',
        text: longText,
      };
      vi.mocked(client.getDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_get_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(parsed.preview.length).toBeLessThanOrEqual(501);
    });
  });

  describe('outline_list_collections', () => {
    it('should list all collections', async () => {
      const mockCollections = [
        { id: 'col-1', name: 'Engineering', description: 'Eng docs' },
        { id: 'col-2', name: 'Design', description: null },
      ];
      vi.mocked(client.listCollections).mockResolvedValue(mockCollections);

      const handler = handlers.get('outline_list_collections')!;
      const result = await handler({});
      const parsed = parseResult(result);

      expect(parsed).toEqual([
        { id: 'col-1', name: 'Engineering', description: 'Eng docs' },
        { id: 'col-2', name: 'Design', description: null },
      ]);
    });

    it('should return empty array when no collections', async () => {
      vi.mocked(client.listCollections).mockResolvedValue([]);

      const handler = handlers.get('outline_list_collections')!;
      const result = await handler({});
      const parsed = parseResult(result);

      expect(parsed).toEqual([]);
    });
  });

  describe('outline_list_documents', () => {
    it('should list documents with optional filters', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          title: 'Doc 1',
          collectionId: 'col-1',
          parentDocumentId: null,
          updatedAt: '2024-01-01',
        },
      ];
      vi.mocked(client.listDocuments).mockResolvedValue(mockDocs);

      const handler = handlers.get('outline_list_documents')!;
      const result = await handler({
        collectionId: 'col-1',
        parentDocumentId: 'parent-1',
      });
      const parsed = parseResult(result);

      expect(client.listDocuments).toHaveBeenCalledWith({
        collectionId: 'col-1',
        parentDocumentId: 'parent-1',
      });
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('doc-1');
    });
  });

  describe('outline_create_document', () => {
    it('should create a document and return its metadata', async () => {
      const mockDoc = {
        id: 'new-doc',
        urlId: 'new-doc-url',
        title: 'New Document',
        collectionId: 'col-1',
        createdAt: '2024-01-01T00:00:00Z',
      };
      vi.mocked(client.createDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_create_document')!;
      const result = await handler({
        title: 'New Document',
        text: '# Hello',
        collectionId: 'col-1',
      });
      const parsed = parseResult(result);

      expect(client.createDocument).toHaveBeenCalledWith({
        title: 'New Document',
        text: '# Hello',
        collectionId: 'col-1',
        parentDocumentId: undefined,
        publish: true,
      });
      expect(parsed.id).toBe('new-doc');
      expect(parsed.urlId).toBe('new-doc-url');
    });

    it('should pass publish=false when specified', async () => {
      const mockDoc = {
        id: 'new-doc',
        urlId: 'new-doc-url',
        title: 'Draft',
        collectionId: 'col-1',
        createdAt: '2024-01-01',
      };
      vi.mocked(client.createDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_create_document')!;
      await handler({
        title: 'Draft',
        collectionId: 'col-1',
        publish: false,
      });

      expect(client.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({ publish: false })
      );
    });

    it('should create nested document with parentDocumentId', async () => {
      const mockDoc = {
        id: 'child-doc',
        urlId: 'child-url',
        title: 'Child',
        collectionId: 'col-1',
        createdAt: '2024-01-01',
      };
      vi.mocked(client.createDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_create_document')!;
      await handler({
        title: 'Child',
        collectionId: 'col-1',
        parentDocumentId: 'parent-doc',
      });

      expect(client.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({ parentDocumentId: 'parent-doc' })
      );
    });
  });

  describe('outline_update_document', () => {
    it('should update a document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Updated Title',
        updatedAt: '2024-01-02T00:00:00Z',
      };
      vi.mocked(client.updateDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_update_document')!;
      const result = await handler({
        id: 'doc-1',
        title: 'Updated Title',
        text: 'New content',
      });
      const parsed = parseResult(result);

      expect(client.updateDocument).toHaveBeenCalledWith({
        id: 'doc-1',
        title: 'Updated Title',
        text: 'New content',
        append: undefined,
        publish: undefined,
      });
      expect(parsed.id).toBe('doc-1');
      expect(parsed.title).toBe('Updated Title');
    });

    it('should support append mode', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Doc',
        updatedAt: '2024-01-02',
      };
      vi.mocked(client.updateDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_update_document')!;
      await handler({
        id: 'doc-1',
        text: 'Appended content',
        append: true,
      });

      expect(client.updateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ append: true })
      );
    });
  });

  describe('outline_move_document', () => {
    it('should move a document and return affected documents', async () => {
      const mockDocs = [
        { id: 'doc-1', title: 'Moved Doc', collectionId: 'col-2' },
        { id: 'doc-2', title: 'Child Doc', collectionId: 'col-2' },
      ];
      vi.mocked(client.moveDocument).mockResolvedValue(mockDocs);

      const handler = handlers.get('outline_move_document')!;
      const result = await handler({
        id: 'doc-1',
        collectionId: 'col-2',
      });
      const parsed = parseResult(result);

      expect(parsed.moved).toBe(2);
      expect(parsed.documents).toHaveLength(2);
      expect(parsed.documents[0].collectionId).toBe('col-2');
    });

    it('should support moving to root level with null parentDocumentId', async () => {
      vi.mocked(client.moveDocument).mockResolvedValue([
        { id: 'doc-1', title: 'Doc', collectionId: 'col-1' },
      ]);

      const handler = handlers.get('outline_move_document')!;
      await handler({
        id: 'doc-1',
        parentDocumentId: null,
      });

      expect(client.moveDocument).toHaveBeenCalledWith({
        id: 'doc-1',
        collectionId: undefined,
        parentDocumentId: null,
      });
    });
  });

  describe('outline_delete_document', () => {
    it('should soft delete by default', async () => {
      vi.mocked(client.deleteDocument).mockResolvedValue(undefined);

      const handler = handlers.get('outline_delete_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(client.deleteDocument).toHaveBeenCalledWith('doc-1', false);
      expect(parsed.deleted).toBe(true);
      expect(parsed.permanent).toBe(false);
    });

    it('should permanently delete when specified', async () => {
      vi.mocked(client.deleteDocument).mockResolvedValue(undefined);

      const handler = handlers.get('outline_delete_document')!;
      const result = await handler({ id: 'doc-1', permanent: true });
      const parsed = parseResult(result);

      expect(client.deleteDocument).toHaveBeenCalledWith('doc-1', true);
      expect(parsed.permanent).toBe(true);
    });
  });

  describe('outline_archive_document', () => {
    it('should archive a document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Archived Doc',
        archivedAt: '2024-01-01T00:00:00Z',
      };
      vi.mocked(client.archiveDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_archive_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(client.archiveDocument).toHaveBeenCalledWith('doc-1');
      expect(parsed.archived).toBe(true);
      expect(parsed.archivedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('outline_unarchive_document', () => {
    it('should restore an archived document', async () => {
      const mockDoc = { id: 'doc-1', title: 'Restored Doc' };
      vi.mocked(client.unarchiveDocument).mockResolvedValue(mockDoc);

      const handler = handlers.get('outline_unarchive_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(client.unarchiveDocument).toHaveBeenCalledWith('doc-1');
      expect(parsed.restored).toBe(true);
      expect(parsed.title).toBe('Restored Doc');
    });
  });

  describe('outline_list_drafts', () => {
    it('should list draft documents', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          title: 'Draft 1',
          collectionId: 'col-1',
          updatedAt: '2024-01-01',
        },
        {
          id: 'draft-2',
          title: 'Draft 2',
          collectionId: 'col-2',
          updatedAt: '2024-01-02',
        },
      ];
      vi.mocked(client.listDrafts).mockResolvedValue(mockDrafts);

      const handler = handlers.get('outline_list_drafts')!;
      const result = await handler({});
      const parsed = parseResult(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('draft-1');
      expect(parsed[1].id).toBe('draft-2');
    });

    it('should return empty array when no drafts', async () => {
      vi.mocked(client.listDrafts).mockResolvedValue([]);

      const handler = handlers.get('outline_list_drafts')!;
      const result = await handler({});
      const parsed = parseResult(result);

      expect(parsed).toEqual([]);
    });
  });

  describe('outline_export_document', () => {
    it('should export document as markdown with stats', async () => {
      vi.mocked(client.exportDocument).mockResolvedValue(
        '# Title\n\nSome content here'
      );

      const handler = handlers.get('outline_export_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(client.exportDocument).toHaveBeenCalledWith('doc-1');
      expect(parsed.id).toBe('doc-1');
      expect(parsed.wordCount).toBe(5);
      expect(parsed.charCount).toBe(26);
      expect(parsed.preview).toBe('# Title\n\nSome content here');
    });

    it('should truncate long export previews', async () => {
      const longMarkdown = 'word '.repeat(200);
      vi.mocked(client.exportDocument).mockResolvedValue(longMarkdown);

      const handler = handlers.get('outline_export_document')!;
      const result = await handler({ id: 'doc-1' });
      const parsed = parseResult(result);

      expect(parsed.preview.length).toBeLessThanOrEqual(501);
    });
  });

  describe('outline_get_collection', () => {
    it('should return collection details', async () => {
      const mockCollection = {
        id: 'col-1',
        name: 'Engineering',
        description: 'Eng docs',
        color: '#FF0000',
        permission: 'read_write',
      };
      vi.mocked(client.getCollection).mockResolvedValue(mockCollection);

      const handler = handlers.get('outline_get_collection')!;
      const result = await handler({ id: 'col-1' });
      const parsed = parseResult(result);

      expect(client.getCollection).toHaveBeenCalledWith('col-1');
      expect(parsed.id).toBe('col-1');
      expect(parsed.name).toBe('Engineering');
      expect(parsed.permission).toBe('read_write');
    });
  });

  describe('outline_create_collection', () => {
    it('should create a collection', async () => {
      const mockCollection = {
        id: 'new-col',
        name: 'New Collection',
        description: 'A new collection',
        color: '#00FF00',
      };
      vi.mocked(client.createCollection).mockResolvedValue(mockCollection);

      const handler = handlers.get('outline_create_collection')!;
      const result = await handler({
        name: 'New Collection',
        description: 'A new collection',
        color: '#00FF00',
      });
      const parsed = parseResult(result);

      expect(client.createCollection).toHaveBeenCalledWith({
        name: 'New Collection',
        description: 'A new collection',
        color: '#00FF00',
        permission: undefined,
      });
      expect(parsed.id).toBe('new-col');
      expect(parsed.name).toBe('New Collection');
    });

    it('should pass permission level', async () => {
      const mockCollection = {
        id: 'col-1',
        name: 'Private',
        description: null,
        color: '#000',
      };
      vi.mocked(client.createCollection).mockResolvedValue(mockCollection);

      const handler = handlers.get('outline_create_collection')!;
      await handler({
        name: 'Private',
        permission: 'read',
      });

      expect(client.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ permission: 'read' })
      );
    });
  });

  describe('outline_update_collection', () => {
    it('should update a collection', async () => {
      const mockCollection = {
        id: 'col-1',
        name: 'Updated Name',
        description: 'Updated desc',
        color: '#0000FF',
      };
      vi.mocked(client.updateCollection).mockResolvedValue(mockCollection);

      const handler = handlers.get('outline_update_collection')!;
      const result = await handler({
        id: 'col-1',
        name: 'Updated Name',
        description: 'Updated desc',
        color: '#0000FF',
      });
      const parsed = parseResult(result);

      expect(client.updateCollection).toHaveBeenCalledWith({
        id: 'col-1',
        name: 'Updated Name',
        description: 'Updated desc',
        color: '#0000FF',
        permission: undefined,
      });
      expect(parsed.name).toBe('Updated Name');
    });
  });

  describe('outline_delete_collection', () => {
    it('should delete a collection', async () => {
      vi.mocked(client.deleteCollection).mockResolvedValue(undefined);

      const handler = handlers.get('outline_delete_collection')!;
      const result = await handler({ id: 'col-1' });
      const parsed = parseResult(result);

      expect(client.deleteCollection).toHaveBeenCalledWith('col-1');
      expect(parsed.deleted).toBe(true);
      expect(parsed.id).toBe('col-1');
    });
  });

  describe('error propagation', () => {
    it('should propagate client errors from search', async () => {
      vi.mocked(client.searchDocuments).mockRejectedValue(
        new Error('API error')
      );

      const handler = handlers.get('outline_search')!;
      await expect(handler({ query: 'test' })).rejects.toThrow('API error');
    });

    it('should propagate client errors from getDocument', async () => {
      vi.mocked(client.getDocument).mockRejectedValue(new Error('Not found'));

      const handler = handlers.get('outline_get_document')!;
      await expect(handler({ id: 'invalid' })).rejects.toThrow('Not found');
    });

    it('should propagate client errors from createDocument', async () => {
      vi.mocked(client.createDocument).mockRejectedValue(
        new Error('Validation failed')
      );

      const handler = handlers.get('outline_create_document')!;
      await expect(
        handler({ title: 'Doc', collectionId: 'col-1' })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('response format', () => {
    it('should always return content array with text type', async () => {
      vi.mocked(client.listCollections).mockResolvedValue([]);

      const handler = handlers.get('outline_list_collections')!;
      const result = await handler({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should return valid JSON in text content', async () => {
      vi.mocked(client.listCollections).mockResolvedValue([]);

      const handler = handlers.get('outline_list_collections')!;
      const result = await handler({});

      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});
