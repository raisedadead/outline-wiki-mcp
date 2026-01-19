# Outline Wiki MCP Server

[![npm version](https://img.shields.io/npm/v/outline-wiki-mcp)](https://www.npmjs.com/package/outline-wiki-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Outline](https://www.getoutline.com/) wiki
integration. Enables LLM applications to search, read, create, and manage wiki documents through a standardized
interface.

## Features

- **Full-text Search** - Find documents across your entire wiki
- **Document Management** - Create, read, update, delete, and move documents
- **Collection Organization** - Browse and manage document collections
- **Archive & Restore** - Soft-delete with archive/restore functionality
- **Draft Access** - Work with unpublished drafts
- **Markdown Export** - Export documents as clean markdown
- **MCP Resources** - Browse collections and documents via resource URIs

## Installation

```bash
npx outline-wiki-mcp
```

Or install globally:

```bash
npm install -g outline-wiki-mcp
```

## Configuration

### Environment Variables

| Variable           | Required | Description                                      |
| ------------------ | -------- | ------------------------------------------------ |
| `OUTLINE_BASE_URL` | Yes      | Your Outline instance URL                        |
| `OUTLINE_API_KEY`  | Yes      | API key from Outline settings (starts `ol_api_`) |

### Getting an API Key

1. Open Outline > **Settings** > **API**
2. Click **Create API Key**
3. Copy the key (starts with `ol_api_`)

### Config File (Alternative)

Use a JSON config file with the `--config` flag:

```json
{
  "baseUrl": "https://your-instance.getoutline.com",
  "apiKey": "ol_api_xxx"
}
```

## Client Setup

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your `claude_desktop_config.json`:

**Using npx:**

```json
{
  "mcpServers": {
    "outline": {
      "command": "npx",
      "args": ["-y", "outline-wiki-mcp"],
      "env": {
        "OUTLINE_BASE_URL": "https://your-instance.getoutline.com",
        "OUTLINE_API_KEY": "ol_api_xxx"
      }
    }
  }
}
```

**Using Docker:**

```json
{
  "mcpServers": {
    "outline": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "OUTLINE_BASE_URL=https://your-instance.getoutline.com",
        "-e",
        "OUTLINE_API_KEY=ol_api_xxx",
        "ghcr.io/raisedadead/outline-wiki-mcp"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

```bash
claude mcp add outline \
  -e OUTLINE_BASE_URL=https://your-instance.getoutline.com \
  -e OUTLINE_API_KEY=ol_api_xxx \
  -s user \
  -- npx -y outline-wiki-mcp
```

Verify with `/mcp` after restarting.

</details>

<details>
<summary><strong>VS Code (Copilot/Continue)</strong></summary>

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "outline": {
      "command": "npx",
      "args": ["-y", "outline-wiki-mcp"],
      "env": {
        "OUTLINE_BASE_URL": "https://your-instance.getoutline.com",
        "OUTLINE_API_KEY": "ol_api_xxx"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP Clients</strong></summary>

This server uses stdio transport. Configure your MCP client to run:

```bash
OUTLINE_BASE_URL=https://your-instance.getoutline.com \
OUTLINE_API_KEY=ol_api_xxx \
npx outline-wiki-mcp
```

Or with a config file:

```bash
npx outline-wiki-mcp --config /path/to/config.json
```

</details>

## Tools

### Document Operations

| Tool                         | Description                             |
| ---------------------------- | --------------------------------------- |
| `outline_search`             | Full-text search across all documents   |
| `outline_get_document`       | Retrieve document content by ID         |
| `outline_list_documents`     | List documents in a collection          |
| `outline_create_document`    | Create a new document                   |
| `outline_update_document`    | Update an existing document             |
| `outline_move_document`      | Move document to a different collection |
| `outline_delete_document`    | Permanently delete a document           |
| `outline_archive_document`   | Archive a document (soft delete)        |
| `outline_unarchive_document` | Restore an archived document            |
| `outline_list_drafts`        | List all unpublished drafts             |
| `outline_export_document`    | Export document as clean markdown       |

### Collection Operations

| Tool                        | Description                  |
| --------------------------- | ---------------------------- |
| `outline_list_collections`  | List all collections         |
| `outline_get_collection`    | Get collection details by ID |
| `outline_create_collection` | Create a new collection      |
| `outline_update_collection` | Update collection properties |
| `outline_delete_collection` | Delete a collection          |

## Resources

Browse your wiki structure using resource URIs:

| URI Pattern                  | Description                       |
| ---------------------------- | --------------------------------- |
| `outline://collections`      | List all collections              |
| `outline://collections/{id}` | Collection details with documents |
| `outline://documents/{id}`   | Document content in markdown      |

## Development

```bash
pnpm install        # Install dependencies
pnpm build          # Compile TypeScript
pnpm dev            # Watch mode
pnpm test           # Run tests
pnpm lint           # Type-check
```

### Local Testing

```bash
OUTLINE_BASE_URL=https://your-instance.getoutline.com \
OUTLINE_API_KEY=ol_api_xxx \
node dist/index.js
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing guidelines, and commit
conventions.

## License

MIT - see [LICENSE](LICENSE)

## Links

- [Outline](https://www.getoutline.com/) - Knowledge base for teams
- [Outline API](https://www.getoutline.com/developers) - API reference
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Reference implementations
