import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OutlineClient } from './outline-client.js';

const PREVIEW_LENGTH = 500;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

function extractStringParam(
  params: Record<string, string | string[]>,
  key: string
): string {
  const value = params[key];
  const result = Array.isArray(value) ? value[0] : value;
  if (!result || typeof result !== 'string') {
    throw new Error(`Invalid or missing ${key} parameter`);
  }
  return result;
}

export function registerResources(
  server: McpServer,
  client: OutlineClient
): void {
  // Collections list resource
  server.registerResource(
    'collections',
    'outline://collections',
    {
      title: 'All Collections',
      description: 'List of all collections in the Outline workspace',
      mimeType: 'application/json',
    },
    async (uri: URL) => {
      const collections = await client.listCollections();

      const formatted = collections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
      }));

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // Single collection resource template
  server.registerResource(
    'collection',
    new ResourceTemplate('outline://collections/{collectionId}', {
      list: async () => {
        const collections = await client.listCollections();
        return {
          resources: collections.map(c => ({
            uri: `outline://collections/${c.id}`,
            name: c.name,
            description: c.description ?? undefined,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: 'Collection Details',
      description: 'Details and documents for a specific collection',
      mimeType: 'application/json',
    },
    async (uri: URL, params: Record<string, string | string[]>) => {
      const collectionId = extractStringParam(params, 'collectionId');
      const [collection, documents] = await Promise.all([
        client.getCollection(collectionId),
        client.listDocuments({ collectionId }),
      ]);

      const formatted = {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        documents: documents.map(d => ({
          id: d.id,
          title: d.title,
          updatedAt: d.updatedAt,
        })),
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    }
  );

  // Document resource template
  server.registerResource(
    'document',
    new ResourceTemplate('outline://documents/{documentId}', {
      list: async () => {
        const documents = await client.listDocuments();
        return {
          resources: documents.map(d => ({
            uri: `outline://documents/${d.id}`,
            name: d.title,
            description: `Updated: ${d.updatedAt}`,
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Document Content',
      description: 'Full content of a specific document in markdown',
      mimeType: 'text/markdown',
    },
    async (uri: URL, params: Record<string, string | string[]>) => {
      const documentId = extractStringParam(params, 'documentId');
      const doc = await client.getDocument(documentId);

      const summary = [
        `# ${doc.title}`,
        '',
        `**ID:** ${doc.id}`,
        `**Updated:** ${doc.updatedAt}`,
        `**Words:** ${doc.text.split(/\s+/).filter(Boolean).length}`,
        '',
        '## Preview',
        '',
        truncate(doc.text, PREVIEW_LENGTH),
      ].join('\n');

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: summary,
          },
        ],
      };
    }
  );
}
