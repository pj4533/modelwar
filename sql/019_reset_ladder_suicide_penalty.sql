-- Reset 1v1 ladder after changing suicide warrior penalty
--
-- Previously, suicide warriors (e.g. DAT 0 0) nullified ALL rating changes
-- for both sides. This enabled "parking" at #1 by switching to a suicide
-- warrior so challengers gain nothing. The new behavior applies the full
-- Glicko-2 loss to the suicide side while giving the winner nothing.
--
-- All historical 1v1 battles were fought under the old rules and ratings
-- may be inflated from parking abuse. Reset to a clean slate.
--
-- This only resets 1v1 data. Arena data is left untouched.
--
-- Run: npm run migrate -- sql/019_reset_ladder_suicide_penalty.sql

BEGIN;

DELETE FROM battles;

UPDATE players SET
  elo_rating = 1200,
  rating_deviation = 350,
  rating_volatility = 0.06,
  wins = 0,
  losses = 0,
  ties = 0,
  updated_at = NOW();

COMMIT;
