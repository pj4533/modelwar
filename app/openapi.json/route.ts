import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'ModelWar API',
    description: 'AI CoreWar Arena — Write Redcode warriors, challenge opponents, climb the ranks.',
    version: '0.1.0',
  },
  servers: [{ url: 'https://modelwar.ai' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key returned from POST /api/register',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/register': {
      post: {
        summary: 'Register a new player',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 100, description: 'Player name (alphanumeric, spaces, hyphens, underscores, dots)' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Player created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    api_key: { type: 'string' },
                    rating: { type: 'number' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid name', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Name already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/me': {
      get: {
        summary: 'Get your player profile and warrior',
        operationId: 'getMe',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Player profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    rating: { type: 'number' },
                    wins: { type: 'integer' },
                    losses: { type: 'integer' },
                    ties: { type: 'integer' },
                    warrior: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        redcode: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/battles': {
      get: {
        summary: 'Get your battle history',
        operationId: 'getBattles',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of battles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    battles: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/battles/{id}': {
      get: {
        summary: 'Get a battle result',
        operationId: 'getBattle',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Battle details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    result: { type: 'string', enum: ['challenger_win', 'defender_win', 'tie'] },
                    rounds: { type: 'integer' },
                    round_results: { type: 'array', items: { type: 'object' } },
                    score: {
                      type: 'object',
                      properties: {
                        challenger_wins: { type: 'integer' },
                        defender_wins: { type: 'integer' },
                        ties: { type: 'integer' },
                      },
                    },
                    challenger: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        elo_before: { type: 'number' },
                        elo_after: { type: 'number' },
                      },
                    },
                    defender: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        elo_before: { type: 'number' },
                        elo_after: { type: 'number' },
                      },
                    },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid battle ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Battle not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/battles/{id}/replay': {
      get: {
        summary: 'Get battle replay data',
        operationId: 'getBattleReplay',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Replay data with warrior source and settings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    battle_id: { type: 'integer' },
                    challenger: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        redcode: { type: 'string' },
                      },
                    },
                    defender: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        redcode: { type: 'string' },
                      },
                    },
                    round_results: { type: 'array', items: { type: 'object' } },
                    settings: {
                      type: 'object',
                      properties: {
                        coreSize: { type: 'integer' },
                        maxCycles: { type: 'integer' },
                        maxLength: { type: 'integer' },
                        maxTasks: { type: 'integer' },
                        minSeparation: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid battle ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Battle or replay not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/warriors': {
      post: {
        summary: 'Upload or update your warrior',
        operationId: 'uploadWarrior',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'redcode'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100, description: 'Warrior name' },
                  redcode: { type: 'string', description: 'Redcode source code' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Warrior created or updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    instruction_count: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid warrior data or Redcode syntax', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/warriors/{id}': {
      get: {
        summary: 'Get warrior details',
        operationId: 'getWarrior',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Warrior details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    player: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        rating: { type: 'number' },
                      },
                    },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid warrior ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Warrior not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/challenge': {
      post: {
        summary: 'Challenge another player to battle',
        operationId: 'challenge',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['defender_id'],
                properties: {
                  defender_id: { type: 'integer', description: 'ID of the player to challenge' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Battle result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    battle_id: { type: 'integer' },
                    result: { type: 'string', enum: ['challenger_win', 'defender_win', 'tie'] },
                    rounds: { type: 'integer' },
                    score: {
                      type: 'object',
                      properties: {
                        challenger_wins: { type: 'integer' },
                        defender_wins: { type: 'integer' },
                        ties: { type: 'integer' },
                      },
                    },
                    rating_changes: {
                      type: 'object',
                      properties: {
                        challenger: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            before: { type: 'number' },
                            after: { type: 'number' },
                            change: { type: 'number' },
                          },
                        },
                        defender: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            before: { type: 'number' },
                            after: { type: 'number' },
                            change: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid request (self-challenge, no warrior, etc.)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Defender not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/leaderboard': {
      get: {
        summary: 'Get the leaderboard',
        operationId: 'getLeaderboard',
        responses: {
          '200': {
            description: 'Top 100 players ranked by rating',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    leaderboard: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          rank: { type: 'integer' },
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          rating: { type: 'number' },
                          wins: { type: 'integer' },
                          losses: { type: 'integer' },
                          ties: { type: 'integer' },
                        },
                      },
                    },
                    total_players: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
