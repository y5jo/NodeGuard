import test from 'node:test';
import assert from 'node:assert/strict';

import Incident from '../src/models/Incident.js';

const validIncident = () => ({
  trackingId: 'CASE-2026-ABCDE',
  title: 'Suspicious email',
  category: 'Phishing',
  narrative: 'A suspicious link was received.',
});

test('Incident accepts a valid minimum record and applies defaults', async () => {
  const incident = new Incident(validIncident());

  await incident.validate();

  assert.equal(incident.status, 'Reported');
  assert.equal(incident.priority, 'MEDIUM');
  assert.equal(incident.platform, 'Web');
  assert.equal(incident.estimatedLoss, 0);
  assert.deepEqual(incident.evidenceFiles, []);
});

test('Incident requires tracking ID, title, category, and narrative', async () => {
  const incident = new Incident({});

  await assert.rejects(incident.validate(), (error) => {
    assert.ok(error.errors.trackingId);
    assert.ok(error.errors.title);
    assert.ok(error.errors.category);
    assert.ok(error.errors.narrative);
    return true;
  });
});

test('Incident rejects an invalid tracking ID', async () => {
  const incident = new Incident({ ...validIncident(), trackingId: 'CASE-invalid' });

  await assert.rejects(incident.validate(), (error) => {
    assert.ok(error.errors.trackingId);
    return true;
  });
});

test('Incident rejects categories outside the allowed category list', async () => {
  const incident = new Incident({ ...validIncident(), category: 'Unlisted Category' });

  await assert.rejects(incident.validate(), (error) => {
    assert.ok(error.errors.category);
    return true;
  });
});

test('Incident rejects invalid workflow status and priority values', async () => {
  const incident = new Incident({
    ...validIncident(),
    status: 'NOT_A_STATUS',
    priority: 'URGENT',
  });

  await assert.rejects(incident.validate(), (error) => {
    assert.ok(error.errors.status);
    assert.ok(error.errors.priority);
    return true;
  });
});

test('Incident rejects negative estimated losses', async () => {
  const incident = new Incident({ ...validIncident(), estimatedLoss: -1 });

  await assert.rejects(incident.validate(), (error) => {
    assert.ok(error.errors.estimatedLoss);
    return true;
  });
});
