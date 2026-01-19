# outline-wiki-mcp

[![npm version](https://img.shields.io/npm/v/outline-wiki-mcp)](https://www.npmjs.com/package/outline-wiki-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An MCP server that connects Claude to your [Outline](https://www.getoutline.com/) wiki. Search, read, create, and manage
documents directly from Claude Code or any MCP-compatible client.

## Features

- **Full-text Search** - Find documents across your entire wiki instantly
- **Document Management** - Create, read, update, and delete documents
- **Collection Organization** - Browse and manage document collections
- **Archive Support** - Soft-delete with archive/restore functionality
- **Draft Access** - Work with unpublished drafts
- **Markdown Export** - Get clean markdown exports of any document
- **MCP Resources** - Browse collections and documents via resource URIs

---

## Installation

```bash
npx -y outline-wiki-mcp
```

Or install globally:

```bash
npm install -g outline-wiki-mcp
```

## Quick Start

### 1. Get your Outline API key

1. Open Outline > **Settings** > **API**
2. Click **Create API Key**
3. Copy the key (starts with `ol_api_`)

### 2. Add to Claude Code

```bash
claude mcp add outline \
  -e OUTLINE_BASE_URL=https://your-instance.getoutline.com \
  -e OUTLINE_API_KEY=ol_api_xxx \
  -s user \
  -- npx -y outline-wiki-mcp
```

### 3. Verify the connection

Restart Claude Code and run `/mcp` to see the available tools.

## Configuration

| Environment Variable | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `OUTLINE_BASE_URL`   | Yes      | Your Outline instance URL                        |
| `OUTLINE_API_KEY`    | Yes      | API key from Outline settings (starts `ol_api_`) |

You can also use a JSON config file with the `--config` flag:

```json
{
  "baseUrl": "https://your-instance.getoutline.com",
  "apiKey": "ol_api_xxx"
}
```

## Available Tools

### Documents

| Tool                         | Description                             |
| ---------------------------- | --------------------------------------- |
| `outline_search`             | Full-text search across all documents   |
| `outline_get_document`       | Retrieve document content by ID         |
| `outline_list_documents`     | List all documents in a collection      |
| `outline_create_document`    | Create a new document                   |
| `outline_update_document`    | Update an existing document             |
| `outline_move_document`      | Move document to a different collection |
| `outline_delete_document`    | Permanently delete a document           |
| `outline_archive_document`   | Archive a document (soft delete)        |
| `outline_unarchive_document` | Restore an archived document            |
| `outline_list_drafts`        | List all unpublished drafts             |
| `outline_export_document`    | Export document as clean markdown       |

### Collections

| Tool                        | Description                  |
| --------------------------- | ---------------------------- |
| `outline_list_collections`  | List all collections         |
| `outline_get_collection`    | Get collection details by ID |
| `outline_create_collection` | Create a new collection      |
| `outline_update_collection` | Update collection properties |
| `outline_delete_collection` | Delete a collection          |

## MCP Resources

Browse your wiki structure using resource URIs:

| URI Pattern                  | Description                       |
| ---------------------------- | --------------------------------- |
| `outline://collections`      | List all collections              |
| `outline://collections/{id}` | Collection details with documents |
| `outline://documents/{id}`   | Document content in markdown      |

## Example Usage

Once configured, you can interact with your Outline wiki directly in Claude:

- "Search my wiki for authentication docs"
- "Create a new document in the Engineering collection"
- "Show me all my drafts"
- "Archive the old meeting notes"
- "Export the API documentation as markdown"

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Testing guidelines
- Commit conventions
- Release process

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Links

- [Outline](https://www.getoutline.com/) - The knowledge base for teams
- [Outline API Documentation](https://www.getoutline.com/developers) - API reference
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Code](https://claude.ai/code) - AI coding assistant

## Support

- [Issues](https://github.com/raisedadead/outline-wiki-mcp/issues) - Bug reports and feature requests
- [Discussions](https://github.com/raisedadead/outline-wiki-mcp/discussions) - Questions and ideas
