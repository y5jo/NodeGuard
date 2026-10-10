import test from 'node:test';
import assert from 'node:assert/strict';

import ChainOfCustodyLog from '../src/models/ChainOfCustodyLog.js';

test('ChainOfCustodyLog rejects changes to an existing audit record', async () => {
  const log = new ChainOfCustodyLog({
    incidentId: '507f1f77bcf86cd799439011',
    action: 'STATUS_CHANGE',
    details: 'Status changed from Reported to Under Review',
  });
  log.isNew = false;

  await assert.rejects(log.save(), /immutable and cannot be updated or deleted/);
});

test('ChainOfCustodyLog blocks update and delete query operations', async () => {
  const operations = [
    () => ChainOfCustodyLog.updateOne({}, { $set: { details: 'tampered' } }).exec(),
    () => ChainOfCustodyLog.updateMany({}, { $set: { details: 'tampered' } }).exec(),
    () => ChainOfCustodyLog.findOneAndUpdate({}, { $set: { details: 'tampered' } }).exec(),
    () => ChainOfCustodyLog.deleteOne({}).exec(),
    () => ChainOfCustodyLog.deleteMany({}).exec(),
    () => ChainOfCustodyLog.findOneAndDelete({}).exec(),
  ];

  for (const operation of operations) {
    await assert.rejects(operation(), /immutable and cannot be updated or deleted/);
  }
});
