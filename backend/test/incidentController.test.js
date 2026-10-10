import test from 'node:test';
import assert from 'node:assert/strict';

import Incident from '../src/models/Incident.js';
import ChainOfCustodyLog from '../src/models/ChainOfCustodyLog.js';
import { PassThrough } from 'node:stream';
import {
  addNote,
  createPublicIncident,
  exportDossier,
  getIncidentByTrackingId,
  updateStatus,
} from '../src/controllers/incidentController.js';

const createResponse = () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
};

test('createPublicIncident rejects requests missing required fields', async () => {
  const response = createResponse();

  await createPublicIncident({ body: {}, files: [], ip: '127.0.0.1' }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Title, category, and narrative are required/);
});

test('updateStatus rejects a status not in the allowed list', async () => {
  const response = createResponse();

  await updateStatus({ body: { status: 'NOT_A_STATUS' }, params: { id: 'incident-1' } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Invalid status/);
});

test('getIncidentByTrackingId normalizes the ID before lookup', async () => {
  const originalFindOne = Incident.findOne;
  const selectedIncident = { trackingId: 'CASE-2026-ABCDE' };
  let lookup;
  let projection;
  Incident.findOne = (filter) => {
    lookup = filter;
    return {
      select: async (fields) => {
        projection = fields;
        return selectedIncident;
      },
    };
  };

  try {
    const response = createResponse();
    await getIncidentByTrackingId({ params: { trackingId: ' case-2026-abCde!! ' } }, response);

    assert.deepEqual(lookup, { trackingId: 'CASE-2026-ABCDE' });
    assert.equal(projection.includes('notes'), false);
    assert.equal(projection.includes('complainantEmail'), false);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.incident, selectedIncident);
  } finally {
    Incident.findOne = originalFindOne;
  }
});

test('getIncidentByTrackingId returns 404 when no matching case exists', async () => {
  const originalFindOne = Incident.findOne;
  Incident.findOne = () => ({ select: async () => null });

  try {
    const response = createResponse();
    await getIncidentByTrackingId({ params: { trackingId: 'CASE-2026-ABCDE' } }, response);

    assert.equal(response.statusCode, 404);
    assert.match(response.body.message, /Incident not found/);
  } finally {
    Incident.findOne = originalFindOne;
  }
});

test('addNote rejects empty or whitespace-only note text', async () => {
  const response = createResponse();

  await addNote({ body: { text: '   ' }, params: { id: 'incident-1' } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Note text cannot be empty/);
});

test('addNote trims note text, records the author, and writes an audit log', async () => {
  const originalFindById = Incident.findById;
  const originalCreate = ChainOfCustodyLog.create;
  const incident = {
    _id: 'incident-1',
    notes: [],
    async save() {},
  };
  let logEntry;
  Incident.findById = async () => incident;
  ChainOfCustodyLog.create = async (entry) => { logEntry = entry; };

  try {
    const response = createResponse();
    await addNote({
      body: { text: '  Reviewed evidence  ' },
      params: { id: 'incident-1' },
      user: { id: 'staff-1', name: 'Analyst One' },
      ip: '192.0.2.4',
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(incident.notes.length, 1);
    assert.equal(incident.notes[0].author, 'Analyst One');
    assert.equal(incident.notes[0].text, 'Reviewed evidence');
    assert.ok(incident.notes[0].date instanceof Date);
    assert.equal(logEntry.action, 'NOTE_ADDED');
    assert.equal(logEntry.incidentId, 'incident-1');
    assert.equal(logEntry.ipAddress, '192.0.2.4');
  } finally {
    Incident.findById = originalFindById;
    ChainOfCustodyLog.create = originalCreate;
  }
});

test('updateStatus persists the new status and appends a custody audit event', async () => {
  const originalFindById = Incident.findById;
  const originalCreate = ChainOfCustodyLog.create;
  const incident = {
    _id: 'incident-2',
    status: 'Reported',
    async save() {},
    async populate() {},
  };
  let logEntry;
  Incident.findById = async () => incident;
  ChainOfCustodyLog.create = async (entry) => { logEntry = entry; };

  try {
    const response = createResponse();
    await updateStatus({
      body: { status: 'Under Review' },
      params: { id: 'incident-2' },
      user: { id: 'staff-1', name: 'Investigator One' },
      ip: '192.0.2.8',
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(incident.status, 'Under Review');
    assert.equal(logEntry.action, 'STATUS_CHANGE');
    assert.equal(logEntry.performedBy, 'staff-1');
    assert.equal(logEntry.ipAddress, '192.0.2.8');
    assert.match(logEntry.details, /Reported.*Under Review/);
  } finally {
    Incident.findById = originalFindById;
    ChainOfCustodyLog.create = originalCreate;
  }
});

test('exportDossier rejects cases that are not resolved or closed', async () => {
  const originalFindById = Incident.findById;
  Incident.findById = () => ({
    populate() { return this; },
    then(resolve, reject) {
      return Promise.resolve({ _id: 'incident-3', status: 'Investigating' }).then(resolve, reject);
    },
  });

  try {
    const response = createResponse();
    await exportDossier({ params: { id: 'incident-3' } }, response);

    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /must be resolved or closed/);
  } finally {
    Incident.findById = originalFindById;
  }
});

test('exportDossier exports a resolved case and records the export action', async () => {
  const originalFindById = Incident.findById;
  const originalLogFind = ChainOfCustodyLog.find;
  const originalLogCreate = ChainOfCustodyLog.create;
  const incident = {
    _id: 'incident-4',
    trackingId: 'CASE-2026-ABCDE',
    status: 'Resolved',
    priority: 'HIGH',
    category: 'Phishing',
    incidentDate: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
    narrative: 'A suspicious link was received.',
    evidenceFiles: [],
  };
  const response = new PassThrough();
  const headers = {};
  const chunks = [];
  let auditRecord;
  response.setHeader = (name, value) => { headers[name] = value; };
  response.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    response.once('finish', resolve);
    response.once('error', reject);
  });
  Incident.findById = () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(incident).then(resolve, reject); },
  });
  ChainOfCustodyLog.find = () => ({
    populate() { return this; },
    sort: async () => [],
  });
  ChainOfCustodyLog.create = async (entry) => { auditRecord = entry; };

  try {
    await exportDossier({
      params: { id: 'incident-4' },
      user: { id: 'staff-2' },
      ip: '192.0.2.50',
    }, response);
    await finished;

    const pdf = Buffer.concat(chunks);
    assert.equal(headers['Content-Type'], 'application/pdf');
    assert.match(headers['Content-Disposition'], /CASE-2026-ABCDE/);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(auditRecord.incidentId, 'incident-4');
    assert.equal(auditRecord.performedBy, 'staff-2');
    assert.equal(auditRecord.action, 'DOSSIER_EXPORT');
    assert.equal(auditRecord.ipAddress, '192.0.2.50');
  } finally {
    Incident.findById = originalFindById;
    ChainOfCustodyLog.find = originalLogFind;
    ChainOfCustodyLog.create = originalLogCreate;
  }
});
