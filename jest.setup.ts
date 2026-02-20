// Safety net: set POSTGRES_URL so db.ts buildPool() doesn't crash if the module
// gets loaded before jest.mock() intercepts it.
process.env.POSTGRES_URL = 'postgres://test:test@localhost:5432/testdb';
