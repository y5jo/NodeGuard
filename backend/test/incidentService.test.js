import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Incident from '../src/models/Incident.js';
import EvidenceFile from '../src/models/EvidenceFile.js';
import ChainOfCustodyLog from '../src/models/ChainOfCustodyLog.js';
import { registerPublicIncident } from '../src/services/incidentService.js';

test('registerPublicIncident stores evidence hashes and appends ingestion audit records', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nodeguard-intake-'));
  const filePath = path.join(directory, 'evidence.pdf');
  const content = 'unit test evidence contents';
  const originalSave = Incident.prototype.save;
  const originalEvidenceCreate = EvidenceFile.create;
  const originalLogCreate = ChainOfCustodyLog.create;
  const evidenceRecords = [];
  const auditRecords = [];
  const evidenceId = '507f1f77bcf86cd799439011';

  Incident.prototype.save = async function save() {};
  EvidenceFile.create = async (record) => {
    evidenceRecords.push(record);
    return { _id: evidenceId, ...record };
  };
  ChainOfCustodyLog.create = async (record) => {
    auditRecords.push(record);
  };

  try {
    await fs.writeFile(filePath, content);
    const { trackingId, incident, evidenceFiles } = await registerPublicIncident(
      {
        title: 'Suspicious email',
        category: 'Phishing',
        narrative: 'A suspicious link was received.',
        complainantContact: ' REPORTER@EXAMPLE.COM ',
      },
      [{
        path: filePath,
        originalname: 'evidence.pdf',
        filename: 'stored-evidence.pdf',
        size: Buffer.byteLength(content),
        mimetype: 'application/pdf',
      }],
      '192.0.2.10'
    );

    const expectedSha256 = crypto.createHash('sha256').update(content).digest('hex');
    const expectedMd5 = crypto.createHash('md5').update(content).digest('hex');
    assert.match(trackingId, /^CASE-\d{4}-[A-F0-9]{5}$/);
    assert.equal(incident.trackingId, trackingId);
    assert.equal(incident.complainantEmail, 'reporter@example.com');
    assert.equal(incident.priority, 'MEDIUM');
    assert.equal(evidenceFiles.length, 1);
    assert.equal(evidenceRecords[0].sha256Hash, expectedSha256);
    assert.equal(evidenceRecords[0].md5Hash, expectedMd5);
    assert.deepEqual(incident.evidenceFiles.map(String), [evidenceId]);
    assert.equal(auditRecords.length, 1);
    assert.equal(auditRecords[0].action, 'INGESTION');
    assert.equal(auditRecords[0].calculatedHash, expectedSha256);
    assert.equal(auditRecords[0].ipAddress, '192.0.2.10');
  } finally {
    Incident.prototype.save = originalSave;
    EvidenceFile.create = originalEvidenceCreate;
    ChainOfCustodyLog.create = originalLogCreate;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('registerPublicIncident records public reports submitted without evidence', async () => {
  const originalSave = Incident.prototype.save;
  const originalLogCreate = ChainOfCustodyLog.create;
  let auditRecord;
  Incident.prototype.save = async function save() {};
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  try {
    const result = await registerPublicIncident({
      title: 'Account impersonation',
      category: 'Impersonation / Fake Profiles',
      narrative: 'A fake account is impersonating me.',
    }, [], undefined);

    assert.match(result.trackingId, /^CASE-\d{4}-[A-F0-9]{5}$/);
    assert.equal(result.evidenceFiles.length, 0);
    assert.equal(auditRecord.action, 'INGESTION');
    assert.equal(auditRecord.evidenceFileId, null);
    assert.equal(auditRecord.calculatedHash, null);
    assert.equal(auditRecord.ipAddress, '127.0.0.1');
  } finally {
    Incident.prototype.save = originalSave;
    ChainOfCustodyLog.create = originalLogCreate;
  }
});
