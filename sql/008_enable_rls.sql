-- Enable Row Level Security on all tables.
-- The app connects as postgres (superuser) which bypasses RLS.
-- No policies for anon/authenticated = zero access for those roles.

BEGIN;

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE warriors ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

COMMIT;
