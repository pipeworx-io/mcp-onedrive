interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OneDrive (Microsoft Graph) MCP Pack
 *
 * Requires OAuth connection — gateway injects credentials via _context.microsoft.
 * The OAuth provider is named "microsoft", so creds arrive under _context.microsoft.accessToken.
 * Tools: list files, search files, get file metadata, read text content, list shared, get drive profile.
 * All operations are read-only GETs against Microsoft Graph v1.0.
 */


interface OneDriveContext {
  microsoft?: { accessToken: string };
}

const API = 'https://graph.microsoft.com/v1.0';

const CONTENT_CAP = 100_000;

/**
 * Fetch JSON from Microsoft Graph. Returns a connection_required marker when no
 * OAuth token is present, and a structured { error, message } object on non-2xx.
 */
async function gFetch(ctx: OneDriveContext, url: string, options: RequestInit = {}): Promise<unknown> {
  if (!ctx.microsoft) {
    return { error: 'connection_required', message: 'Connect your Microsoft account at https://pipeworx.io/account' };
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${ctx.microsoft.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

/** Like gFetch but returns raw text (follows the /content redirect to the download URL). */
async function gFetchText(ctx: OneDriveContext, url: string): Promise<unknown> {
  if (!ctx.microsoft) {
    return { error: 'connection_required', message: 'Connect your Microsoft account at https://pipeworx.io/account' };
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.microsoft.accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  const body = await res.text();
  if (body.length > CONTENT_CAP) {
    return { content: body.slice(0, CONTENT_CAP), truncated: true, note: `Content truncated to ${CONTENT_CAP} characters.` };
  }
  return { content: body, truncated: false };
}

interface DriveItem {
  id?: string;
  name?: string;
  size?: number;
  folder?: unknown;
  lastModifiedDateTime?: string;
  webUrl?: string;
}

function mapItem(item: DriveItem) {
  return {
    id: item.id,
    name: item.name,
    size: item.size,
    isFolder: !!item.folder,
    lastModifiedDateTime: item.lastModifiedDateTime,
    webUrl: item.webUrl,
  };
}

/** Encode a folder path while preserving slashes (Graph addresses nested folders with / segments). */
function encodePath(path: string): string {
  return path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
}

const SELECT = 'id,name,size,folder,file,lastModifiedDateTime,webUrl';

const tools: McpToolExport['tools'] = [
  {
    name: 'onedrive_list_files',
    description:
      'List files and folders in a OneDrive (Microsoft 365) folder. Pass a folder path relative to the drive root (e.g. "Documents" or "Documents/Reports"); omit to list the root. Returns each item\'s id, name, size, whether it is a folder, last-modified time, and web URL. Use to browse a user\'s OneDrive documents.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Folder path relative to the OneDrive root, e.g. "Documents" or "Documents/Reports". Omit or leave empty for the root folder.' },
        top: { type: 'number', description: 'Maximum number of items to return (default 50, max 200).' },
      },
      required: [],
    },
  },
  {
    name: 'onedrive_search_files',
    description:
      'Search a user\'s OneDrive (Microsoft 365) for files and folders matching a query string across file names and content. Returns matching items with id, name, size, folder flag, last-modified time, and web URL. Use to find documents by keyword.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text search query matched against OneDrive file names and content.' },
        top: { type: 'number', description: 'Maximum number of results to return (default 25).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'onedrive_get_file',
    description:
      'Get full metadata for a single OneDrive (Microsoft 365) file or folder by its item id. Returns id, name, size, folder/file info, created and last-modified times, web URL, and parent reference. Use after listing or searching to inspect one document.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The OneDrive drive-item id of the file or folder.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'onedrive_get_file_content',
    description:
      'Download and return the text content of a OneDrive (Microsoft 365) file by its item id. Best for plain-text, Markdown, and CSV files; binary formats (Office docs, PDFs, images) will return unreadable bytes. Content is capped at ~100,000 characters and flagged when truncated.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The OneDrive drive-item id of the file to read.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'onedrive_list_shared',
    description:
      'List files and folders that have been shared with the user in OneDrive / Microsoft 365 ("Shared with me"). Returns each item\'s name, web URL, and who shared it. Use to find documents shared by colleagues.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        top: { type: 'number', description: 'Maximum number of shared items to return (default 25).' },
      },
      required: [],
    },
  },
  {
    name: 'onedrive_get_profile',
    description:
      'Get the user\'s OneDrive (Microsoft 365) drive profile: drive type, storage quota used and total (in bytes), and the owner display name. Use to report storage usage or confirm the connected account.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const context = (args._context ?? {}) as OneDriveContext;
  delete args._context;

  switch (name) {
    case 'onedrive_list_files': {
      const top = Math.min(200, Math.max(1, (args.top as number) ?? 50));
      const path = ((args.path as string) ?? '').trim().replace(/^\/+|\/+$/g, '');
      const url = path
        ? `${API}/me/drive/root:/${encodePath(path)}:/children?$top=${top}&$select=${SELECT}`
        : `${API}/me/drive/root/children?$top=${top}&$select=${SELECT}`;
      const result = await gFetch(context, url);
      if (result && typeof result === 'object' && 'error' in result) return result;
      const value = (result as { value?: DriveItem[] }).value ?? [];
      return value.map(mapItem);
    }
    case 'onedrive_search_files': {
      const top = Math.min(200, Math.max(1, (args.top as number) ?? 25));
      const raw = (args.query as string) ?? '';
      const query = encodeURIComponent(raw.replace(/'/g, "''"));
      const url = `${API}/me/drive/root/search(q='${query}')?$top=${top}&$select=${SELECT}`;
      const result = await gFetch(context, url);
      if (result && typeof result === 'object' && 'error' in result) return result;
      const value = (result as { value?: DriveItem[] }).value ?? [];
      return value.map(mapItem);
    }
    case 'onedrive_get_file': {
      const id = encodeURIComponent(args.id as string);
      const url = `${API}/me/drive/items/${id}?$select=id,name,size,folder,file,lastModifiedDateTime,webUrl,createdDateTime,parentReference`;
      return gFetch(context, url);
    }
    case 'onedrive_get_file_content': {
      const id = encodeURIComponent(args.id as string);
      const url = `${API}/me/drive/items/${id}/content`;
      return gFetchText(context, url);
    }
    case 'onedrive_list_shared': {
      const top = Math.min(200, Math.max(1, (args.top as number) ?? 25));
      const url = `${API}/me/drive/sharedWithMe?$top=${top}`;
      const result = await gFetch(context, url);
      if (result && typeof result === 'object' && 'error' in result) return result;
      const value = (result as { value?: Array<{ name?: string; webUrl?: string; remoteItem?: { shared?: { owner?: { user?: { displayName?: string } } } } }> }).value ?? [];
      return value.map((item) => ({
        name: item.name,
        webUrl: item.webUrl,
        sharedBy: item.remoteItem?.shared?.owner?.user?.displayName ?? null,
      }));
    }
    case 'onedrive_get_profile': {
      const url = `${API}/me/drive?$select=id,driveType,owner,quota`;
      const result = await gFetch(context, url);
      if (result && typeof result === 'object' && 'error' in result) return result;
      const drive = result as {
        driveType?: string;
        quota?: { used?: number; total?: number };
        owner?: { user?: { displayName?: string } };
      };
      return {
        driveType: drive.driveType,
        quotaUsed: drive.quota?.used,
        quotaTotal: drive.quota?.total,
        owner: drive.owner?.user?.displayName,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 }, provider: 'microsoft' } satisfies McpToolExport;
