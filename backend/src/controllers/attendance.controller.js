import { query, pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isWithinOffice } from '../services/geo.service.js';
import { config } from '../config/index.js';

// Helper: get today's date as a YYYY-MM-DD string
const todayString = () => new Date().toISOString().split('T')[0];

const formatAttendance = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    employeeName: row.employee_name,
    date: row.date,
    inTime: row.in_time,
    outTime: row.out_time,
    totalHours: row.total_hours,
    totalMinutes: row.total_minutes,
    status: row.status,
    isLate: row.is_late,
    lateMinutes: row.late_minutes,
    isGeoAttendance: row.is_geo_attendance,
    checkInLatitude: row.check_in_latitude,
    checkInLongitude: row.check_in_longitude,
    checkOutLatitude: row.check_out_latitude,
    checkOutLongitude: row.check_out_longitude,
    correctionRequested: row.correction_requested,
    correctionStatus: row.correction_status,
    correctionRemark: row.correction_remark,
    correctionProofUrl: row.correction_proof_url,
    correctionRequestedOn: row.correction_requested_on,
    reviewedBy: row.reviewed_by,
    reviewedOn: row.reviewed_on,
    requestedByRole: row.requested_by_role,
    pendingWithRole: row.pending_with_role,
    isCompOffCredited: row.is_comp_off_credited,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Virtual: formatted times
    inTimeFormatted: row.in_time
      ? new Date(row.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : null,
    outTimeFormatted: row.out_time
      ? new Date(row.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : null,
  };
};

// ─── CHECK IN ─────────────────────────────────────────────────────────────────
export const checkIn = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const employee = req.user;

  if (latitude == null || longitude == null) {
    throw new ApiError(400, 'Location coordinates are required');
  }

  // ── GEO VALIDATION ──
  const geoCheck = isWithinOffice(parseFloat(latitude), parseFloat(longitude));
  if (!geoCheck.isValid) {
    throw new ApiError(
      400,
      `You are outside office premises (${geoCheck.distance}m away). Must be within 5km.`
    );
  }

  const today = todayString();
  const now = new Date();

  // ── LATE CHECK (standard 9:30 AM start) ──
  const lateThreshold = new Date();
  lateThreshold.setHours(9, 30, 0, 0);
  const isLate = now > lateThreshold;
  const lateMinutes = isLate ? Math.round((now - lateThreshold) / 60000) : 0;

  // ── CHECK EXISTING RECORD ──
  const { rows: existing } = await query(
    'SELECT * FROM attendance WHERE employee_code = $1 AND date = $2',
    [employee.employeeCode, today]
  );
  const existingRecord = existing[0];

  if (existingRecord?.in_time) {
    throw new ApiError(400, 'Already checked in today');
  }

  let attendance;
  if (existingRecord) {
    // Update existing record (e.g., WO was set)
    const { rows } = await query(`
      UPDATE attendance SET
        in_time = $1, is_geo_attendance = true, 
        check_in_latitude = $2, check_in_longitude = $3,
        status = 'P', is_late = $4, late_minutes = $5,
        correction_requested = false, correction_status = 'None',
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_code = $6 AND date = $7
      RETURNING *
    `, [now, parseFloat(latitude), parseFloat(longitude), isLate, lateMinutes, employee.employeeCode, today]);
    attendance = formatAttendance(rows[0]);
  } else {
    const { rows } = await query(`
      INSERT INTO attendance (
        employee_id, employee_code, employee_name, date,
        in_time, status, is_geo_attendance,
        check_in_latitude, check_in_longitude, is_late, late_minutes, correction_status
      ) VALUES ($1, $2, $3, $4, $5, 'P', true, $6, $7, $8, $9, 'None')
      RETURNING *
    `, [
      employee._id, employee.employeeCode, employee.name, today,
      now, parseFloat(latitude), parseFloat(longitude), isLate, lateMinutes
    ]);
    attendance = formatAttendance(rows[0]);
  }

  res.status(200).json(
    new ApiResponse(200, { attendance, checkedInAt: now }, 'Checked in successfully')
  );
});

// ─── CHECK OUT ────────────────────────────────────────────────────────────────
export const checkOut = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const employee = req.user;

  if (latitude == null || longitude == null) {
    throw new ApiError(400, 'Location coordinates are required');
  }

  // ── GEO VALIDATION ──
  const geoCheck = isWithinOffice(parseFloat(latitude), parseFloat(longitude));
  if (!geoCheck.isValid) {
    throw new ApiError(
      400,
      `You are outside office premises (${geoCheck.distance}m away). Must be within 5km.`
    );
  }

  const today = todayString();
  const { rows: existing } = await query(
    'SELECT * FROM attendance WHERE employee_code = $1 AND date = $2',
    [employee.employeeCode, today]
  );
  const existingRecord = existing[0];

  if (!existingRecord?.in_time) {
    throw new ApiError(400, 'No check-in found for today. Please check in first.');
  }
  if (existingRecord.out_time) {
    throw new ApiError(400, 'Already checked out today');
  }

  const now = new Date();
  const workedMs = now - new Date(existingRecord.in_time);
  const totalMinutes = Math.round(workedMs / 60000);
  const totalHours = parseFloat((workedMs / 3600000).toFixed(2));

  // ── SHIFT: Mon-Fri = 8.5 hrs (510 min), Sat = 7 hrs (420 min) ──
  const dayOfWeek = now.getDay();
  const shiftMinutes = dayOfWeek === 6 ? 420 : 510;

  let overtimeMinutes = 0;
  let shortfallMinutes = 0;
  if (totalMinutes >= shiftMinutes) {
    overtimeMinutes = totalMinutes - shiftMinutes;
  } else {
    shortfallMinutes = shiftMinutes - totalMinutes;
  }

  const { rows } = await query(`
    UPDATE attendance SET
      out_time = $1, total_hours = $2, total_minutes = $3,
      check_out_latitude = $4, check_out_longitude = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE employee_code = $6 AND date = $7
    RETURNING *
  `, [now, totalHours, totalMinutes, parseFloat(latitude), parseFloat(longitude), employee.employeeCode, today]);

  const attendance = formatAttendance(rows[0]);

  res.status(200).json(
    new ApiResponse(
      200,
      { attendance, checkedOutAt: now, totalHours, totalMinutes, overtimeMinutes, shortfallMinutes },
      'Checked out successfully'
    )
  );
});

// ─── TODAY'S STATUS ───────────────────────────────────────────────────────────
export const getTodayStatus = asyncHandler(async (req, res) => {
  const today = todayString();
  const { rows } = await query(
    'SELECT * FROM attendance WHERE employee_code = $1 AND date = $2',
    [req.user.employeeCode, today]
  );

  const record = rows.length > 0 ? formatAttendance(rows[0]) : null;

  const office = {
    lat: config.office.latitude,
    lng: config.office.longitude,
    radius: config.office.radiusMeters,
  };

  res.json(new ApiResponse(200, { record, date: today, office }, 'Today status fetched'));
});

// ─── MY ATTENDANCE SUMMARY ────────────────────────────────────────────────────
export const getMySummary = asyncHandler(async (req, res) => {
  const employee = req.user;
  const { from, to } = req.query;

  const now = new Date();
  const startDate = from
    ? from
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = to
    ? to
    : now.toISOString().split('T')[0];

  const { rows: records } = await query(
    `SELECT * FROM attendance WHERE employee_code = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC`,
    [employee.employeeCode, startDate, endDate]
  );

  // ── Build daily summary ──
  const summary = { present: 0, absent: 0, weekOff: 0, late: 0, totalHours: 0 };
  const dailyList = [];

  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const record = records.find((r) => {
      const rDate = r.date instanceof Date ? r.date : new Date(r.date);
      return rDate.toISOString().split('T')[0] === dateStr;
    });
    const dow = current.getDay();

    if (dow === 0) {
      dailyList.push({ date: new Date(current), status: 'WO', isWeekOff: true });
      summary.weekOff++;
    } else if (record) {
      if (record.is_late) summary.late++;
      if (record.in_time) summary.present++;
      summary.totalHours += parseFloat(record.total_hours || 0);
      dailyList.push(formatAttendance(record));
    } else {
      dailyList.push({ date: new Date(current), status: 'A', isAbsent: true });
      summary.absent++;
    }

    current.setDate(current.getDate() + 1);
  }

  res.json(
    new ApiResponse(200, { summary, records: dailyList }, 'Attendance summary fetched')
  );
});

// ─── ADMIN: ALL ATTENDANCE LIST ───────────────────────────────────────────────
export const getAdminAttendanceList = asyncHandler(async (req, res) => {
  const { from, to, search, statusFilter, page = 1, limit = 50 } = req.query;

  const today = todayString();
  const startDate = from ? from : today;
  const endDate = to ? to : today;

  const conditions = [`a.date >= $1 AND a.date <= $2`];
  const values = [startDate, endDate];
  let index = 3;

  if (search) {
    conditions.push(`(a.employee_name ILIKE $${index} OR a.employee_code ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }

  if (statusFilter && statusFilter !== 'All') {
    if (statusFilter === 'Completed') {
      conditions.push(`a.out_time IS NOT NULL`);
    } else if (statusFilter === 'NotCheckedOut') {
      conditions.push(`a.in_time IS NOT NULL AND a.out_time IS NULL`);
    } else {
      conditions.push(`a.status = $${index++}`);
      values.push(statusFilter);
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const skip = (Number(page) - 1) * Number(limit);

  const countQ = `SELECT COUNT(*) FROM attendance a ${whereClause}`;
  const dataQ = `SELECT a.* FROM attendance a ${whereClause} ORDER BY a.date DESC LIMIT $${index} OFFSET $${index + 1}`;

  const [countRes, dataRes] = await Promise.all([
    query(countQ, values),
    query(dataQ, [...values, limit, skip]),
  ]);

  const total = parseInt(countRes.rows[0].count);
  const records = dataRes.rows.map(formatAttendance);

  res.json(
    new ApiResponse(
      200,
      { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
      'Attendance list fetched'
    )
  );
});
