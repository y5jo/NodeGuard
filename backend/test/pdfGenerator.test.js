import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';

import { generateDossierPDF } from '../src/utils/pdfGenerator.js';

test('generateDossierPDF streams a PDF dossier and sets download headers', async () => {
  const response = new PassThrough();
  const headers = {};
  const chunks = [];
  response.setHeader = (name, value) => { headers[name] = value; };
  response.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    response.once('finish', resolve);
    response.once('error', reject);
  });

  generateDossierPDF({
    trackingId: 'CASE-2026-ABCDE',
    status: 'Closed',
    priority: 'HIGH',
    category: 'Phishing',
    incidentDate: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
    narrative: 'A suspicious link was received.',
    suspectIdentifiers: 'example@attacker.test',
    evidenceFiles: [{
      originalFilename: 'evidence.png',
      fileSize: 1024,
      mimeType: 'image/png',
      sha256Hash: 'sha256-hash',
      md5Hash: 'md5-hash',
    }],
  }, [{
    timestamp: '2026-01-02T00:00:00.000Z',
    action: 'INGESTION',
    details: 'Initial evidence ingested',
    calculatedHash: 'sha256-hash',
    ipAddress: '192.0.2.40',
  }], response);
  await finished;

  const pdf = Buffer.concat(chunks);
  assert.equal(headers['Content-Type'], 'application/pdf');
  assert.equal(headers['Content-Disposition'], 'attachment; filename="Dossier-CASE-2026-ABCDE.pdf"');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 500);
});
