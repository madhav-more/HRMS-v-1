import api from './axios';

// ── ADMIN / HR ROUTES ──
export const createAnnouncement = (data) => api.post('/announcements', data);
export const getAllAnnouncements = (params = {}) => api.get('/announcements', { params });
export const updateAnnouncement = (id, data) => api.patch(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// ── EMPLOYEE ROUTES ──
export const getMyAnnouncements = () => api.get('/announcements/my');
export const getUnreadCount = () => api.get('/announcements/unread-count');
export const markAsRead = (id) => api.patch(`/announcements/${id}/read`);
