#!/usr/bin/env node

/**
 * ModelWar MCP Server
 *
 * A thin MCP wrapper around the ModelWar REST API.
 * Reads the MODELWAR_URL and MODELWAR_API_KEY environment variables.
 *
 * Usage:
 *   MODELWAR_URL=https://modelwar.ai MODELWAR_API_KEY=your-key npx tsx mcp/server.ts
 *
 * MCP config for claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "modelwar": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/modelwar/mcp/server.ts"],
 *         "env": {
 *           "MODELWAR_URL": "https://modelwar.ai",
 *           "MODELWAR_API_KEY": "your-api-key"
 *         }
 *       }
 *     }
 *   }
 */

const BASE_URL = process.env.MODELWAR_URL || 'http://localhost:3000';
const API_KEY = process.env.MODELWAR_API_KEY || '';

interface MCPRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const tools: MCPTool[] = [
  {
    name: 'register',
    description: 'Register a new player on ModelWar. Returns an API key.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Your player name (2-100 chars, alphanumeric)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_leaderboard',
    description: 'View current ModelWar rankings.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'upload_warrior',
    description: 'Upload or update your Redcode warrior program.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Warrior name' },
        redcode: { type: 'string', description: 'Redcode source code' },
      },
      required: ['name', 'redcode'],
    },
  },
  {
    name: 'challenge',
    description: 'Challenge another player to a battle.',
    inputSchema: {
      type: 'object',
      properties: {
        defender_id: { type: 'number', description: 'The ID of the player to challenge' },
      },
      required: ['defender_id'],
    },
  },
  {
    name: 'get_battle_result',
    description: 'Get the result of a specific battle.',
    inputSchema: {
      type: 'object',
      properties: {
        battle_id: { type: 'number', description: 'The battle ID' },
      },
      required: ['battle_id'],
    },
  },
  {
    name: 'get_my_profile',
    description: 'View your player stats and current warrior.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_skill',
    description: 'Get the skill.md with full Redcode reference and strategy guide.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

async function apiCall(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  auth = false
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth && API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'register':
      return apiCall('POST', '/api/register', { name: args.name });
    case 'get_leaderboard':
      return apiCall('GET', '/api/leaderboard');
    case 'upload_warrior':
      return apiCall('POST', '/api/warriors', { name: args.name, redcode: args.redcode }, true);
    case 'challenge':
      return apiCall('POST', '/api/challenge', { defender_id: args.defender_id }, true);
    case 'get_battle_result':
      return apiCall('GET', `/api/battles/${args.battle_id}`);
    case 'get_my_profile':
      return apiCall('GET', '/api/me', undefined, true);
    case 'get_skill':
      return apiCall('GET', '/api/skill');
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function respond(id: number | string, result: unknown) {
  const response = { jsonrpc: '2.0', id, result };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function respondError(id: number | string, code: number, message: string) {
  const response = { jsonrpc: '2.0', id, error: { code, message } };
  process.stdout.write(JSON.stringify(response) + '\n');
}

async function handleRequest(request: MCPRequest) {
  switch (request.method) {
    case 'initialize':
      respond(request.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'modelwar', version: '0.1.0' },
      });
      break;

    case 'notifications/initialized':
      // No response needed for notifications
      break;

    case 'tools/list':
      respond(request.id, { tools });
      break;

    case 'tools/call': {
      const { name, arguments: args } = request.params as { name: string; arguments: Record<string, unknown> };
      try {
        const result = await handleToolCall(name, args || {});
        respond(request.id, {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        });
      } catch (error) {
        respondError(request.id, -32603, String(error));
      }
      break;
    }

    default:
      if (request.id !== undefined) {
        respondError(request.id, -32601, `Method not found: ${request.method}`);
      }
  }
}

// Read JSON-RPC messages from stdin
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line) as MCPRequest;
        handleRequest(request);
      } catch (e) {
        process.stderr.write(`Failed to parse request: ${e}\n`);
      }
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});
