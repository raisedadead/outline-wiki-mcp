import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerResources } from '../src/resources.js';
import type { OutlineClient } from '../src/outline-client.js';

type ResourceHandler = (
  uri: URL,
  params: Record<string, string | string[]>
) => Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}>;

type ListCallback = () => Promise<{
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType: string;
  }>;
}>;

interface ResourceRegistration {
  handler: ResourceHandler;
  listCallback?: ListCallback;
}

function createMockClient(): OutlineClient {
  return {
    listCollections: vi.fn(),
    getCollection: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    searchDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    moveDocument: vi.fn(),
    deleteDocument: vi.fn(),
    archiveDocument: vi.fn(),
    unarchiveDocument: vi.fn(),
    listDrafts: vi.fn(),
    exportDocument: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
  } as unknown as OutlineClient;
}

function extractResourceHandlers(client: OutlineClient) {
  const resources = new Map<string, ResourceRegistration>();

  const server = {
    registerResource: vi.fn(
      (
        name: string,
        _uriOrTemplate: unknown,
        _metadataOrOptions: unknown,
        handlerOrMetadata?: unknown,
        maybeHandler?: ResourceHandler
      ) => {
        // registerResource has two signatures:
        // 1. (name, uri, metadata, handler) - static resource
        // 2. (name, template, metadata, options, handler) - template resource
        if (typeof maybeHandler === 'function') {
          // Template resource: (name, template, templateOpts, metadata, handler)
          // Actually the MCP SDK signature is:
          // registerResource(name, template, metadata, handler)
          // But for templates with list callbacks, it's:
          // registerResource(name, ResourceTemplate, metadata, handler)
          // where ResourceTemplate itself contains the list callback
          resources.set(name, { handler: maybeHandler });
        } else if (typeof handlerOrMetadata === 'function') {
          resources.set(name, {
            handler: handlerOrMetadata as ResourceHandler,
          });
        }
      }
    ),
  } as unknown as McpServer;

  registerResources(server, client);

  return { server, resources };
}

describe('registerResources', () => {
  let client: OutlineClient;
  let resources: Map<string, ResourceRegistration>;

  beforeEach(() => {
    client = createMockClient();
    const result = extractResourceHandlers(client);
    resources = result.resources;
  });

  it('should register all 3 resources', () => {
    expect(resources.size).toBe(3);
    expect(resources.has('collections')).toBe(true);
    expect(resources.has('collection')).toBe(true);
    expect(resources.has('document')).toBe(true);
  });

  describe('collections resource', () => {
    it('should list all collections', async () => {
      const mockCollections = [
        {
          id: 'col-1',
          name: 'Engineering',
          description: 'Eng docs',
          color: '#FF0000',
        },
        {
          id: 'col-2',
          name: 'Design',
          description: null,
          color: '#00FF00',
        },
      ];
      vi.mocked(client.listCollections).mockResolvedValue(mockCollections);

      const handler = resources.get('collections')!.handler;
      const result = await handler(new URL('outline://collections'), {});

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('outline://collections');
      expect(result.contents[0].mimeType).toBe('application/json');

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        id: 'col-1',
        name: 'Engineering',
        description: 'Eng docs',
        color: '#FF0000',
      });
    });

    it('should return empty array when no collections exist', async () => {
      vi.mocked(client.listCollections).mockResolvedValue([]);

      const handler = resources.get('collections')!.handler;
      const result = await handler(new URL('outline://collections'), {});

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toEqual([]);
    });
  });

  describe('collection resource (template)', () => {
    it('should return collection details with documents', async () => {
      const mockCollection = {
        id: 'col-1',
        name: 'Engineering',
        description: 'Eng docs',
        color: '#FF0000',
      };
      const mockDocuments = [
        { id: 'doc-1', title: 'Doc 1', updatedAt: '2024-01-01' },
        { id: 'doc-2', title: 'Doc 2', updatedAt: '2024-01-02' },
      ];
      vi.mocked(client.getCollection).mockResolvedValue(mockCollection);
      vi.mocked(client.listDocuments).mockResolvedValue(mockDocuments);

      const handler = resources.get('collection')!.handler;
      const result = await handler(new URL('outline://collections/col-1'), {
        collectionId: 'col-1',
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('outline://collections/col-1');
      expect(result.contents[0].mimeType).toBe('application/json');

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed.id).toBe('col-1');
      expect(parsed.name).toBe('Engineering');
      expect(parsed.documents).toHaveLength(2);
      expect(parsed.documents[0].id).toBe('doc-1');
    });

    it('should fetch collection and documents in parallel', async () => {
      vi.mocked(client.getCollection).mockResolvedValue({
        id: 'col-1',
        name: 'Test',
        description: null,
        color: '#000',
      });
      vi.mocked(client.listDocuments).mockResolvedValue([]);

      const handler = resources.get('collection')!.handler;
      await handler(new URL('outline://collections/col-1'), {
        collectionId: 'col-1',
      });

      expect(client.getCollection).toHaveBeenCalledWith('col-1');
      expect(client.listDocuments).toHaveBeenCalledWith({
        collectionId: 'col-1',
      });
    });

    it('should handle array params by using first value', async () => {
      vi.mocked(client.getCollection).mockResolvedValue({
        id: 'col-1',
        name: 'Test',
        description: null,
        color: '#000',
      });
      vi.mocked(client.listDocuments).mockResolvedValue([]);

      const handler = resources.get('collection')!.handler;
      await handler(new URL('outline://collections/col-1'), {
        collectionId: ['col-1', 'col-2'],
      });

      expect(client.getCollection).toHaveBeenCalledWith('col-1');
    });

    it('should throw error for missing collectionId', async () => {
      const handler = resources.get('collection')!.handler;

      await expect(
        handler(new URL('outline://collections/'), {})
      ).rejects.toThrow('Invalid or missing collectionId parameter');
    });
  });

  describe('document resource (template)', () => {
    it('should return document content as markdown', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Test Document',
        updatedAt: '2024-01-01T00:00:00Z',
        text: 'Hello world content here',
      };
      vi.mocked(client.getDocument).mockResolvedValue(mockDoc);

      const handler = resources.get('document')!.handler;
      const result = await handler(new URL('outline://documents/doc-1'), {
        documentId: 'doc-1',
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('outline://documents/doc-1');
      expect(result.contents[0].mimeType).toBe('text/markdown');

      const text = result.contents[0].text;
      expect(text).toContain('# Test Document');
      expect(text).toContain('**ID:** doc-1');
      expect(text).toContain('**Updated:** 2024-01-01T00:00:00Z');
      expect(text).toContain('**Words:** 4');
      expect(text).toContain('---');
      expect(text).toContain('Hello world content here');
    });

    it('should return full document content without truncation', async () => {
      const longText = 'a'.repeat(600);
      const mockDoc = {
        id: 'doc-1',
        title: 'Long Doc',
        updatedAt: '2024-01-01',
        text: longText,
      };
      vi.mocked(client.getDocument).mockResolvedValue(mockDoc);

      const handler = resources.get('document')!.handler;
      const result = await handler(new URL('outline://documents/doc-1'), {
        documentId: 'doc-1',
      });

      const text = result.contents[0].text;
      expect(text).toContain(longText);
      expect(text).not.toContain('…');
    });

    it('should throw error for missing documentId', async () => {
      const handler = resources.get('document')!.handler;

      await expect(
        handler(new URL('outline://documents/'), {})
      ).rejects.toThrow('Invalid or missing documentId parameter');
    });

    it('should calculate word count correctly', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Word Count Test',
        updatedAt: '2024-01-01',
        text: 'one two three four five',
      };
      vi.mocked(client.getDocument).mockResolvedValue(mockDoc);

      const handler = resources.get('document')!.handler;
      const result = await handler(new URL('outline://documents/doc-1'), {
        documentId: 'doc-1',
      });

      expect(result.contents[0].text).toContain('**Words:** 5');
    });
  });

  describe('error propagation', () => {
    it('should propagate client errors from collection list', async () => {
      vi.mocked(client.listCollections).mockRejectedValue(
        new Error('Network error')
      );

      const handler = resources.get('collections')!.handler;
      await expect(
        handler(new URL('outline://collections'), {})
      ).rejects.toThrow('Network error');
    });

    it('should propagate client errors from document fetch', async () => {
      vi.mocked(client.getDocument).mockRejectedValue(
        new Error('Document not found')
      );

      const handler = resources.get('document')!.handler;
      await expect(
        handler(new URL('outline://documents/invalid'), {
          documentId: 'invalid',
        })
      ).rejects.toThrow('Document not found');
    });

    it('should propagate errors from collection detail fetch', async () => {
      vi.mocked(client.getCollection).mockRejectedValue(
        new Error('Collection not found')
      );
      vi.mocked(client.listDocuments).mockResolvedValue([]);

      const handler = resources.get('collection')!.handler;
      await expect(
        handler(new URL('outline://collections/invalid'), {
          collectionId: 'invalid',
        })
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('response format', () => {
    it('should return proper content structure for JSON resources', async () => {
      vi.mocked(client.listCollections).mockResolvedValue([]);

      const handler = resources.get('collections')!.handler;
      const result = await handler(new URL('outline://collections'), {});

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('uri');
      expect(result.contents[0]).toHaveProperty('mimeType');
      expect(result.contents[0]).toHaveProperty('text');
      expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
    });

    it('should return proper content structure for markdown resources', async () => {
      vi.mocked(client.getDocument).mockResolvedValue({
        id: 'doc-1',
        title: 'Test',
        updatedAt: '2024-01-01',
        text: 'Content',
      });

      const handler = resources.get('document')!.handler;
      const result = await handler(new URL('outline://documents/doc-1'), {
        documentId: 'doc-1',
      });

      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('#');
    });
  });
});
