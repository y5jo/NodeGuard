import Incident from '../models/Incident.js';
import EvidenceFile from '../models/EvidenceFile.js';
import ChainOfCustodyLog from '../models/ChainOfCustodyLog.js';
import { computeFileHashes } from './forensicService.js';
import { generateTrackingId } from '../utils/trackingIdGenerator.js';

export const registerPublicIncident = async (data, files, ipAddress, user = null) => {
  const trackingId = generateTrackingId();

  let complainantEmail = data.complainantEmail || '';
  const complainantContact = data.complainantContact || '';
  if (!complainantEmail && complainantContact.includes('@')) {
    complainantEmail = complainantContact.trim().toLowerCase();
  }

  const priority = data.priority || data.severity || 'MEDIUM';
  const reporterId = user?.id || data.reportedBy || null;

  const incident = new Incident({
    trackingId,
    title: data.title,
    category: data.category,
    categoryDetails: data.categoryDetails || '',
    platform: data.platform || 'Web',
    platformDetails: data.platformDetails || '',
    suspectIdentifiers: data.suspectIdentifiers || '',
    estimatedLoss: data.estimatedLoss ? Number(data.estimatedLoss) : 0,
    narrative: data.narrative,
    incidentDate: data.incidentDate || Date.now(),
    complainantName: data.complainantName || 'Anonymous',
    complainantEmail,
    complainantContact,
    priority,
    reportedBy: reporterId,
  });

  const evidenceUploads = Array.isArray(files) ? files : files ? [files] : [];
  const evidenceRecords = await Promise.all(evidenceUploads.map(async (file) => {
    const hashes = await computeFileHashes(file.path);
    const evidenceFile = await EvidenceFile.create({
      incidentId: incident._id,
      originalFilename: file.originalname,
      storedFilename: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      sha256Hash: hashes.sha256,
      md5Hash: hashes.md5,
      uploadedBy: reporterId,
    });
    incident.evidenceFiles.push(evidenceFile._id);
    return { file, evidenceFile, hashes };
  }));

  await incident.save();

  const custodyRecords = evidenceRecords.length > 0 ? evidenceRecords : [null];
  await Promise.all(custodyRecords.map((record) => ChainOfCustodyLog.create({
    incidentId: incident._id,
    evidenceFileId: record?.evidenceFile._id || null,
    performedBy: reporterId,
    action: 'INGESTION',
    details: record
      ? `Public incident created with initial evidence: ${record.file.originalname}`
      : 'Public incident created without initial evidence file',
    calculatedHash: record?.hashes.sha256 || null,
    ipAddress: ipAddress || '127.0.0.1',
  })));

  return { trackingId, incident, evidenceFiles: evidenceRecords.map(({ evidenceFile }) => evidenceFile) };
};

export default {
  registerPublicIncident,
};
