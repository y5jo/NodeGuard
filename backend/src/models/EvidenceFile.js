import mongoose from 'mongoose';

const evidenceFileSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Incident ID is required'],
      index: true,
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    storedFilename: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 0,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    sha256Hash: {
      type: String,
      required: [true, 'SHA-256 hash is required'],
      trim: true,
    },
    md5Hash: {
      type: String,
      required: [true, 'MD5 hash is required'],
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['not-verified', 'verifying', 'verified', 'mismatch', 'error'],
      default: 'not-verified',
      index: true,
    },
    verificationDetails: {
      type: String,
      default: '',
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

evidenceFileSchema.index({ incidentId: 1, createdAt: -1 });

const EvidenceFile = mongoose.model('EvidenceFile', evidenceFileSchema);

export default EvidenceFile;
