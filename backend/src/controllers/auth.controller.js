import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../services/jwt.service.js';
import { uploadToCloudinary, getPublicIdFromUrl, deleteFromCloudinary } from '../services/cloudinary.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const generateTokensForEmployee = async (employeeId, employeeCode, role, name) => {
  const payload = { _id: employeeId, employeeCode, role, name };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ _id: employeeId });

  await query('UPDATE employees SET refresh_token = $1 WHERE id = $2', [refreshToken, employeeId]);

  return { accessToken, refreshToken };
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { employeeCode, password } = req.body;

  if (!employeeCode || !password) {
    throw new ApiError(400, 'Employee code and password are required');
  }

  const { rows } = await query(
    `SELECT 
      id AS "_id", 
      employee_code AS "employeeCode", 
      password, 
      role, 
      name, 
      email, 
      status, 
      department, 
      position, 
      profile_image_url AS "profileImageUrl"
     FROM employees 
     WHERE UPPER(employee_code) = UPPER($1)`,
    [employeeCode.trim()]
  );
  const employee = rows[0];

  if (!employee) throw new ApiError(401, 'Invalid employee code or password');
  if (employee.status !== 'Active') throw new ApiError(403, 'Account is deactivated. Contact HR');

  const isPasswordValid = await bcrypt.compare(password.trim(), employee.password);
  if (!isPasswordValid) {
    console.error(`Login failed for ${employeeCode}: Provided password did not match hash.`);
    throw new ApiError(401, 'Invalid employee code or password');
  }

  const { accessToken, refreshToken } = await generateTokensForEmployee(
    employee._id,
    employee.employeeCode,
    employee.role,
    employee.name
  );

  const safeEmployee = {
    _id: employee._id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department,
    position: employee.position,
    profileImageUrl: employee.profileImageUrl,
  };

  res
    .status(200)
    .cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { employee: safeEmployee, accessToken, refreshToken }, 'Login successful'));
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  await query('UPDATE employees SET refresh_token = NULL WHERE id = $1', [req.user._id]);

  res
    .clearCookie('accessToken', COOKIE_OPTIONS)
    .clearCookie('refreshToken', COOKIE_OPTIONS)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;

  if (!token) throw new ApiError(401, 'Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const { rows } = await query(
    'SELECT id AS "_id", employee_code AS "employeeCode", role, name, refresh_token AS "refreshToken" FROM employees WHERE id = $1',
    [decoded._id]
  );
  const employee = rows[0];

  if (!employee || employee.refreshToken !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await generateTokensForEmployee(employee._id, employee.employeeCode, employee.role, employee.name);

  res
    .status(200)
    .cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', newRefreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed'));
});

// ─── GET ME ───────────────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT 
      id AS "_id", 
      employee_code AS "employeeCode", 
      role, status, deactivate_reason AS "deactivateReason", 
      name, email, mobile_number AS "mobileNumber", alternate_mobile_number AS "alternateMobileNumber", 
      gender, blood_group AS "bloodGroup", date_of_birth AS "dateOfBirth", marital_status AS "maritalStatus", 
      profile_image_url AS "profileImageUrl", 
      father_name AS "fatherName", mother_name AS "motherName", current_address AS "currentAddress", 
      permanent_address AS "permanentAddress", district, state, pincode, 
      joining_date AS "joiningDate", department, position, salary, 
      reporting_manager AS "reportingManager", manager_id AS "managerId", 
      experience_type AS "experienceType", total_experience_years AS "totalExperienceYears", 
      last_company_name AS "lastCompanyName", experience_certificate_url AS "experienceCertificateUrl", 
      hsc_percent AS "hscPercent", graduation_course AS "graduationCourse", 
      graduation_percent AS "graduationPercent", post_graduation_course AS "postGraduationCourse", 
      post_graduation_percent AS "postGraduationPercent", 
      aadhaar_number AS "aadhaarNumber", pan_number AS "panNumber", 
      aadhaar_file_url AS "aadhaarFileUrl", pan_file_url AS "panFileUrl", 
      passbook_file_url AS "passbookFileUrl", tenth_marksheet_url AS "tenthMarksheetUrl", 
      twelfth_marksheet_url AS "twelfthMarksheetUrl", graduation_marksheet_url AS "graduationMarksheetUrl", 
      post_graduation_marksheet_url AS "postGraduationMarksheetUrl", medical_document_url AS "medicalDocumentUrl", 
      account_holder_name AS "accountHolderName", bank_name AS "bankName", account_number AS "accountNumber", 
      ifsc, branch, bank_verified AS "bankVerified", bank_verified_date AS "bankVerifiedDate", 
      aadhaar_verified AS "aadhaarVerified", pan_verified AS "panVerified", 
      aadhaar_verified_date AS "aadhaarVerifiedDate", pan_verified_date AS "panVerifiedDate", 
      emergency_contact_name AS "emergencyContactName", emergency_contact_relationship AS "emergencyContactRelationship", 
      emergency_contact_mobile AS "emergencyContactMobile", emergency_contact_address AS "emergencyContactAddress", 
      has_disease AS "hasDisease", disease_name AS "diseaseName", disease_type AS "diseaseType", 
      disease_since AS "diseaseSince", medicines_required AS "medicinesRequired", 
      doctor_name AS "doctorName", doctor_contact AS "doctorContact", 
      comp_off_balance AS "compOffBalance", last_working_date AS "lastWorkingDate"
     FROM employees 
     WHERE id = $1`,
    [req.user._id]
  );
  
  const employee = rows[0];
  res.json(new ApiResponse(200, employee, 'Profile fetched'));
});

// ─── UPDATE PROFILE (SELF) ────────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { rows: currentRows } = await query('SELECT profile_image_url AS "profileImageUrl" FROM employees WHERE id = $1', [req.user._id]);
  if (!currentRows.length) throw new ApiError(404, 'Employee not found');
  let currentProfileImageUrl = currentRows[0].profileImageUrl;

  const { mobileNumber, currentAddress, permanentAddress, bloodGroup, emergencyContactName, emergencyContactMobile } = req.body;

  const updates = [];
  const values = [];
  let index = 1;

  if (mobileNumber) { updates.push(`mobile_number = $${index++}`); values.push(mobileNumber); }
  if (currentAddress) { updates.push(`current_address = $${index++}`); values.push(currentAddress); }
  if (permanentAddress) { updates.push(`permanent_address = $${index++}`); values.push(permanentAddress); }
  if (bloodGroup) { updates.push(`blood_group = $${index++}`); values.push(bloodGroup); }
  if (emergencyContactName) { updates.push(`emergency_contact_name = $${index++}`); values.push(emergencyContactName); }
  if (emergencyContactMobile) { updates.push(`emergency_contact_mobile = $${index++}`); values.push(emergencyContactMobile); }

  // Handle Cloudinary Upload
  if (req.file) {
    if (currentProfileImageUrl) {
      const oldPublicId = getPublicIdFromUrl(currentProfileImageUrl);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId).catch((err) =>
          console.error('Failed to delete old profile image:', err)
        );
      }
    }
    const result = await uploadToCloudinary(req.file.buffer, { folder: 'hrms_profiles' });
    currentProfileImageUrl = result.secure_url;
    updates.push(`profile_image_url = $${index++}`);
    values.push(currentProfileImageUrl);
  }

  let employee;
  if (updates.length > 0) {
    values.push(req.user._id);
    const updateQuery = `
      UPDATE employees 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${index} 
      RETURNING 
        id AS "_id", employee_code AS "employeeCode", name, email, role, department, position, profile_image_url AS "profileImageUrl"`;
    
    const { rows } = await query(updateQuery, values);
    employee = rows[0];
  } else {
    // If nothing to update, just fetch
    const { rows } = await query(
      `SELECT id AS "_id", employee_code AS "employeeCode", name, email, role, department, position, profile_image_url AS "profileImageUrl" 
       FROM employees WHERE id = $1`,
      [req.user._id]
    );
    employee = rows[0];
  }

  res.json(new ApiResponse(200, employee, 'Profile updated successfully'));
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Both current and new password are required');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const { rows } = await query('SELECT password FROM employees WHERE id = $1', [req.user._id]);
  const employee = rows[0];

  const isValid = await bcrypt.compare(currentPassword, employee.password);
  if (!isValid) throw new ApiError(400, 'Current password is incorrect');

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  await query('UPDATE employees SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedNewPassword, req.user._id]);

  res.json(new ApiResponse(200, null, 'Password changed successfully'));
});
