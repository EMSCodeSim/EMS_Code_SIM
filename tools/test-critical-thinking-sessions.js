'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tokenPattern, tokenHash, readDecisions } = require('../netlify/functions/critical-thinking-sessions')._test;

const migrationPath = path.join(__dirname, '../netlify/database/migrations/20261009160000_create_critical_thinking_sessions.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

assert(tokenPattern.test('a'.repeat(48)), 'room tokens must use the 48-character opaque format');
assert(!tokenPattern.test('a'.repeat(47)), 'short room tokens must be rejected');
assert(!tokenPattern.test('a'.repeat(48) + '?'), 'query text must not be accepted as a room token');
assert.notStrictEqual(tokenHash('a'.repeat(48)), 'a'.repeat(48), 'only a hash of each bearer token is persisted');
assert.deepStrictEqual(readDecisions([]), [], 'a new room can be saved before its first decision');
assert.deepStrictEqual(readDecisions([{action:'Check the scene for hazards', reasoning:'The dispatch leaves hazards unknown.'}]), [
  {action:'Check the scene for hazards', reasoning:'The dispatch leaves hazards unknown.'}
], 'learner decisions are stored in a normalized shape');
assert.throws(() => readDecisions([{action:'short', reasoning:'Too short'}]), /Complete both parts/);
assert.throws(() => readDecisions([{action:'Patient name: Jane Doe', reasoning:'The dispatch leaves hazards unknown.'}]), /patient-identifying/);
assert.throws(() => readDecisions(Array.from({length:6}, () => ({action:'Check the scene for hazards', reasoning:'The dispatch leaves hazards unknown.'}))), /decision trail is invalid/);
assert.match(migration, /token_hash text PRIMARY KEY/);
assert.match(migration, /expires_at timestamptz NOT NULL DEFAULT now\(\) \+ interval '30 days'/);
assert.match(migration, /CHECK \(mode IN \('solo', 'group'\)\)/);

process.stdout.write('Critical thinking database session contracts passed.\n');
