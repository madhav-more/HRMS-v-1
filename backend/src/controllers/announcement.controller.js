import { query, pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper to format an announcement row from DB into a JS-friendly shape
const formatAnnouncement = (row) => ({
  _id: row.id,
  title: row.title,
  message: row.message,
  type: row.type,
  priority: row.priority,
  targetType: row.target_type,
  targetDepartments: row.target_departments || [],
  targetRoles: row.target_roles || [],
  targetEmployees: row.target_employees || [],
  expiresAt: row.expires_at,
  isActive: row.is_active,
  readBy: row.read_by || [],
  createdBy: row.created_by_id
    ? { _id: row.created_by_id, name: row.created_by_name, role: row.created_by_role, profileImageUrl: row.created_by_image }
    : row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ANNOUNCEMENT_BASE_SELECT = `
  a.*,
  cb.id AS created_by_id, cb.name AS created_by_name, cb.role AS created_by_role, cb.profile_image_url AS created_by_image,
  COALESCE(
    ARRAY(SELECT ate.employee_id::text FROM announcement_target_employees ate WHERE ate.announcement_id = a.id),
    ARRAY[]::text[]
  ) AS target_employees,
  COALESCE(
    ARRAY(SELECT ars.employee_id::text FROM announcement_read_status ars WHERE ars.announcement_id = a.id),
    ARRAY[]::text[]
  ) AS read_by
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ANNOUNCEMENT (Admin/HR)
// ─────────────────────────────────────────────────────────────────────────────
export const createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title, message, type, priority, targetType,
    targetDepartments, targetRoles, targetEmployees,
    expiresAt, isActive
  } = req.body;

  if (!title || !message || !targetType) {
    throw new ApiError(400, 'Title, message, and targetType are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetDepts = targetType === 'Department' ? (targetDepartments || []) : [];
    const targetRoleArr = targetType === 'Role' ? (targetRoles || []) : [];

    const { rows: annRows } = await client.query(`
      INSERT INTO announcements (title, message, type, priority, target_type, target_departments, target_roles, expires_at, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      title, message, type || 'General', priority || 'Normal', targetType,
      targetDepts, targetRoleArr,
      expiresAt ? new Date(expiresAt) : null,
      isActive !== undefined ? isActive : true,
      req.user._id
    ]);

    const announcementId = annRows[0].id;

    // Insert target employees if applicable
    if (targetType === 'Employee' && targetEmployees?.length > 0) {
      for (const empId of targetEmployees) {
        await client.query(`
          INSERT INTO announcement_target_employees (announcement_id, employee_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [announcementId, empId]);
      }
    }

    await client.query('COMMIT');

    const { rows } = await query(`
      SELECT ${ANNOUNCEMENT_BASE_SELECT}
      FROM announcements a
      LEFT JOIN employees cb ON cb.id = a.created_by
      WHERE a.id = $1
    `, [announcementId]);

    res.status(201).json(new ApiResponse(201, formatAnnouncement(rows[0]), 'Announcement created successfully'));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ANNOUNCEMENTS (Admin/HR Management View)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllAnnouncements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type, priority, isActive } = req.query;

  const conditions = [];
  const values = [];
  let index = 1;

  if (type && type !== 'All') { conditions.push(`a.type = $${index++}`); values.push(type); }
  if (priority && priority !== 'All') { conditions.push(`a.priority = $${index++}`); values.push(priority); }
  if (isActive !== undefined) { conditions.push(`a.is_active = $${index++}`); values.push(isActive === 'true'); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const skip = (Number(page) - 1) * Number(limit);

  const countQ = `SELECT COUNT(*) FROM announcements a ${whereClause}`;
  const dataQ = `
    SELECT ${ANNOUNCEMENT_BASE_SELECT}
    FROM announcements a
    LEFT JOIN employees cb ON cb.id = a.created_by
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countQ, values),
    query(dataQ, [...values, limit, skip]),
  ]);

  const total = parseInt(countRes.rows[0].count);
  res.json(
    new ApiResponse(200, {
      announcements: dataRes.rows.map(formatAnnouncement),
      total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)),
    }, 'Announcements fetched successfully')
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// GET MY ANNOUNCEMENTS (Employee Feed)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAnnouncements = asyncHandler(async (req, res) => {
  const { department, role, _id: userId } = req.user;
  const now = new Date();

  const { rows } = await query(`
    SELECT ${ANNOUNCEMENT_BASE_SELECT}
    FROM announcements a
    LEFT JOIN employees cb ON cb.id = a.created_by
    WHERE a.is_active = true
      AND (a.expires_at IS NULL OR a.expires_at > $1)
      AND (
        a.target_type = 'All'
        OR (a.target_type = 'Department' AND $2 = ANY(a.target_departments))
        OR (a.target_type = 'Role' AND $3 = ANY(a.target_roles))
        OR (a.target_type = 'Employee' AND EXISTS (
          SELECT 1 FROM announcement_target_employees ate
          WHERE ate.announcement_id = a.id AND ate.employee_id = $4
        ))
      )
    ORDER BY
      CASE a.priority WHEN 'Urgent' THEN 1 WHEN 'Important' THEN 2 ELSE 3 END ASC,
      a.created_at DESC
  `, [now, department || '', role, userId]);

  res.json(new ApiResponse(200, rows.map(formatAnnouncement), 'My announcements fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET UNREAD COUNT (For Notification Badge)
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = asyncHandler(async (req, res) => {
  const { department, role, _id: userId } = req.user;
  const now = new Date();

  const { rows } = await query(`
    SELECT COUNT(*) FROM announcements a
    WHERE a.is_active = true
      AND (a.expires_at IS NULL OR a.expires_at > $1)
      AND NOT EXISTS (
        SELECT 1 FROM announcement_read_status ars
        WHERE ars.announcement_id = a.id AND ars.employee_id = $4
      )
      AND (
        a.target_type = 'All'
        OR (a.target_type = 'Department' AND $2 = ANY(a.target_departments))
        OR (a.target_type = 'Role' AND $3 = ANY(a.target_roles))
        OR (a.target_type = 'Employee' AND EXISTS (
          SELECT 1 FROM announcement_target_employees ate
          WHERE ate.announcement_id = a.id AND ate.employee_id = $4
        ))
      )
  `, [now, department || '', role, userId]);

  res.json(new ApiResponse(200, { unreadCount: parseInt(rows[0].count) }, 'Unread count fetched'));
});

// ─────────────────────────────────────────────────────────────────────────────
// MARK AS READ (Employee Action)
// ─────────────────────────────────────────────────────────────────────────────
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const { rows } = await query('SELECT id FROM announcements WHERE id = $1', [id]);
  if (!rows.length) throw new ApiError(404, 'Announcement not found');

  await query(`
    INSERT INTO announcement_read_status (announcement_id, employee_id)
    VALUES ($1, $2)
    ON CONFLICT (announcement_id, employee_id) DO NOTHING
  `, [id, userId]);

  res.json(new ApiResponse(200, null, 'Marked as read'));
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ANNOUNCEMENT (Admin/HR)
// ─────────────────────────────────────────────────────────────────────────────
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent changing immutable fields
  const { title, message, type, priority, targetType, targetDepartments, targetRoles, targetEmployees, expiresAt, isActive } = req.body;

  const { rows: checkRows } = await query('SELECT id FROM announcements WHERE id = $1', [id]);
  if (!checkRows.length) throw new ApiError(404, 'Announcement not found');

  const updates = [];
  const values = [];
  let index = 1;

  if (title !== undefined) { updates.push(`title = $${index++}`); values.push(title); }
  if (message !== undefined) { updates.push(`message = $${index++}`); values.push(message); }
  if (type !== undefined) { updates.push(`type = $${index++}`); values.push(type); }
  if (priority !== undefined) { updates.push(`priority = $${index++}`); values.push(priority); }
  if (isActive !== undefined) { updates.push(`is_active = $${index++}`); values.push(isActive); }
  if (expiresAt !== undefined) { updates.push(`expires_at = $${index++}`); values.push(expiresAt ? new Date(expiresAt) : null); }

  if (targetType !== undefined) {
    updates.push(`target_type = $${index++}`); values.push(targetType);

    const tDepts = targetType === 'Department' ? (targetDepartments || []) : [];
    const tRoles = targetType === 'Role' ? (targetRoles || []) : [];
    updates.push(`target_departments = $${index++}`); values.push(tDepts);
    updates.push(`target_roles = $${index++}`); values.push(tRoles);

    // Sync target employees
    await query('DELETE FROM announcement_target_employees WHERE announcement_id = $1', [id]);
    if (targetType === 'Employee' && targetEmployees?.length > 0) {
      for (const empId of targetEmployees) {
        await query(`
          INSERT INTO announcement_target_employees (announcement_id, employee_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [id, empId]);
      }
    }
  }

  if (updates.length > 0) {
    values.push(id);
    await query(`UPDATE announcements SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index}`, values);
  }

  const { rows } = await query(`
    SELECT ${ANNOUNCEMENT_BASE_SELECT}
    FROM announcements a
    LEFT JOIN employees cb ON cb.id = a.created_by
    WHERE a.id = $1
  `, [id]);

  res.json(new ApiResponse(200, formatAnnouncement(rows[0]), 'Announcement updated successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE ANNOUNCEMENT (Admin/HR)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
  if (!rows.length) throw new ApiError(404, 'Announcement not found');
  res.json(new ApiResponse(200, null, 'Announcement deleted successfully'));
});
