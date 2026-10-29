# mcp-onedrive

OneDrive (Microsoft Graph) MCP Pack

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1856+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/onedrive/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1856+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

This pack runs against a connected microsoft account, so it needs a Pipeworx key: sign in at https://pipeworx.io/account, connect microsoft, then call `POST https://gateway.pipeworx.io/v1/tools/onedrive_list_files` with `Authorization: Bearer <your Pipeworx key>`. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/onedrive_list_files`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-onedrive` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/onedrive/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "onedrive": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-onedrive"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Onedrive data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
