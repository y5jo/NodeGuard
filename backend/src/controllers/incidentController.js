import Incident from '../models/Incident.js';
import User from '../models/User.js';
import ChainOfCustodyLog from '../models/ChainOfCustodyLog.js';
import { registerPublicIncident } from '../services/incidentService.js';
import { ALLOWED_STATUSES, buildIncidentFilter } from '../utils/incidentHelpers.js';
import { generateDossierPDF } from '../utils/pdfGenerator.js';

export const createPublicIncident = async (req, res) => {
  try {
    const { title, category, narrative } = req.body;
    if (!title || !category || !narrative) {
      return res.status(400).json({ success: false, message: 'Title, category, and narrative are required.' });
    }
    const { trackingId } = await registerPublicIncident(req.body, req.files, req.ip, req.user);
    return res.status(201).json({ success: true, trackingId });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to create incident: ${error.message}` });
  }
};

export const getIncidentByTrackingId = async (req, res) => {
  try {
    const rawId = String(req.params.trackingId).replace(/[^A-Z0-9-]/gi, '').toUpperCase();
    const incident = await Incident.findOne({ trackingId: rawId })
      .select('trackingId title category status priority incidentDate createdAt');
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found with given tracking ID.' });
    return res.status(200).json({ success: true, incident });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = buildIncidentFilter(req.query);

    if (['INVESTIGATOR', 'ANALYST'].includes(req.user?.role)) {
      filter.assignedTo = req.user.id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate({ path: 'assignedTo', match: { isActive: true }, select: 'name email role' })
        .populate('reportedBy', 'name email role')
        .populate('evidenceFiles', 'originalFilename fileSize mimeType sha256Hash md5Hash verificationStatus verifiedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Incident.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      incidents,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignIncident = async (req, res) => {
  try {
    const { analystId } = req.body;
    const analyst = await User.findOne({ _id: analystId, role: { $in: ['INVESTIGATOR', 'ANALYST'] }, isActive: true });
    if (!analyst) return res.status(404).json({ success: false, message: 'Active analyst not found.' });

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

    const prevDoc = incident.assignedTo
      ? await User.findOne({ _id: incident.assignedTo, isActive: true }, 'name email').lean()
      : null;

    incident.assignedTo = analyst._id;
    const [logDetails, logAction] = prevDoc
      ? [
          `Custody transferred from ${prevDoc.name} (${prevDoc.email}) to ${analyst.name} (${analyst.email}) by Admin ${req.user.name || req.user.email}`,
          'CUSTODY_TRANSFER',
        ]
      : [
          `Case assigned to ${analyst.name} (${analyst.email}) by Admin ${req.user.name || req.user.email}`,
          'CASE_ASSIGNMENT',
        ];

    await Promise.all([
      incident.save(),
      ChainOfCustodyLog.create({
        incidentId: incident._id,
        evidenceFileId: null,
        performedBy: req.user.id,
        action: logAction,
        details: logDetails,
        ipAddress: req.ip || '127.0.0.1',
      }),
    ]);

    await incident.populate([
      { path: 'assignedTo', match: { isActive: true }, select: 'name email role' },
      { path: 'reportedBy', select: 'name email role' },
      { path: 'evidenceFiles' },
    ]);

    return res.status(200).json({ success: true, incident });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate({ path: 'assignedTo', match: { isActive: true }, select: 'name email role' })
      .populate('reportedBy', 'name email role')
      .populate('evidenceFiles');
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

    const custodyLogs = await ChainOfCustodyLog.find({ incidentId: incident._id })
      .populate('performedBy', 'name email role')
      .populate('evidenceFileId', 'originalFilename')
      .sort({ timestamp: 1 });
    return res.status(200).json({ success: true, incident, custodyLogs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

    const previousStatus = incident.status;
    incident.status = status;
    await incident.save();

    await ChainOfCustodyLog.create({
      incidentId: incident._id,
      evidenceFileId: null,
      performedBy: req.user.id,
      action: 'STATUS_CHANGE',
      details: `Status changed from "${previousStatus}" to "${status}" by ${req.user.name || req.user.email}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    await incident.populate([
      { path: 'assignedTo', match: { isActive: true }, select: 'name email role' },
      { path: 'reportedBy', select: 'name email role' },
      { path: 'evidenceFiles' },
    ]);

    return res.status(200).json({ success: true, incident });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Note text cannot be empty.' });

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });

    const newNote = { author: req.user.name || req.user.email, text: text.trim(), date: new Date() };
    incident.notes.push(newNote);
    await incident.save();

    await ChainOfCustodyLog.create({
      incidentId: incident._id,
      evidenceFileId: null,
      performedBy: req.user.id,
      action: 'NOTE_ADDED',
      details: `Note added by ${req.user.name || req.user.email}`,
      ipAddress: req.ip || '127.0.0.1',
    });
    return res.status(200).json({ success: true, notes: incident.notes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportDossier = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate({ path: 'assignedTo', match: { isActive: true }, select: 'name email role' })
      .populate('reportedBy', 'name email role')
      .populate('evidenceFiles');
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found.' });
    if (!['Resolved', 'Closed'].includes(incident.status)) {
      return res.status(409).json({ success: false, message: 'The case must be resolved or closed before its report can be exported.' });
    }

    const logs = await ChainOfCustodyLog.find({ incidentId: incident._id })
      .populate('performedBy', 'name email role')
      .populate('evidenceFileId', 'originalFilename')
      .sort({ timestamp: 1 });

    await ChainOfCustodyLog.create({
      incidentId: incident._id,
      evidenceFileId: null,
      performedBy: req.user.id,
      action: 'DOSSIER_EXPORT',
      details: 'Official forensic court dossier exported as PDF',
      ipAddress: req.ip || '127.0.0.1',
    });
    return generateDossierPDF(incident, logs, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLog = async (req, res) => {
  const logs = await ChainOfCustodyLog.find()
    .populate('performedBy', 'name role')
    .populate('incidentId', 'trackingId title')
    .sort({ timestamp: -1 })
    .lean();

  const entries = logs.map((log) => ({
    id: log._id,
    action: log.action,
    actor: log.performedBy?.name ?? 'PUBLIC_ANONYMOUS',
    role: log.performedBy?.role === 'ADMIN' ? 'Admin' : ['INVESTIGATOR', 'ANALYST'].includes(log.performedBy?.role) ? 'Investigator' : 'Client',
    ip: log.ipAddress ?? '—',
    details: log.details,
    timestamp: log.timestamp,
    incidentId: log.incidentId?.trackingId ?? null,
    incidentTitle: log.incidentId?.title ?? null,
    calculatedHash: log.calculatedHash ?? null,
  }));

  const incidentOptions = [...new Map(
    logs
      .filter((l) => l.incidentId)
      .map((l) => [String(l.incidentId._id), { id: l.incidentId.trackingId, name: l.incidentId.trackingId }])
  ).values()];

  return res.status(200).json({ success: true, entries, incidentOptions });
};

export default { createPublicIncident, getIncidentByTrackingId, getIncidents, getIncidentById, assignIncident, updateStatus, addNote, exportDossier, getAuditLog };
