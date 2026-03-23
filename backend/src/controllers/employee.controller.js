import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { CAN_CREATE_EMPLOYEE, CAN_EDIT_EMPLOYEE } from '../middleware/role.middleware.js';
import { config } from '../config/index.js';

const SELECT_SAFE_EMPLOYEE = `
  id AS "_id", 
  employee_code AS "employeeCode", role, status, deactivate_reason AS "deactivateReason",
  name, email, mobile_number AS "mobileNumber", alternate_mobile_number AS "alternateMobileNumber",
  gender, blood_group AS "bloodGroup", date_of_birth AS "dateOfBirth", marital_status AS "maritalStatus",
  profile_image_url AS "profileImageUrl", father_name AS "fatherName", mother_name AS "motherName",
  current_address AS "currentAddress", permanent_address AS "permanentAddress", district, state, pincode,
  joining_date AS "joiningDate", department, position, salary, reporting_manager AS "reportingManager",
  manager_id AS "managerId", experience_type AS "experienceType", total_experience_years AS "totalExperienceYears",
  last_company_name AS "lastCompanyName", experience_certificate_url AS "experienceCertificateUrl",
  hsc_percent AS "hscPercent", graduation_course AS "graduationCourse", graduation_percent AS "graduationPercent",
  post_graduation_course AS "postGraduationCourse", post_graduation_percent AS "postGraduationPercent",
  aadhaar_number AS "aadhaarNumber", pan_number AS "panNumber", aadhaar_file_url AS "aadhaarFileUrl",
  pan_file_url AS "panFileUrl", passbook_file_url AS "passbookFileUrl", tenth_marksheet_url AS "tenthMarksheetUrl",
  twelfth_marksheet_url AS "twelfthMarksheetUrl", graduation_marksheet_url AS "graduationMarksheetUrl",
  post_graduation_marksheet_url AS "postGraduationMarksheetUrl", medical_document_url AS "medicalDocumentUrl",
  account_holder_name AS "accountHolderName", bank_name AS "bankName", account_number AS "accountNumber",
  ifsc, branch, bank_verified AS "bankVerified", bank_verified_date AS "bankVerifiedDate",
  aadhaar_verified AS "aadhaarVerified", pan_verified AS "panVerified", aadhaar_verified_date AS "aadhaarVerifiedDate",
  pan_verified_date AS "panVerifiedDate", emergency_contact_name AS "emergencyContactName",
  emergency_contact_relationship AS "emergencyContactRelationship", emergency_contact_mobile AS "emergencyContactMobile",
  emergency_contact_address AS "emergencyContactAddress", has_disease AS "hasDisease", disease_name AS "diseaseName",
  disease_type AS "diseaseType", disease_since AS "diseaseSince", medicines_required AS "medicinesRequired",
  doctor_name AS "doctorName", doctor_contact AS "doctorContact", comp_off_balance AS "compOffBalance",
  last_working_date AS "lastWorkingDate"
`;

const generateNextCode = async () => {
  const prefix = config.company.prefix;
  const { rows } = await query(
    'SELECT employee_code FROM employees ORDER BY employee_code DESC LIMIT 1'
  );
  if (rows.length === 0) return `${prefix}00001`;
  const lastCode = rows[0].employee_code;
  const num = parseInt(lastCode.substring(prefix.length)) + 1;
  return `${prefix}${String(num).padStart(5, '0')}`;
};

// ─── GET ALL EMPLOYEES ────────────────────────────────────────────────────────
export const getAllEmployees = asyncHandler(async (req, res) => {
  const { search, status, department, role, page = 1, limit = 20 } = req.query;
  
  const conditions = [];
  const values = [];
  let index = 1;

  if (status) {
    conditions.push(`status = $${index++}`);
    values.push(status);
  }
  if (department) {
    conditions.push(`department ILIKE $${index++}`);
    values.push(`%${department}%`);
  }
  if (role) {
    conditions.push(`role = $${index++}`);
    values.push(role);
  }
  if (search) {
    conditions.push(`(name ILIKE $${index} OR employee_code ILIKE $${index} OR email ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const skip = (Number(page) - 1) * Number(limit);

  // Use parallel queries for count and data
  const countQuery = `SELECT COUNT(*) FROM employees ${whereClause}`;
  const dataQuery = `
    SELECT ${SELECT_SAFE_EMPLOYEE} 
    FROM employees ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT $${index} OFFSET $${index + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    query(countQuery, values),
    query(dataQuery, [...values, limit, skip])
  ]);

  const total = parseInt(countRes.rows[0].count);
  const employees = dataRes.rows;

  res.json(
    new ApiResponse(200, {
      employees,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    }, 'Employees fetched')
  );
});

// ─── GET NEXT EMPLOYEE CODE ───────────────────────────────────────────────────
export const getNextEmployeeCode = asyncHandler(async (req, res) => {
  const nextCode = await generateNextCode();
  res.json(new ApiResponse(200, { nextCode }, 'Next employee code generated'));
});

// ─── GET EMPLOYEE BY ID ───────────────────────────────────────────────────────
export const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(`SELECT ${SELECT_SAFE_EMPLOYEE} FROM employees WHERE id = $1`, [id]);
  const employee = rows[0];

  if (!employee) throw new ApiError(404, 'Employee not found');

  // Employees/Interns can only view themselves
  if (['Employee', 'Intern'].includes(req.user.role) &&
    employee._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  res.json(new ApiResponse(200, employee, 'Employee fetched'));
});

// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────────
export const createEmployee = asyncHandler(async (req, res) => {
  // Role check
  if (!CAN_CREATE_EMPLOYEE.includes(req.user.role)) {
    throw new ApiError(403, 'Insufficient permissions to create employee');
  }

  const body = req.body;
  const files = req.files || {};

  // ── CHECK UNIQUE ──
  const { rows: existingRows } = await query(
    'SELECT email, mobile_number FROM employees WHERE email = $1 OR mobile_number = $2',
    [body.email, body.mobileNumber]
  );
  if (existingRows.length > 0) {
    if (existingRows.some((r) => r.email === body.email)) throw new ApiError(409, 'Email already exists');
    if (existingRows.some((r) => r.mobile_number === body.mobileNumber)) throw new ApiError(409, 'Mobile number already exists');
  }

  // ── GENERATE CODE ──
  const employeeCode = await generateNextCode();

  // ── UPLOAD PROFILE IMAGE ──
  let profileImageUrl;
  if (files.profileImage?.[0]) {
    const result = await uploadToCloudinary(files.profileImage[0].buffer, {
      folder: `hrms/employees/${employeeCode}`,
      public_id: 'profile',
    });
    profileImageUrl = result.secure_url;
  }

  // ── UPLOAD OTHER DOCS ──
  const docUploads = {};
  const docFields = ['aadhaarFile', 'panFile', 'passbookFile', 'tenthMarksheet',
    'twelfthMarksheet', 'graduationMarksheet', 'postGraduationMarksheet',
    'medicalDocument', 'experienceCertificate'];

  for (const field of docFields) {
    if (files[field]?.[0]) {
      const result = await uploadToCloudinary(files[field][0].buffer, {
        folder: `hrms/employees/${employeeCode}/docs`,
        public_id: field,
      });
      docUploads[`${field}Url`] = result.secure_url; // mapped to variable
    }
  }

  const hashedPassword = await bcrypt.hash(body.password || '123456', 12);

  // Mapping JS request body variables to PostgreSQL column names
  const cols = [
    'employee_code', 'password', 'role', 'status', 'name', 'email', 'mobile_number', 'alternate_mobile_number',
    'gender', 'date_of_birth', 'marital_status', 'father_name', 'mother_name',
    'current_address', 'permanent_address', 'district', 'state', 'pincode',
    'joining_date', 'department', 'position', 'salary', 'reporting_manager', 
    'experience_type', 'total_experience_years', 'last_company_name',
    'hsc_percent', 'graduation_course', 'graduation_percent', 'post_graduation_course', 'post_graduation_percent',
    'aadhaar_number', 'pan_number', 'account_holder_name', 'bank_name', 'account_number', 'ifsc', 'branch',
    'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_mobile', 'emergency_contact_address',
    'has_disease', 'disease_name', 'profile_image_url', 
    'aadhaar_file_url', 'pan_file_url', 'passbook_file_url', 'tenth_marksheet_url', 'twelfth_marksheet_url',
    'graduation_marksheet_url', 'post_graduation_marksheet_url', 'medical_document_url', 'experience_certificate_url'
  ];

  const vals = [
    employeeCode, hashedPassword, body.role || 'Employee', 'Active', body.name, body.email, body.mobileNumber, body.alternateMobileNumber || null,
    body.gender || null, body.dateOfBirth || null, body.maritalStatus || null, body.fatherName || null, body.motherName || null,
    body.currentAddress || null, body.permanentAddress || null, body.district || null, body.state || null, body.pincode || null,
    body.joiningDate || null, body.department || null, body.position || null, body.salary || null, body.reportingManager || null,
    body.experienceType || null, body.totalExperienceYears || null, body.lastCompanyName || null,
    body.hscPercent || null, body.graduationCourse || null, body.graduationPercent || null, body.postGraduationCourse || null, body.postGraduationPercent || null,
    body.aadhaarNumber || null, body.panNumber || null, body.accountHolderName || null, body.bankName || null, body.accountNumber || null, body.ifsc || null, body.branch || null,
    body.emergencyContactName || null, body.emergencyContactRelationship || null, body.emergencyContactMobile || null, body.emergencyContactAddress || null,
    body.hasDisease || 'No', body.diseaseName || null, profileImageUrl || null,
    docUploads.aadhaarFileUrl || null, docUploads.panFileUrl || null, docUploads.passbookFileUrl || null, docUploads.tenthMarksheetUrl || null, docUploads.twelfthMarksheetUrl || null,
    docUploads.graduationMarksheetUrl || null, docUploads.postGraduationMarksheetUrl || null, docUploads.medicalDocumentUrl || null, docUploads.experienceCertificateUrl || null
  ];

  const valuePlaceholders = vals.map((_, i) => `$${i + 1}`).join(', ');

  const insertQuery = `
    INSERT INTO employees (${cols.join(', ')})
    VALUES (${valuePlaceholders})
    RETURNING ${SELECT_SAFE_EMPLOYEE};
  `;

  const { rows } = await query(insertQuery, vals);
  const employee = rows[0];

  res.status(201).json(
    new ApiResponse(201, employee, 'Employee created successfully')
  );
});

// ─── UPDATE EMPLOYEE ──────────────────────────────────────────────────────────
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const files = req.files || {};

  const { rows: empRows } = await query('SELECT employee_code FROM employees WHERE id = $1', [id]);
  if (empRows.length === 0) throw new ApiError(404, 'Employee not found');
  const employeeCode = empRows[0].employee_code;

  // Role check  
  if (!CAN_EDIT_EMPLOYEE.includes(req.user.role)) {
    throw new ApiError(403, 'Insufficient permissions to edit employee');
  }

  const updates = [];
  const values = [];
  let index = 1;

  // ── UPDATE PROFILE IMAGE ──
  if (files.profileImage?.[0]) {
    const result = await uploadToCloudinary(files.profileImage[0].buffer, {
      folder: `hrms/employees/${employeeCode}`,
      public_id: 'profile',
    });
    updates.push(`profile_image_url = $${index++}`);
    values.push(result.secure_url);
  }

  // ── UPDATE OTHER DOCS ──
  const docFields = [
    { reqField: 'aadhaarFile', dbCol: 'aadhaar_file_url' },
    { reqField: 'panFile', dbCol: 'pan_file_url' },
    { reqField: 'passbookFile', dbCol: 'passbook_file_url' },
    { reqField: 'tenthMarksheet', dbCol: 'tenth_marksheet_url' },
    { reqField: 'twelfthMarksheet', dbCol: 'twelfth_marksheet_url' },
    { reqField: 'graduationMarksheet', dbCol: 'graduation_marksheet_url' },
    { reqField: 'postGraduationMarksheet', dbCol: 'post_graduation_marksheet_url' },
    { reqField: 'medicalDocument', dbCol: 'medical_document_url' },
    { reqField: 'experienceCertificate', dbCol: 'experience_certificate_url' },
  ];

  for (const field of docFields) {
    if (files[field.reqField]?.[0]) {
      const result = await uploadToCloudinary(files[field.reqField][0].buffer, {
        folder: `hrms/employees/${employeeCode}/docs`,
        public_id: field.reqField,
      });
      updates.push(`${field.dbCol} = $${index++}`);
      values.push(result.secure_url);
    }
  }

  // ── APPLY UPDATES ──
  const fieldMapping = {
    name: 'name', email: 'email', mobileNumber: 'mobile_number', alternateMobileNumber: 'alternate_mobile_number',
    gender: 'gender', dateOfBirth: 'date_of_birth', maritalStatus: 'marital_status', fatherName: 'father_name', motherName: 'mother_name',
    currentAddress: 'current_address', permanentAddress: 'permanent_address', district: 'district', state: 'state', pincode: 'pincode',
    joiningDate: 'joining_date', department: 'department', position: 'position', role: 'role', salary: 'salary', reportingManager: 'reporting_manager',
    experienceType: 'experience_type', totalExperienceYears: 'total_experience_years', lastCompanyName: 'last_company_name',
    hscPercent: 'hsc_percent', graduationCourse: 'graduation_course', graduationPercent: 'graduation_percent',
    postGraduationCourse: 'post_graduation_course', postGraduationPercent: 'post_graduation_percent',
    aadhaarNumber: 'aadhaar_number', panNumber: 'pan_number', accountHolderName: 'account_holder_name', bankName: 'bank_name',
    accountNumber: 'account_number', ifsc: 'ifsc', branch: 'branch',
    emergencyContactName: 'emergency_contact_name', emergencyContactRelationship: 'emergency_contact_relationship',
    emergencyContactMobile: 'emergency_contact_mobile', emergencyContactAddress: 'emergency_contact_address',
    hasDisease: 'has_disease', diseaseName: 'disease_name', diseaseType: 'disease_type', diseaseSince: 'disease_since',
    medicinesRequired: 'medicines_required', doctorName: 'doctor_name', doctorContact: 'doctor_contact'
  };

  for (const [jsKey, dbCol] of Object.entries(fieldMapping)) {
    if (body[jsKey] !== undefined) {
      if (body[jsKey] === '') {
        updates.push(`${dbCol} = NULL`);
      } else {
        updates.push(`${dbCol} = $${index++}`);
        values.push(body[jsKey]);
      }
    }
  }

  // ── PASSWORD UPDATE ──
  if (body.password) {
    if (body.password !== body.confirmPassword) {
      throw new ApiError(400, 'Passwords do not match');
    }
    const hashedPassword = await bcrypt.hash(body.password, 12);
    updates.push(`password = $${index++}`);
    values.push(hashedPassword);
  }

  let finalEmployee;
  if (updates.length > 0) {
    const updateQuery = `
      UPDATE employees 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${index} 
      RETURNING ${SELECT_SAFE_EMPLOYEE};
    `;
    values.push(id);
    const { rows: updatedRows } = await query(updateQuery, values);
    finalEmployee = updatedRows[0];
  } else {
    const { rows: existing } = await query(`SELECT ${SELECT_SAFE_EMPLOYEE} FROM employees WHERE id = $1`, [id]);
    finalEmployee = existing[0];
  }

  res.json(new ApiResponse(200, finalEmployee, 'Employee updated successfully'));
});

// ─── TOGGLE EMPLOYEE STATUS ───────────────────────────────────────────────────
export const toggleEmployeeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!CAN_EDIT_EMPLOYEE.includes(req.user.role)) {
    throw new ApiError(403, 'Insufficient permissions to change employee status');
  }

  const deactivateReason = status === 'Inactive' ? (reason || 'No reason provided') : null;

  const { rows } = await query(`
    UPDATE employees 
    SET status = $1, deactivate_reason = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3 
    RETURNING ${SELECT_SAFE_EMPLOYEE};
  `, [status, deactivateReason, id]);

  const employee = rows[0];
  if (!employee) throw new ApiError(404, 'Employee not found');

  res.json(new ApiResponse(200, employee, `Employee status changed to ${status}`));
});

// ─── GET DEPARTMENTS ──────────────────────────────────────────────────────────
export const getDepartments = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT DISTINCT department 
    FROM employees 
    WHERE department IS NOT NULL AND department != '' 
    ORDER BY department;
  `);
  
  const departments = rows.map((r) => r.department);
  res.json(new ApiResponse(200, departments, 'Departments fetched'));
});
