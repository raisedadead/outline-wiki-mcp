import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { OutlineClient } from './outline-client.js';

const PREVIEW_LENGTH = 500;
const CONTEXT_LENGTH = 200;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function registerTools(server: McpServer, client: OutlineClient): void {
  // outline_search - Search documents by query
  server.tool(
    'outline_search',
    'Search documents in Outline wiki by query',
    {
      query: z.string().describe('Search query string'),
      collectionId: z.string().optional().describe('Filter by collection ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived documents'),
      includeDrafts: z.boolean().optional().describe('Include draft documents'),
    },
    async ({ query, collectionId, includeArchived, includeDrafts }) => {
      const results = await client.searchDocuments({
        query,
        collectionId,
        includeArchived,
        includeDrafts,
      });

      const formatted = results.map(r => ({
        id: r.document.id,
        title: r.document.title,
        context: truncate(r.context, CONTEXT_LENGTH),
        collectionId: r.document.collectionId,
        updatedAt: r.document.updatedAt,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // outline_get_document - Get document content by ID
  server.tool(
    'outline_get_document',
    'Get a document by ID or URL ID. Returns metadata and a content preview. Use outline_export_document for full content.',
    {
      id: z.string().describe('Document ID or URL ID'),
    },
    async ({ id }) => {
      const doc = await client.getDocument(id);

      const result = {
        id: doc.id,
        title: doc.title,
        collectionId: doc.collectionId,
        parentDocumentId: doc.parentDocumentId,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
        wordCount: wordCount(doc.text),
        charCount: doc.text.length,
        preview: truncate(doc.text, PREVIEW_LENGTH),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // outline_list_collections - List all collections
  server.tool(
    'outline_list_collections',
    'List all collections in the Outline workspace',
    {},
    async () => {
      const collections = await client.listCollections();

      const formatted = collections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // outline_list_documents - List documents in a collection
  server.tool(
    'outline_list_documents',
    'List documents, optionally filtered by collection',
    {
      collectionId: z.string().optional().describe('Filter by collection ID'),
      parentDocumentId: z
        .string()
        .optional()
        .describe('Filter by parent document ID'),
    },
    async ({ collectionId, parentDocumentId }) => {
      const docs = await client.listDocuments({
        collectionId,
        parentDocumentId,
      });

      const formatted = docs.map(d => ({
        id: d.id,
        title: d.title,
        collectionId: d.collectionId,
        parentDocumentId: d.parentDocumentId,
        updatedAt: d.updatedAt,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // outline_create_document - Create a new document
  server.tool(
    'outline_create_document',
    'Create a new document in Outline',
    {
      title: z.string().describe('Document title'),
      text: z.string().optional().describe('Document content in markdown'),
      collectionId: z.string().describe('Collection ID to create document in'),
      parentDocumentId: z
        .string()
        .optional()
        .describe('Parent document ID for nested documents'),
      publish: z
        .boolean()
        .optional()
        .describe('Publish immediately (default: true)'),
    },
    async ({ title, text, collectionId, parentDocumentId, publish }) => {
      const doc = await client.createDocument({
        title,
        text,
        collectionId,
        parentDocumentId,
        publish: publish ?? true,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: doc.id,
                urlId: doc.urlId,
                title: doc.title,
                collectionId: doc.collectionId,
                createdAt: doc.createdAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_update_document - Update an existing document
  server.tool(
    'outline_update_document',
    'Update an existing document in Outline',
    {
      id: z.string().describe('Document ID to update'),
      title: z.string().optional().describe('New document title'),
      text: z.string().optional().describe('New document content in markdown'),
      append: z
        .boolean()
        .optional()
        .describe('Append text instead of replacing'),
      publish: z.boolean().optional().describe('Publish the document'),
    },
    async ({ id, title, text, append, publish }) => {
      const doc = await client.updateDocument({
        id,
        title,
        text,
        append,
        publish,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: doc.id,
                title: doc.title,
                updatedAt: doc.updatedAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_move_document - Move document to different collection/parent
  server.tool(
    'outline_move_document',
    'Move a document to a different collection or parent document',
    {
      id: z.string().describe('Document ID to move'),
      collectionId: z.string().optional().describe('Target collection ID'),
      parentDocumentId: z
        .string()
        .nullable()
        .optional()
        .describe('Target parent document ID (null for root level)'),
    },
    async ({ id, collectionId, parentDocumentId }) => {
      const docs = await client.moveDocument({
        id,
        collectionId,
        parentDocumentId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                moved: docs.length,
                documents: docs.map(d => ({
                  id: d.id,
                  title: d.title,
                  collectionId: d.collectionId,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_delete_document - Delete a document
  server.tool(
    'outline_delete_document',
    'Delete a document from Outline',
    {
      id: z.string().describe('Document ID to delete'),
      permanent: z
        .boolean()
        .optional()
        .describe('Permanently delete (default: false, moves to trash)'),
    },
    async ({ id, permanent }) => {
      await client.deleteDocument(id, permanent ?? false);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { deleted: true, id, permanent: permanent ?? false },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_archive_document - Archive a document
  server.tool(
    'outline_archive_document',
    'Archive a document (soft delete, can be restored)',
    {
      id: z.string().describe('Document ID to archive'),
    },
    async ({ id }) => {
      const doc = await client.archiveDocument(id);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                archived: true,
                id: doc.id,
                title: doc.title,
                archivedAt: doc.archivedAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_unarchive_document - Restore an archived document
  server.tool(
    'outline_unarchive_document',
    'Restore an archived document',
    {
      id: z.string().describe('Document ID to unarchive'),
    },
    async ({ id }) => {
      const doc = await client.unarchiveDocument(id);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { restored: true, id: doc.id, title: doc.title },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_list_drafts - List user's draft documents
  server.tool(
    'outline_list_drafts',
    'List all draft (unpublished) documents',
    {},
    async () => {
      const docs = await client.listDrafts();

      const formatted = docs.map(d => ({
        id: d.id,
        title: d.title,
        collectionId: d.collectionId,
        updatedAt: d.updatedAt,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // outline_export_document - Export document as markdown
  server.tool(
    'outline_export_document',
    'Export a document as clean markdown. Returns a content preview with stats. Full content is available via the outline://documents/{id} resource.',
    {
      id: z.string().describe('Document ID to export'),
    },
    async ({ id }) => {
      const markdown = await client.exportDocument(id);

      const result = {
        id,
        wordCount: wordCount(markdown),
        charCount: markdown.length,
        preview: truncate(markdown, PREVIEW_LENGTH),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // outline_get_collection - Get collection details
  server.tool(
    'outline_get_collection',
    'Get details of a specific collection',
    {
      id: z.string().describe('Collection ID'),
    },
    async ({ id }) => {
      const collection = await client.getCollection(id);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: collection.id,
                name: collection.name,
                description: collection.description,
                color: collection.color,
                permission: collection.permission,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_create_collection - Create a new collection
  server.tool(
    'outline_create_collection',
    'Create a new collection in Outline',
    {
      name: z.string().describe('Collection name'),
      description: z.string().optional().describe('Collection description'),
      color: z.string().optional().describe('Collection color (hex code)'),
      permission: z
        .enum(['read', 'read_write'])
        .optional()
        .describe('Default permission level'),
    },
    async ({ name, description, color, permission }) => {
      const collection = await client.createCollection({
        name,
        description,
        color,
        permission,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: collection.id,
                name: collection.name,
                description: collection.description,
                color: collection.color,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_update_collection - Update a collection
  server.tool(
    'outline_update_collection',
    'Update an existing collection',
    {
      id: z.string().describe('Collection ID to update'),
      name: z.string().optional().describe('New collection name'),
      description: z.string().optional().describe('New collection description'),
      color: z.string().optional().describe('New collection color (hex code)'),
      permission: z
        .enum(['read', 'read_write'])
        .optional()
        .describe('New default permission level'),
    },
    async ({ id, name, description, color, permission }) => {
      const collection = await client.updateCollection({
        id,
        name,
        description,
        color,
        permission,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: collection.id,
                name: collection.name,
                description: collection.description,
                color: collection.color,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // outline_delete_collection - Delete a collection
  server.tool(
    'outline_delete_collection',
    'Delete a collection and all its documents',
    {
      id: z.string().describe('Collection ID to delete'),
    },
    async ({ id }) => {
      await client.deleteCollection(id);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ deleted: true, id }, null, 2),
          },
        ],
      };
    }
  );
}
