import { verifyAccessToken } from '../services/jwt.service.js';
import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) throw new ApiError(401, 'Unauthorized: No token provided');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Unauthorized: Invalid or expired token');
  }

  const { rows } = await query(
    `SELECT 
      id AS "_id", 
      employee_code AS "employeeCode", 
      role, 
      name, 
      email, 
      department, 
      position, 
      profile_image_url AS "profileImageUrl", 
      status 
     FROM employees 
     WHERE id = $1`,
    [decoded._id]
  );
  
  const employee = rows[0];
  if (!employee) throw new ApiError(401, 'Unauthorized: Employee not found');
  if (employee.status !== 'Active') throw new ApiError(403, 'Account is deactivated');

  req.user = employee;
  next();
});
