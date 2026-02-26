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
                    arena_warrior: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        name: { type: 'string' },
                        redcode: { type: 'string' },
                        auto_join: { type: 'boolean' },
                        updated_at: { type: 'string', format: 'date-time' },
                      },
                    },
                    arena_rating: { type: 'number' },
                    arena_wins: { type: 'integer' },
                    arena_losses: { type: 'integer' },
                    arena_ties: { type: 'integer' },
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
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Page number (returns paginated response when provided)' },
          { name: 'per_page', in: 'query', required: false, schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page (returns paginated response when provided)' },
        ],
        responses: {
          '200': {
            description: 'List of battles. When page/per_page params are provided, includes pagination metadata.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    battles: { type: 'array', items: { type: 'object' } },
                    pagination: {
                      type: 'object',
                      nullable: true,
                      description: 'Present only when page or per_page query params are provided',
                      properties: {
                        page: { type: 'integer' },
                        per_page: { type: 'integer' },
                        total: { type: 'integer' },
                        total_pages: { type: 'integer' },
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
    '/api/players/{id}': {
      get: {
        summary: 'Get a player\'s public profile',
        operationId: 'getPlayer',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Player profile with warrior and battle history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    rating: { type: 'number', description: 'Conservative rating estimate' },
                    provisional: { type: 'boolean' },
                    wins: { type: 'integer' },
                    losses: { type: 'integer' },
                    ties: { type: 'integer' },
                    win_rate: { type: 'integer', description: 'Win percentage (0-100)' },
                    rating_history: { type: 'array', items: { type: 'number' }, description: 'Rating after each battle' },
                    warrior: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        name: { type: 'string' },
                        redcode: { type: 'string' },
                        updated_at: { type: 'string', format: 'date-time' },
                      },
                    },
                    recent_battles: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          opponent: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer' },
                              name: { type: 'string' },
                            },
                          },
                          result: { type: 'string', enum: ['win', 'loss', 'tie'] },
                          score: { type: 'string', description: 'Format: challenger_wins-defender_wins-ties' },
                          rating_change: { type: 'integer' },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid player ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Player not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
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
            description: 'Battle details including warrior Redcodes',
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
                        rd_before: { type: 'number', nullable: true },
                        rd_after: { type: 'number', nullable: true },
                        redcode: { type: 'string', nullable: true },
                      },
                    },
                    defender: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        elo_before: { type: 'number' },
                        elo_after: { type: 'number' },
                        rd_before: { type: 'number', nullable: true },
                        rd_after: { type: 'number', nullable: true },
                        redcode: { type: 'string', nullable: true },
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
                        maxLength: { type: 'integer', description: 'Maximum warrior length in instructions (CORESIZE/2 - MINSEPARATION)' },
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
        summary: 'Get warrior details including Redcode source',
        operationId: 'getWarrior',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Warrior details with Redcode source',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    redcode: { type: 'string', description: 'Redcode source code' },
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
    '/api/players/{id}/battles': {
      get: {
        summary: 'Get paginated battle history for a player',
        operationId: 'getPlayerBattles',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Player ID' },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'per_page', in: 'query', required: false, schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page (max 100)' },
        ],
        responses: {
          '200': {
            description: 'Paginated list of battles for the player',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    battles: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          opponent: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer' },
                              name: { type: 'string' },
                            },
                          },
                          result: { type: 'string', enum: ['win', 'loss', 'tie'] },
                          score: { type: 'string', description: 'Format: challenger_wins-defender_wins-ties' },
                          rating_change: { type: 'integer' },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        per_page: { type: 'integer' },
                        total: { type: 'integer' },
                        total_pages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid player ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Player not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/arena/warrior': {
      post: {
        summary: 'Upload or update your arena warrior',
        operationId: 'uploadArenaWarrior',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'redcode'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100, description: 'Arena warrior name' },
                  redcode: { type: 'string', description: 'Redcode source code (max 100 instructions)' },
                  auto_join: { type: 'boolean', default: false, description: 'Opt into automatic arena participation' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Arena warrior created or updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    redcode: { type: 'string' },
                    auto_join: { type: 'boolean' },
                    instruction_count: { type: 'integer' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid warrior data or Redcode syntax', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'Maintenance mode', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/arena/start': {
      post: {
        summary: 'Start an arena battle instantly',
        operationId: 'startArena',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Arena results (synchronous)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    arena_id: { type: 'integer' },
                    placements: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          slot_index: { type: 'integer' },
                          player_id: { type: 'integer', nullable: true },
                          name: { type: 'string' },
                          is_stock_bot: { type: 'boolean' },
                          placement: { type: 'integer' },
                          total_score: { type: 'integer' },
                          rating_before: { type: 'number', nullable: true },
                          rating_after: { type: 'number', nullable: true },
                          rating_change: { type: 'number', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'No arena warrior uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '503': { description: 'Maintenance mode', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/arena-leaderboard': {
      get: {
        summary: 'Get the arena leaderboard',
        operationId: 'getArenaLeaderboard',
        responses: {
          '200': {
            description: 'Top arena players ranked by arena rating',
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
                          arena_wins: { type: 'integer' },
                          arena_losses: { type: 'integer' },
                          arena_ties: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/arenas/{id}': {
      get: {
        summary: 'Get an arena result',
        operationId: 'getArena',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Arena details with participants and placements',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    session_id: { type: 'string', format: 'uuid' },
                    seed: { type: 'integer' },
                    total_rounds: { type: 'integer' },
                    status: { type: 'string' },
                    participants: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          slot_index: { type: 'integer' },
                          player_id: { type: 'integer', nullable: true },
                          name: { type: 'string' },
                          is_stock_bot: { type: 'boolean' },
                          placement: { type: 'integer' },
                          total_score: { type: 'integer' },
                          rating_before: { type: 'number', nullable: true },
                          rating_after: { type: 'number', nullable: true },
                          rating_change: { type: 'number', nullable: true },
                        },
                      },
                    },
                    started_at: { type: 'string', format: 'date-time' },
                    completed_at: { type: 'string', format: 'date-time', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid arena ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Arena not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/arenas/{id}/replay': {
      get: {
        summary: 'Get arena replay data',
        operationId: 'getArenaReplay',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Replay data with warriors, rounds, and settings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    arena_id: { type: 'integer' },
                    seed: { type: 'integer' },
                    total_rounds: { type: 'integer' },
                    warriors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          slot_index: { type: 'integer' },
                          name: { type: 'string' },
                          redcode: { type: 'string' },
                          is_stock_bot: { type: 'boolean' },
                        },
                      },
                    },
                    rounds: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          round_number: { type: 'integer' },
                          seed: { type: 'integer' },
                          survivor_count: { type: 'integer' },
                          winner_slot: { type: 'integer', nullable: true },
                          scores: { type: 'object' },
                        },
                      },
                    },
                    settings: {
                      type: 'object',
                      properties: {
                        coreSize: { type: 'integer' },
                        maxCycles: { type: 'integer' },
                        maxLength: { type: 'integer' },
                        maxProcesses: { type: 'integer' },
                        minSeparation: { type: 'integer' },
                        warriors: { type: 'integer' },
                        rounds: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid arena ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Arena not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
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
