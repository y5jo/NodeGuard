import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { computeFileHashes } from '../src/services/forensicService.js';

test('computeFileHashes returns SHA-256 and MD5 hashes for file contents', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nodeguard-hashes-'));
  const filePath = path.join(directory, 'evidence.txt');
  const content = 'NodeGuard evidence test';

  try {
    await fs.writeFile(filePath, content);

    assert.deepEqual(await computeFileHashes(filePath), {
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
      md5: crypto.createHash('md5').update(content).digest('hex'),
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('computeFileHashes handles empty files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nodeguard-empty-'));
  const filePath = path.join(directory, 'empty.txt');

  try {
    await fs.writeFile(filePath, '');
    assert.deepEqual(await computeFileHashes(filePath), {
      sha256: crypto.createHash('sha256').update('').digest('hex'),
      md5: crypto.createHash('md5').update('').digest('hex'),
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('computeFileHashes rejects when the input file does not exist', async () => {
  await assert.rejects(
    computeFileHashes(path.join(os.tmpdir(), 'nodeguard-file-that-does-not-exist')),
    /File not found at path:/
  );
});
