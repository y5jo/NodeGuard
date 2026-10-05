import mongoose from 'mongoose';

const chainOfCustodyLogSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Incident ID is required'],
      index: true,
    },
    evidenceFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EvidenceFile',
      default: null,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'INGESTION',
        'VIEW',
        'DOWNLOAD',
        'VERIFY_PASS',
        'VERIFY_FAIL',
        'STATUS_CHANGE',
        'CASE_ASSIGNMENT',
        'CUSTODY_TRANSFER',
        'NOTE_ADDED',
        'DOSSIER_EXPORT',
      ],
      index: true,
    },
    details: {
      type: String,
      required: [true, 'Action details are required'],
      trim: true,
    },
    calculatedHash: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chainOfCustodyLogSchema.virtual('evidenceId')
  .get(function () {
    return this.evidenceFileId;
  })
  .set(function (value) {
    this.evidenceFileId = value;
  });

chainOfCustodyLogSchema.index({ incidentId: 1, timestamp: -1 });

const IMMUTABLE_OPERATIONS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
];

IMMUTABLE_OPERATIONS.forEach((operation) => {
  chainOfCustodyLogSchema.pre(operation, function () {
    throw new Error('Chain of Custody records are immutable and cannot be updated or deleted.');
  });
});

chainOfCustodyLogSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('Chain of Custody records are immutable and cannot be updated or deleted.');
  }
});

const ChainOfCustodyLog = mongoose.model('ChainOfCustodyLog', chainOfCustodyLogSchema);

export default ChainOfCustodyLog;
