import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import Incident from './src/models/Incident.js';
import EvidenceFile from './src/models/EvidenceFile.js';
import ChainOfCustodyLog from './src/models/ChainOfCustodyLog.js';
import { computeFileHashes } from './src/services/forensicService.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      Incident.deleteMany({}),
      EvidenceFile.deleteMany({}),
      mongoose.connection.collection('chainofcustodylogs').drop().catch(() => {}),
    ]);

    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@nodeguard.local',
      password: 'Admin123!',
      role: 'ADMIN',
      isActive: true,
    });

    const investigator = await User.create({
      name: 'Forensic Analyst',
      email: 'analyst@nodeguard.local',
      password: 'Analyst123!',
      role: 'INVESTIGATOR',
      isActive: true,
    });

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const samplesDir = path.join(process.cwd(), 'samples');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ── Case 1 sample: phishing email ────────────────────────────────────────
    const sampleFileName   = 'phishing_sample_payload.eml';
    const sampleStoredName = 'sample_seed_phish_payload.eml';
    const sampleFilePath   = path.join(uploadDir, sampleStoredName);
    fs.copyFileSync(path.join(samplesDir, sampleStoredName), sampleFilePath);

    const hashes = await computeFileHashes(sampleFilePath);
    const stats = fs.statSync(sampleFilePath);

    const incident = await Incident.create({
      trackingId: 'CASE-2026-00001',
      title: 'Targeted Spear Phishing Campaign',
      category: 'Phishing',
      platform: 'Web / Email',
      suspectIdentifiers: 'security-alert@suspicious-bank-login.com, IP 198.51.100.42',
      estimatedLoss: 15000,
      narrative: 'Executive received urgent credential harvesting email posing as corporate security.',
      incidentDate: new Date(),
      complainantName: 'Corporate Security Team',
      complainantEmail: 'secops@corporation.example',
      status: 'Investigating',
      priority: 'HIGH',
      assignedTo: investigator._id,
      notes: [
        {
          author: investigator.name,
          text: 'Initial email payload ingested and cryptographic hash baseline established.',
          date: new Date(),
        },
      ],
    });

    const evidenceFile = await EvidenceFile.create({
      incidentId: incident._id,
      originalFilename: sampleFileName,
      storedFilename: sampleStoredName,
      fileSize: stats.size,
      mimeType: 'message/rfc822',
      sha256Hash: hashes.sha256,
      md5Hash: hashes.md5,
      uploadedBy: investigator._id,
    });

    incident.evidenceFiles.push(evidenceFile._id);
    await incident.save();

    await ChainOfCustodyLog.create({
      incidentId: incident._id,
      evidenceFileId: evidenceFile._id,
      performedBy: investigator._id,
      action: 'INGESTION',
      details: `Forensic baseline established for ${sampleFileName}`,
      calculatedHash: hashes.sha256,
      ipAddress: '127.0.0.1',
    });

    // ── Case 2: GCash Scamming Incidence ──────────────────────────────────────
    const scamReceiptName   = 'gcash_payment_receipt.jpeg';
    const scamStoredName    = 'seed_gcash_receipt_scam.jpeg';
    const scamFilePath      = path.join(uploadDir, scamStoredName);
    fs.copyFileSync(path.join(samplesDir, scamStoredName), scamFilePath);
    const scamHashes        = await computeFileHashes(scamFilePath);
    const scamStats         = fs.statSync(scamFilePath);

    const scamIncident = await Incident.create({
      trackingId: 'CASE-2026-00002',
      title: 'GCash Online Payment Scam',
      category: 'Financial Fraud',
      platform: 'GCash / Mobile Money',
      suspectIdentifiers: '+63 992 487 7371, GCash Ref No. 9045199322202',
      estimatedLoss: 100,
      narrative:
        'Complainant was deceived into sending ₱100.00 via GCash to suspect ' +
        'contact +63 992 487 7371 (JE•••E R.) under false pretenses. ' +
        'Transaction reference 9045199322202 dated Sep 18, 2026 at 9:35 PM ' +
        'was captured as a digital payment receipt and submitted as primary evidence.',
      incidentDate: new Date('2026-09-18T13:35:00.000Z'),
      complainantName: 'Complainant (Withheld)',
      complainantEmail: 'complainant@nodeguard.local',
      status: 'Under Review',
      priority: 'MEDIUM',
      assignedTo: investigator._id,
      notes: [
        {
          author: investigator.name,
          text: 'GCash digital receipt ingested. Suspect number flagged for cross-reference with telecom fraud registry.',
          date: new Date(),
        },
      ],
    });

    const scamEvidence = await EvidenceFile.create({
      incidentId: scamIncident._id,
      originalFilename: scamReceiptName,
      storedFilename: scamStoredName,
      fileSize: scamStats.size,
      mimeType: 'image/jpeg',
      sha256Hash: scamHashes.sha256,
      md5Hash: scamHashes.md5,
      uploadedBy: investigator._id,
    });

    scamIncident.evidenceFiles.push(scamEvidence._id);
    await scamIncident.save();

    await ChainOfCustodyLog.create({
      incidentId: scamIncident._id,
      evidenceFileId: scamEvidence._id,
      performedBy: investigator._id,
      action: 'INGESTION',
      details: `Forensic baseline established for ${scamReceiptName}`,
      calculatedHash: scamHashes.sha256,
      ipAddress: '127.0.0.1',
    });

    console.log('Database seeded successfully.');
    console.log(`Admin:        admin@nodeguard.local`);
    console.log(`Investigator: analyst@nodeguard.local`);
    console.log(`Sample Case:  CASE-2026-00001 (SHA-256: ${hashes.sha256})`);
    console.log(`Scam Case:    CASE-2026-00002 (SHA-256: ${scamHashes.sha256})`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
