import { query, pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ── ROLE CONSTANTS ──
const APPROVER_ROLES = ['SuperUser', 'HR', 'GM', 'VP', 'Director'];
const ADMIN_ROLES = ['SuperUser', 'HR', 'Director'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialApprovalState(applicantRole) {
  switch (applicantRole) {
    case 'Employee':
    case 'Intern':
      return { hrStatus: 'Pending', gmStatus: 'Pending', directorStatus: 'Pending', overallStatus: 'Pending', currentApproverRole: 'HR' };
    case 'HR':
      return { hrStatus: '-', gmStatus: 'Pending', directorStatus: 'Pending', overallStatus: 'Pending', currentApproverRole: 'GM' };
    case 'GM':
    case 'Manager':
    case 'VP':
      return { hrStatus: '-', gmStatus: '-', directorStatus: 'Pending', overallStatus: 'Pending', currentApproverRole: 'Director' };
    case 'Director':
    case 'SuperUser':
      return { hrStatus: '-', gmStatus: '-', directorStatus: '-', overallStatus: 'Approved', currentApproverRole: 'Completed' };
    default:
      return { hrStatus: 'Pending', gmStatus: 'Pending', directorStatus: 'Pending', overallStatus: 'Pending', currentApproverRole: 'HR' };
  }
}

function calcTotalDays(start, end, halfDay) {
  if (halfDay) return 0.5;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function getNextApproverRole(currentRole, hrStatus, gmStatus, directorStatus) {
  if (currentRole === 'HR') {
    if (gmStatus === 'Pending') return 'GM';
    if (directorStatus === 'Pending') return 'Director';
    return 'Completed';
  }
  if (currentRole === 'GM') {
    if (directorStatus === 'Pending') return 'Director';
    return 'Completed';
  }
  if (currentRole === 'Director') return 'Completed';
  return 'Completed';
}

/**
 * Fetch a leave with employee info joined
 */
const fetchLeaveWithEmployee = async (leaveId) => {
  const { rows } = await query(`
    SELECT 
      l.*,
      e.name AS emp_name,
      e.employee_code AS emp_code,
      e.department AS emp_department,
      e.role AS emp_role,
      e.profile_image_url AS emp_profile_image_url,
      COALESCE(
        json_agg(
          json_build_object(
            'action', lah.action,
            'byEmployeeId', lah.by_employee_id,
            'byName', lah.by_name,
            'byRole', lah.by_role,
            'remarks', lah.remarks,
            'timestamp', lah.timestamp
          ) ORDER BY lah.timestamp ASC
        ) FILTER (WHERE lah.id IS NOT NULL),
        '[]'
      ) AS action_history
    FROM leaves l
    LEFT JOIN employees e ON l.employee_id = e.id
    LEFT JOIN leave_action_history lah ON lah.leave_id = l.id
    WHERE l.id = $1
    GROUP BY l.id, e.name, e.employee_code, e.department, e.role, e.profile_image_url
  `, [leaveId]);

  if (!rows[0]) return null;
  return formatLeave(rows[0]);
};

const formatLeave = (row) => ({
  _id: row.id,
  employeeId: {
    _id: row.employee_id,
    name: row.emp_name,
    employeeCode: row.emp_code,
    department: row.emp_department,
    role: row.emp_role,
    profileImageUrl: row.emp_profile_image_url,
  },
  leaveType: row.leave_type,
  startDate: row.start_date,
  endDate: row.end_date,
  totalDays: row.total_days,
  halfDay: row.half_day,
  halfDayPeriod: row.half_day_period,
  reason: row.reason,
  hrStatus: row.hr_status,
  gmStatus: row.gm_status,
  directorStatus: row.director_status,
  overallStatus: row.overall_status,
  currentApproverRole: row.current_approver_role,
  hrRemarks: row.hr_remarks,
  gmRemarks: row.gm_remarks,
  directorRemarks: row.director_remarks,
  cancelledBy: row.cancelled_by,
  cancelledAt: row.cancelled_at,
  cancelReason: row.cancel_reason,
  actionHistory: row.action_history || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLY FOR LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason, halfDay = false, halfDayPeriod = '' } = req.body;

  if (!leaveType || !startDate || !reason) {
    throw new ApiError(400, 'leaveType, startDate, and reason are required');
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  if (end < start) throw new ApiError(400, 'endDate cannot be before startDate');

  const totalDays = calcTotalDays(start, end, halfDay);
  const state = buildInitialApprovalState(req.user.role);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: leaveRows } = await client.query(`
      INSERT INTO leaves (
        employee_id, leave_type, start_date, end_date, total_days, half_day, half_day_period, reason,
        hr_status, gm_status, director_status, overall_status, current_approver_role
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `, [
      req.user._id, leaveType, start, end, totalDays, halfDay, halfDay ? halfDayPeriod : '',
      reason, state.hrStatus, state.gmStatus, state.directorStatus, state.overallStatus, state.currentApproverRole
    ]);

    const leaveId = leaveRows[0].id;

    // Insert initial 'Applied' action history entry
    await client.query(`
      INSERT INTO leave_action_history (leave_id, action, by_employee_id, by_name, by_role, remarks)
      VALUES ($1, 'Applied', $2, $3, $4, $5)
    `, [leaveId, req.user._id, req.user.name, req.user.role, reason]);

    // Auto-approve for Director/SuperUser
    if (state.overallStatus === 'Approved') {
      await client.query(`
        INSERT INTO leave_action_history (leave_id, action, by_employee_id, by_name, by_role, remarks)
        VALUES ($1, 'Approved', $2, $3, $4, 'Auto-approved for senior role')
      `, [leaveId, req.user._id, req.user.name, req.user.role]);
    }

    await client.query('COMMIT');

    const leave = await fetchLeaveWithEmployee(leaveId);
    res.status(201).json(new ApiResponse(201, leave, 'Leave applied successfully'));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET MY LEAVES
// ─────────────────────────────────────────────────────────────────────────────
export const getMyLeaves = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, year } = req.query;

  const conditions = [`l.employee_id = $1`];
  const values = [req.user._id];
  let index = 2;

  if (status && status !== 'All') {
    conditions.push(`l.overall_status = $${index++}`);
    values.push(status);
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM l.start_date) = $${index++}`);
    values.push(parseInt(year));
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const skip = (Number(page) - 1) * Number(limit);

  const baseQuery = `
    FROM leaves l
    LEFT JOIN employees e ON l.employee_id = e.id
    LEFT JOIN leave_action_history lah ON lah.leave_id = l.id
    ${whereClause}
  `;

  const countQ = `SELECT COUNT(DISTINCT l.id) ${baseQuery.split('LEFT JOIN leave_action_history')[0]}`;
  const dataQ = `
    SELECT 
      l.*,
      e.name AS emp_name, e.employee_code AS emp_code, e.department AS emp_department,
      e.role AS emp_role, e.profile_image_url AS emp_profile_image_url,
      COALESCE(
        json_agg(
          json_build_object('action', lah.action, 'byEmployeeId', lah.by_employee_id, 'byName', lah.by_name, 'byRole', lah.by_role, 'remarks', lah.remarks, 'timestamp', lah.timestamp)
          ORDER BY lah.timestamp ASC
        ) FILTER (WHERE lah.id IS NOT NULL), '[]'
      ) AS action_history
    ${baseQuery}
    GROUP BY l.id, e.name, e.employee_code, e.department, e.role, e.profile_image_url
    ORDER BY l.created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countQ, values),
    query(dataQ, [...values, limit, skip]),
  ]);

  const total = parseInt(countRes.rows[0].count);
  const leaves = dataRes.rows.map(formatLeave);

  // Summary counts
  const { rows: summaryRows } = await query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE overall_status = 'Approved') AS approved,
      COUNT(*) FILTER (WHERE overall_status = 'Pending') AS pending,
      COUNT(*) FILTER (WHERE overall_status = 'Rejected') AS rejected,
      COUNT(*) FILTER (WHERE overall_status = 'Cancelled') AS cancelled
    FROM leaves WHERE employee_id = $1
  `, [req.user._id]);

  const s = summaryRows[0];

  res.json(
    new ApiResponse(200, {
      leaves, total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        total: parseInt(s.total), approved: parseInt(s.approved),
        pending: parseInt(s.pending), rejected: parseInt(s.rejected), cancelled: parseInt(s.cancelled),
      },
    }, 'My leaves fetched')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET PENDING LEAVES (for approvers)
// ─────────────────────────────────────────────────────────────────────────────
export const getPendingLeaves = asyncHandler(async (req, res) => {
  const role = req.user.role;
  let condition = '';

  switch (role) {
    case 'HR': condition = `l.hr_status = 'Pending' AND l.overall_status = 'Pending'`; break;
    case 'GM':
    case 'Manager': condition = `l.hr_status IN ('Approved', '-') AND l.gm_status = 'Pending' AND l.overall_status = 'Pending'`; break;
    case 'VP':
    case 'Director': condition = `l.hr_status IN ('Approved', '-') AND l.gm_status IN ('Approved', '-') AND l.director_status = 'Pending' AND l.overall_status = 'Pending'`; break;
    case 'SuperUser': condition = `l.overall_status = 'Pending'`; break;
    default: throw new ApiError(403, 'You do not have approval permissions');
  }

  const { rows } = await query(`
    SELECT 
      l.*,
      e.name AS emp_name, e.employee_code AS emp_code, e.department AS emp_department,
      e.role AS emp_role, e.profile_image_url AS emp_profile_image_url,
      COALESCE(
        json_agg(json_build_object('action', lah.action, 'byEmployeeId', lah.by_employee_id, 'byName', lah.by_name, 'byRole', lah.by_role, 'remarks', lah.remarks, 'timestamp', lah.timestamp) ORDER BY lah.timestamp ASC)
        FILTER (WHERE lah.id IS NOT NULL), '[]'
      ) AS action_history
    FROM leaves l
    LEFT JOIN employees e ON l.employee_id = e.id
    LEFT JOIN leave_action_history lah ON lah.leave_id = l.id
    WHERE ${condition}
    GROUP BY l.id, e.name, e.employee_code, e.department, e.role, e.profile_image_url
    ORDER BY l.created_at DESC
  `);

  res.json(new ApiResponse(200, rows.map(formatLeave), 'Pending leaves fetched'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL LEAVES (admin/HR view)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllLeaves = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, status, leaveType, department, employeeId, year, month } = req.query;

  const conditions = [];
  const values = [];
  let index = 1;

  if (status && status !== 'All') { conditions.push(`l.overall_status = $${index++}`); values.push(status); }
  if (leaveType) { conditions.push(`l.leave_type = $${index++}`); values.push(leaveType); }
  if (employeeId) { conditions.push(`l.employee_id = $${index++}`); values.push(employeeId); }
  if (department) { conditions.push(`e.department = $${index++}`); values.push(department); }

  if (year || month) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : null;
    if (m) {
      conditions.push(`l.start_date >= $${index++} AND l.start_date <= $${index++}`);
      values.push(new Date(y, m - 1, 1), new Date(y, m, 0));
    } else {
      conditions.push(`EXTRACT(YEAR FROM l.start_date) = $${index++}`);
      values.push(y);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const skip = (Number(page) - 1) * Number(limit);

  const countQ = `SELECT COUNT(DISTINCT l.id) FROM leaves l LEFT JOIN employees e ON l.employee_id = e.id ${whereClause}`;
  const dataQ = `
    SELECT 
      l.*,
      e.name AS emp_name, e.employee_code AS emp_code, e.department AS emp_department,
      e.role AS emp_role, e.profile_image_url AS emp_profile_image_url,
      COALESCE(
        json_agg(json_build_object('action', lah.action, 'byEmployeeId', lah.by_employee_id, 'byName', lah.by_name, 'byRole', lah.by_role, 'remarks', lah.remarks, 'timestamp', lah.timestamp) ORDER BY lah.timestamp ASC)
        FILTER (WHERE lah.id IS NOT NULL), '[]'
      ) AS action_history
    FROM leaves l
    LEFT JOIN employees e ON l.employee_id = e.id
    LEFT JOIN leave_action_history lah ON lah.leave_id = l.id
    ${whereClause}
    GROUP BY l.id, e.name, e.employee_code, e.department, e.role, e.profile_image_url
    ORDER BY l.created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countQ, values),
    query(dataQ, [...values, limit, skip]),
  ]);

  const total = parseInt(countRes.rows[0].count);
  res.json(
    new ApiResponse(200, {
      leaves: dataRes.rows.map(formatLeave), total,
      page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)),
    }, 'All leaves fetched')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET LEAVE BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await fetchLeaveWithEmployee(req.params.id);
  if (!leave) throw new ApiError(404, 'Leave not found');

  const isOwner = leave.employeeId._id?.toString() === req.user._id.toString();
  const isApprover = APPROVER_ROLES.includes(req.user.role);
  if (!isOwner && !isApprover) throw new ApiError(403, 'Access denied');

  res.json(new ApiResponse(200, leave, 'Leave fetched'));
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const approveLeave = asyncHandler(async (req, res) => {
  const { remarks = '' } = req.body;

  const { rows: leaveRows } = await query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
  const leave = leaveRows[0];
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.overall_status !== 'Pending') throw new ApiError(400, `Leave is already ${leave.overall_status}`);

  const approverRole = req.user.role;
  const updates = {};

  switch (approverRole) {
    case 'HR':
      if (leave.hr_status !== 'Pending') throw new ApiError(400, 'Leave is not pending HR approval');
      updates.hr_status = 'Approved'; updates.hr_remarks = remarks; break;
    case 'GM':
    case 'Manager':
      if (leave.gm_status !== 'Pending') throw new ApiError(400, 'Leave is not pending GM approval');
      updates.gm_status = 'Approved'; updates.gm_remarks = remarks; break;
    case 'VP':
    case 'Director':
      if (leave.director_status !== 'Pending') throw new ApiError(400, 'Leave is not pending Director/VP approval');
      updates.director_status = 'Approved'; updates.director_remarks = remarks; break;
    case 'SuperUser':
      if (leave.hr_status === 'Pending') updates.hr_status = 'Approved';
      if (leave.gm_status === 'Pending') updates.gm_status = 'Approved';
      if (leave.director_status === 'Pending') updates.director_status = 'Approved';
      updates.hr_remarks = remarks; updates.gm_remarks = remarks; updates.director_remarks = remarks;
      break;
    default:
      throw new ApiError(403, 'You do not have approval permissions');
  }

  // Compute merged state
  const newHr = updates.hr_status ?? leave.hr_status;
  const newGm = updates.gm_status ?? leave.gm_status;
  const newDirector = updates.director_status ?? leave.director_status;

  const allDone =
    (newHr === 'Approved' || newHr === '-') &&
    (newGm === 'Approved' || newGm === '-') &&
    (newDirector === 'Approved' || newDirector === '-');

  if (allDone) {
    updates.overall_status = 'Approved';
    updates.current_approver_role = 'Completed';
  } else {
    const effectiveRole = approverRole === 'SuperUser' ? 'Director' : approverRole;
    updates.current_approver_role = getNextApproverRole(effectiveRole, newHr, newGm, newDirector);
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = [req.params.id, ...Object.values(updates)];

  await query(`UPDATE leaves SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, vals);

  await query(`
    INSERT INTO leave_action_history (leave_id, action, by_employee_id, by_name, by_role, remarks)
    VALUES ($1, 'Approved', $2, $3, $4, $5)
  `, [req.params.id, req.user._id, req.user.name, req.user.role, remarks]);

  const updated = await fetchLeaveWithEmployee(req.params.id);
  res.json(new ApiResponse(200, updated, 'Leave approved successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// REJECT LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const rejectLeave = asyncHandler(async (req, res) => {
  const { remarks = '' } = req.body;

  const { rows: leaveRows } = await query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
  const leave = leaveRows[0];
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.overall_status !== 'Pending') throw new ApiError(400, `Leave is already ${leave.overall_status}`);

  const approverRole = req.user.role;
  if (!APPROVER_ROLES.includes(approverRole)) throw new ApiError(403, 'You do not have rejection permissions');

  const updates = { overall_status: 'Rejected', current_approver_role: 'Completed' };

  switch (approverRole) {
    case 'HR': updates.hr_status = 'Rejected'; updates.hr_remarks = remarks; break;
    case 'GM': case 'Manager': updates.gm_status = 'Rejected'; updates.gm_remarks = remarks; break;
    case 'VP': case 'Director': updates.director_status = 'Rejected'; updates.director_remarks = remarks; break;
    case 'SuperUser':
      if (leave.hr_status === 'Pending') updates.hr_status = 'Rejected';
      if (leave.gm_status === 'Pending') updates.gm_status = 'Rejected';
      if (leave.director_status === 'Pending') updates.director_status = 'Rejected';
      break;
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
  await query(`UPDATE leaves SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id, ...Object.values(updates)]);

  await query(`
    INSERT INTO leave_action_history (leave_id, action, by_employee_id, by_name, by_role, remarks)
    VALUES ($1, 'Rejected', $2, $3, $4, $5)
  `, [req.params.id, req.user._id, req.user.name, req.user.role, remarks]);

  const updated = await fetchLeaveWithEmployee(req.params.id);
  res.json(new ApiResponse(200, updated, 'Leave rejected'));
});

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const cancelLeave = asyncHandler(async (req, res) => {
  const { reason = '' } = req.body;

  const { rows: leaveRows } = await query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
  const leave = leaveRows[0];
  if (!leave) throw new ApiError(404, 'Leave not found');

  const isOwner = leave.employee_id.toString() === req.user._id.toString();
  const isAdmin = ADMIN_ROLES.includes(req.user.role);
  if (!isOwner && !isAdmin) throw new ApiError(403, 'You can only cancel your own leave');

  if (leave.overall_status !== 'Pending') {
    throw new ApiError(400, `Cannot cancel a leave that is already ${leave.overall_status}`);
  }

  const now = new Date();
  await query(`
    UPDATE leaves SET
      overall_status = 'Cancelled', cancelled_by = $1, cancelled_at = $2,
      cancel_reason = $3, current_approver_role = 'Completed', updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [req.user._id, now, reason, req.params.id]);

  await query(`
    INSERT INTO leave_action_history (leave_id, action, by_employee_id, by_name, by_role, remarks)
    VALUES ($1, 'Cancelled', $2, $3, $4, $5)
  `, [req.params.id, req.user._id, req.user.name, req.user.role, reason]);

  const updated = await fetchLeaveWithEmployee(req.params.id);
  res.json(new ApiResponse(200, updated, 'Leave cancelled'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET LEAVE STATS (for HR/Director dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaveStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { rows: statsRows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE overall_status = 'Pending') AS total_pending,
      COUNT(*) FILTER (WHERE hr_status = 'Pending' AND overall_status = 'Pending') AS hr_pending,
      COUNT(*) FILTER (WHERE hr_status IN ('Approved','-') AND gm_status = 'Pending' AND overall_status = 'Pending') AS gm_pending,
      COUNT(*) FILTER (WHERE hr_status IN ('Approved','-') AND gm_status IN ('Approved','-') AND director_status = 'Pending' AND overall_status = 'Pending') AS director_pending,
      COUNT(*) FILTER (WHERE overall_status = 'Approved' AND start_date >= $1 AND start_date <= $2) AS approved_this_month,
      COUNT(*) FILTER (WHERE overall_status = 'Rejected' AND start_date >= $1 AND start_date <= $2) AS rejected_this_month,
      COUNT(*) FILTER (WHERE start_date >= $1 AND start_date <= $2) AS total_this_month
    FROM leaves
  `, [startOfMonth, endOfMonth]);

  const { rows: byType } = await query(`
    SELECT leave_type AS "_id", COUNT(*) AS count FROM leaves GROUP BY leave_type
  `);
  const { rows: byStatus } = await query(`
    SELECT overall_status AS "_id", COUNT(*) AS count FROM leaves GROUP BY overall_status
  `);

  const s = statsRows[0];
  res.json(
    new ApiResponse(200, {
      totalPending: parseInt(s.total_pending),
      pendingByStage: { hr: parseInt(s.hr_pending), gm: parseInt(s.gm_pending), director: parseInt(s.director_pending) },
      thisMonth: {
        total: parseInt(s.total_this_month),
        approved: parseInt(s.approved_this_month),
        rejected: parseInt(s.rejected_this_month),
      },
      byType: byType.map((r) => ({ _id: r._id, count: parseInt(r.count) })),
      byStatus: byStatus.map((r) => ({ _id: r._id, count: parseInt(r.count) })),
    }, 'Leave stats fetched')
  );
});
