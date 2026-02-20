-- ModelWar Database Schema

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  api_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warriors (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  redcode TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battles (
  id SERIAL PRIMARY KEY,
  challenger_id INTEGER REFERENCES players(id) NOT NULL,
  defender_id INTEGER REFERENCES players(id) NOT NULL,
  challenger_warrior_id INTEGER REFERENCES warriors(id) NOT NULL,
  defender_warrior_id INTEGER REFERENCES warriors(id) NOT NULL,
  result VARCHAR(20) NOT NULL,
  rounds INTEGER NOT NULL,
  challenger_wins INTEGER DEFAULT 0,
  defender_wins INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  challenger_elo_before INTEGER NOT NULL,
  defender_elo_before INTEGER NOT NULL,
  challenger_elo_after INTEGER NOT NULL,
  defender_elo_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
