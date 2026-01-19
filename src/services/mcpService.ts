/**
 * MCP Server Service
 * Handles MCP (Model Context Protocol) Server management
 */

import { apiClient } from '../../services/apiClient';

// ============================================================================
// Types
// ============================================================================

export interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpServerFormData {
  serverType: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface McpServerStatus {
  serverId: string;
  running: boolean;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
  error?: string;
}

export interface McpServerDetail {
  id: string;
  serverType: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

// ============================================================================
// Server Operations
// ============================================================================

/**
 * Get all MCP servers
 */
export async function getMcpServers(): Promise<McpServerDetail[]> {
  return apiClient.getMcpServers();
}

/**
 * Get a specific MCP server by ID
 */
export async function getMcpServer(id: string): Promise<McpServerDetail | null> {
  return apiClient.getMcpServer(id);
}

/**
 * Create a new MCP server
 */
export async function createMcpServer(data: McpServerFormData): Promise<McpServerDetail> {
  return apiClient.createMcpServer(
    data.serverType,
    data.command,
    data.args,
    data.env
  );
}

/**
 * Update an existing MCP server
 */
export async function updateMcpServer(
  id: string,
  updates: Partial<McpServerFormData>
): Promise<McpServerDetail> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.command !== undefined) apiUpdates.command = updates.command;
  if (updates.args !== undefined) apiUpdates.args = updates.args;
  if (updates.env !== undefined) apiUpdates.env = updates.env;
  
  return apiClient.updateMcpServer(id, apiUpdates);
}

/**
 * Delete an MCP server
 */
export async function deleteMcpServer(id: string): Promise<boolean> {
  return apiClient.deleteMcpServer(id);
}

// ============================================================================
// Server Lifecycle
// ============================================================================

/**
 * Start an MCP server
 */
export async function startMcpServer(id: string): Promise<McpServerStatus> {
  return apiClient.startMcpServer(id);
}

/**
 * Stop an MCP server
 */
export async function stopMcpServer(id: string): Promise<boolean> {
  return apiClient.stopMcpServer(id);
}

/**
 * Restart an MCP server
 */
export async function restartMcpServer(id: string): Promise<McpServerStatus> {
  // Stop first
  await stopMcpServer(id);
  // Then start
  return startMcpServer(id);
}

// ============================================================================
// Tool Operations
// ============================================================================

/**
 * Get available tools from an MCP server
 */
export async function getMcpServerTools(id: string): Promise<McpTool[]> {
  return apiClient.getMcpServerTools(id);
}

/**
 * Test MCP server connection
 */
export async function testMcpConnection(id: string): Promise<boolean> {
  return apiClient.testMcpServerConnection(id);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get server type options
 */
export function getServerTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'stdio', label: 'STDIO (Command Line)' },
    { value: 'sse', label: 'SSE (Server-Sent Events)' },
    { value: 'websocket', label: 'WebSocket' },
  ];
}

/**
 * Validate server form data
 */
export function validateServerForm(data: McpServerFormData): string[] {
  const errors: string[] = [];
  
  if (!data.serverType.trim()) {
    errors.push('Server type is required');
  }
  
  if (!data.command.trim()) {
    errors.push('Command is required');
  }
  
  return errors;
}

/**
 * Parse command string into command and args
 */
export function parseCommandString(commandString: string): {
  command: string;
  args: string[];
} {
  // Handle quoted arguments
  const parts = commandString.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  
  if (parts.length === 0) {
    return { command: '', args: [] };
  }
  
  return {
    command: parts[0],
    args: parts.slice(1).map(arg => arg.replace(/^["']|["']$/g, '')),
  };
}

/**
 * Format command and args into a single string
 */
export function formatCommandString(command: string, args: string[]): string {
  const escapedArgs = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  });
  
  return [command, ...escapedArgs].join(' ');
}

/**
 * Get server status display
 */
export function getServerStatusDisplay(server: McpServerDetail & { running?: boolean }): {
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  if (server.running) {
    return { label: 'Running', color: 'green' };
  }
  return { label: 'Stopped', color: 'gray' };
}

/**
 * Estimate environment variable security
 */
export function getEnvSecurityLevel(env: Record<string, string>): 'safe' | 'warning' | 'danger' {
  const sensitiveKeys = ['api_key', 'apikey', 'api-key', 'secret', 'password', 'token', 'auth'];
  
  const hasSensitive = Object.keys(env).some(key =>
    sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
  );
  
  if (hasSensitive) {
    return 'danger';
  }
  
  // Check if any values might contain secrets
  const hasValueSecrets = Object.values(env).some(value =>
    value.length > 20 && !value.includes(' ')
  );
  
  return hasValueSecrets ? 'warning' : 'safe';
}

/**
 * Get common MCP server templates
 */
export function getServerTemplates(): Array<{
  name: string;
  description: string;
  serverType: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}> {
  return [
    {
      name: 'Filesystem',
      description: 'Read, write, and edit files',
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/directory'],
      env: {},
    },
    {
      name: 'Git',
      description: 'Work with Git repositories',
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      env: {},
    },
    {
      name: 'Memory',
      description: 'Persistent memory storage',
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {},
    },
    {
      name: 'PostgreSQL',
      description: 'Database operations',
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: '',
      },
    },
    {
      name: 'Puppeteer',
      description: 'Browser automation',
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      env: {},
    },
  ];
}
