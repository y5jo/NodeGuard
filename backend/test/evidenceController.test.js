import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nodeguard-evidence-'));
const previousUploadDirectory = process.env.UPLOAD_DIR;
process.env.UPLOAD_DIR = uploadDirectory;

const [{ default: EvidenceFile }, { default: ChainOfCustodyLog }, controllers] = await Promise.all([
  import('../src/models/EvidenceFile.js'),
  import('../src/models/ChainOfCustodyLog.js'),
  import('../src/controllers/evidenceController.js'),
]);
const { verifyEvidence, streamEvidence } = controllers;

let originalFindById;
let originalLogCreate;

before(() => {
  originalFindById = EvidenceFile.findById;
  originalLogCreate = ChainOfCustodyLog.create;
});

after(async () => {
  EvidenceFile.findById = originalFindById;
  ChainOfCustodyLog.create = originalLogCreate;
  await fs.rm(uploadDirectory, { recursive: true, force: true });
  if (previousUploadDirectory === undefined) delete process.env.UPLOAD_DIR;
  else process.env.UPLOAD_DIR = previousUploadDirectory;
});

const createResponse = () => {
  const response = new PassThrough();
  response.headers = {};
  response.setHeader = (name, value) => { response.headers[name] = value; };
  response.statusCode = null;
  response.body = null;
  response.status = function status(code) {
    this.statusCode = code;
    return this;
  };
  response.json = function json(body) {
    this.body = body;
    return this;
  };
  return response;
};

const createEvidence = (filePath, hash) => ({
  _id: 'evidence-1',
  incidentId: 'incident-1',
  storedFilename: path.basename(filePath),
  originalFilename: 'report.pdf',
  fileSize: 10,
  mimeType: 'application/pdf',
  sha256Hash: hash,
  verificationStatus: 'not-verified',
  async save() {},
});

test('verifyEvidence confirms a matching SHA-256 and logs the verification event', async () => {
  const filename = 'matching-evidence.pdf';
  const filePath = path.join(uploadDirectory, filename);
  const content = 'original evidence';
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const evidence = createEvidence(filePath, sha256);
  let auditRecord;
  await fs.writeFile(filePath, content);
  EvidenceFile.findById = async () => evidence;
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  const response = createResponse();
  await verifyEvidence({
    params: { id: 'evidence-1' },
    user: { id: 'analyst-1' },
    ip: '192.0.2.20',
  }, response);

  assert.equal(response.body.success, true);
  assert.equal(response.body.match, true);
  assert.equal(response.body.verificationStatus, 'verified');
  assert.equal(response.body.baselineHash, sha256);
  assert.equal(evidence.verificationStatus, 'verified');
  assert.ok(evidence.verifiedAt instanceof Date);
  assert.equal(auditRecord.action, 'VERIFY_PASS');
  assert.equal(auditRecord.calculatedHash, sha256);
  assert.equal(auditRecord.performedBy, 'analyst-1');
  assert.equal(auditRecord.ipAddress, '192.0.2.20');
});

test('verifyEvidence marks changed evidence as a mismatch and logs failure', async () => {
  const filename = 'changed-evidence.pdf';
  const filePath = path.join(uploadDirectory, filename);
  const baselineHash = crypto.createHash('sha256').update('original').digest('hex');
  const evidence = createEvidence(filePath, baselineHash);
  let auditRecord;
  await fs.writeFile(filePath, 'changed');
  EvidenceFile.findById = async () => evidence;
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  const response = createResponse();
  await verifyEvidence({ params: { id: 'evidence-1' }, ip: '127.0.0.1' }, response);

  assert.equal(response.body.success, true);
  assert.equal(response.body.match, false);
  assert.equal(response.body.verificationStatus, 'mismatch');
  assert.equal(evidence.verificationStatus, 'mismatch');
  assert.equal(auditRecord.action, 'VERIFY_FAIL');
  assert.notEqual(auditRecord.calculatedHash, baselineHash);
});

test('verifyEvidence records a missing stored file as an integrity failure', async () => {
  const evidence = createEvidence(path.join(uploadDirectory, 'missing-evidence.pdf'), 'baseline-hash');
  let auditRecord;
  EvidenceFile.findById = async () => evidence;
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  const response = createResponse();
  await verifyEvidence({ params: { id: 'evidence-1' } }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.match, false);
  assert.equal(evidence.verificationStatus, 'error');
  assert.equal(auditRecord.action, 'VERIFY_FAIL');
  assert.equal(auditRecord.calculatedHash, null);
});

test('streamEvidence logs downloads and streams the stored file', async () => {
  const filename = 'download-evidence.pdf';
  const filePath = path.join(uploadDirectory, filename);
  const contents = 'downloadable evidence';
  let auditRecord;
  await fs.writeFile(filePath, contents);
  EvidenceFile.findById = async () => createEvidence(filePath, 'sha256-value');
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  const response = createResponse();
  const finished = new Promise((resolve, reject) => {
    response.once('finish', resolve);
    response.once('error', reject);
  });
  await streamEvidence({
    params: { id: 'evidence-1' },
    query: {},
    user: { id: 'staff-1' },
    ip: '192.0.2.30',
  }, response);
  await finished;

  assert.equal(response.headers['Content-Disposition'], 'attachment; filename="report.pdf"');
  assert.equal(response.headers['Content-Type'], 'application/pdf');
  assert.equal(auditRecord.action, 'DOWNLOAD');
  assert.equal(auditRecord.performedBy, 'staff-1');
  assert.equal(auditRecord.calculatedHash, 'sha256-value');
  assert.equal(response.read().toString(), contents);
});

test('streamEvidence logs inline previews as VIEW actions', async () => {
  const filename = 'preview-evidence.pdf';
  const filePath = path.join(uploadDirectory, filename);
  await fs.writeFile(filePath, 'preview evidence');
  let auditRecord;
  EvidenceFile.findById = async () => createEvidence(filePath, 'sha256-value');
  ChainOfCustodyLog.create = async (record) => { auditRecord = record; };

  const response = createResponse();
  const finished = new Promise((resolve, reject) => {
    response.once('finish', resolve);
    response.once('error', reject);
  });
  await streamEvidence({
    params: { id: 'evidence-1' },
    query: { disposition: 'inline' },
    ip: '192.0.2.31',
  }, response);
  await finished;

  assert.equal(response.headers['Content-Disposition'], 'inline; filename="report.pdf"');
  assert.equal(auditRecord.action, 'VIEW');
  assert.equal(auditRecord.ipAddress, '192.0.2.31');
});
