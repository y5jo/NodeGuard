import test from 'node:test';
import assert from 'node:assert/strict';

import { ALLOWED_STATUSES, buildIncidentFilter } from '../src/utils/incidentHelpers.js';
import generateTrackingId from '../src/utils/trackingIdGenerator.js';

test('generateTrackingId returns a valid NodeGuard case ID', () => {
  const trackingId = generateTrackingId();

  assert.match(trackingId, /^CASE-\d{4}-[A-F0-9]{5}$/);
  assert.equal(trackingId.startsWith(`CASE-${new Date().getFullYear()}-`), true);
});

test('buildIncidentFilter includes only defined query fields', () => {
  const filter = buildIncidentFilter({
    category: 'Phishing',
    status: 'Under Review',
    priority: 'HIGH',
    unexpected: 'ignored',
  });

  assert.deepEqual(filter, {
    category: 'Phishing',
    status: 'Under Review',
    priority: 'HIGH',
  });
});

test('buildIncidentFilter handles empty input', () => {
  assert.deepEqual(buildIncidentFilter(), {});
  assert.deepEqual(buildIncidentFilter({}), {});
});

test('buildIncidentFilter handles each supported filter independently', () => {
  assert.deepEqual(buildIncidentFilter({ category: 'Phishing' }), { category: 'Phishing' });
  assert.deepEqual(buildIncidentFilter({ status: 'Reported' }), { status: 'Reported' });
  assert.deepEqual(buildIncidentFilter({ priority: 'HIGH' }), { priority: 'HIGH' });
});

test('buildIncidentFilter omits empty values and does not mutate the query', () => {
  const query = { category: '', status: null, priority: undefined, page: '2' };

  assert.deepEqual(buildIncidentFilter(query), {});
  assert.deepEqual(query, { category: '', status: null, priority: undefined, page: '2' });
});

test('ALLOWED_STATUSES contains the supported workflow statuses', () => {
  assert.deepEqual(ALLOWED_STATUSES, [
    'Reported',
    'Under Review',
    'Investigating',
    'Resolved',
    'Closed',
    'OPEN',
    'IN_PROGRESS',
    'CONTAINED',
    'CLOSED',
  ]);
});
