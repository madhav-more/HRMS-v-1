import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayStatus,
  getMySummary,
  getAdminAttendanceList,
} from '../controllers/attendance.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { authorizeRoles, MANAGEMENT_ROLES } from '../middleware/role.middleware.js';

const router = Router();

// All authenticated routes
router.use(verifyJWT);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayStatus);
router.get('/my-summary', getMySummary);

// Admin / Management only
router.get('/admin', authorizeRoles(...MANAGEMENT_ROLES, 'Manager'), getAdminAttendanceList);

export default router;
