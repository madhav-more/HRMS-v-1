import api from './axios';

// ── APPLY FOR LEAVE ──
export const applyLeave = (data) => api.post('/leaves/apply', data);

// ── MY LEAVES ──
export const getMyLeaves = (params = {}) => api.get('/leaves/my', { params });

// ── PENDING LEAVES (for approvers) ──
export const getPendingLeaves = () => api.get('/leaves/pending');

// ── ALL LEAVES (admin/HR view) ──
export const getAllLeaves = (params = {}) => api.get('/leaves/all', { params });

// ── LEAVE BY ID ──
export const getLeaveById = (id) => api.get(`/leaves/${id}`);

// ── APPROVE ──
export const approveLeave = (id, remarks = '') =>
  api.patch(`/leaves/${id}/approve`, { remarks });

// ── REJECT ──
export const rejectLeave = (id, remarks = '') =>
  api.patch(`/leaves/${id}/reject`, { remarks });

// ── CANCEL ──
export const cancelLeave = (id, reason = '') =>
  api.patch(`/leaves/${id}/cancel`, { reason });

// ── STATS ──
export const getLeaveStats = () => api.get('/leaves/stats');
