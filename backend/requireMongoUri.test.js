import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { requireMongoUri } from './requireMongoUri.js';

describe('ADR-006 MONGO_URI fail-fast', () => {
  it('returns a non-empty URI and rejects unset or empty values', () => {
    assert.equal(requireMongoUri('mongodb://localhost:27017/testdb'), 'mongodb://localhost:27017/testdb');
    assert.throws(() => requireMongoUri(undefined), /MONGO_URI is required/);
    assert.throws(() => requireMongoUri(''), /MONGO_URI is required/);
    assert.throws(() => requireMongoUri('   '), /MONGO_URI is required/);
  });

  it('removes the testdb fallback from fpc_server.js', () => {
    const serverSrc = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'fpc_server.js'),
      'utf8'
    );
    assert.equal(serverSrc.includes("|| 'mongodb://localhost:27017/testdb'"), false);
    assert.match(serverSrc, /requireMongoUri/);
  });
});
