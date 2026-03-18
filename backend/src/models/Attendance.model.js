import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeCode: { type: String, required: true, uppercase: true, index: true },
    employeeName: { type: String },

    // ── DATE (normalized to midnight) ──
    date: { type: Date, required: true, index: true },

    // ── TIMES ──
    inTime: { type: Date },   // Full datetime for accurate calculation
    outTime: { type: Date },

    // ── COMPUTED ──
    totalHours: { type: Number },   // in decimal (e.g., 8.5)
    totalMinutes: { type: Number },

    // ── STATUS: P, A, WO, L, Coff, AUTO ──
    status: {
      type: String,
      enum: ['P', 'A', 'WO', 'L', 'Coff', 'AUTO', 'H'],
      default: 'P',
    },

    // ── LATE INFO ──
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },

    // ── GEO ATTENDANCE ──
    isGeoAttendance: { type: Boolean, default: false },
    checkInLatitude: { type: Number },
    checkInLongitude: { type: Number },
    checkOutLatitude: { type: Number },
    checkOutLongitude: { type: Number },

    // ── CORRECTION ──
    correctionRequested: { type: Boolean, default: false },
    correctionStatus: {
      type: String,
      enum: ['None', 'Pending', 'Approved', 'Rejected'],
      default: 'None',
    },
    correctionRemark: { type: String },
    correctionProofUrl: { type: String }, // Cloudinary URL
    correctionRequestedOn: { type: Date },
    reviewedBy: { type: String },
    reviewedOn: { type: Date },
    requestedByRole: { type: String },
    pendingWithRole: { type: String },

    // ── COMP OFF ──
    isCompOffCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── UNIQUE CONSTRAINT: ONE RECORD PER EMPLOYEE PER DAY ──
attendanceSchema.index({ employeeCode: 1, date: 1 }, { unique: true });

// ── VIRTUAL: formatted in/out times ──
attendanceSchema.virtual('inTimeFormatted').get(function () {
  if (!this.inTime) return null;
  return this.inTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
});

attendanceSchema.virtual('outTimeFormatted').get(function () {
  if (!this.outTime) return null;
  return this.outTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
