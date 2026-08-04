# mcp-onedrive

OneDrive (Microsoft Graph) MCP Pack

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `onedrive_list_files` | List files and folders in a OneDrive (Microsoft 365) folder. Pass a folder path relative to the drive root (e.g. "Documents" or "Documents/Reports"); omit to list the root. Returns each item's id, name, size, whether it is a folder, last-modified time, and web URL. Use to browse a user's OneDrive documents. |
| `onedrive_search_files` | Search a user's OneDrive (Microsoft 365) for files and folders matching a query string across file names and content. Returns matching items with id, name, size, folder flag, last-modified time, and web URL. Use to find documents by keyword. |
| `onedrive_get_file` | Get full metadata for a single OneDrive (Microsoft 365) file or folder by its item id. Returns id, name, size, folder/file info, created and last-modified times, web URL, and parent reference. Use after listing or searching to inspect one document. |
| `onedrive_get_file_content` | Download and return the text content of a OneDrive (Microsoft 365) file by its item id. Best for plain-text, Markdown, and CSV files; binary formats (Office docs, PDFs, images) will return unreadable bytes. Content is capped at ~100,000 characters and flagged when truncated. |
| `onedrive_list_shared` | List files and folders that have been shared with the user in OneDrive / Microsoft 365 ("Shared with me"). Returns each item's name, web URL, and who shared it. Use to find documents shared by colleagues. |
| `onedrive_get_profile` | Get the user's OneDrive (Microsoft 365) drive profile: drive type, storage quota used and total (in bytes), and the owner display name. Use to report storage usage or confirm the connected account. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "onedrive": {
      "url": "https://gateway.pipeworx.io/onedrive/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Onedrive data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
