import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Plus, Trash2, Edit2, Users, Loader2, Search, X, CalendarDays, ExternalLink, Activity } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../api/announcement.api';

// Reusing same type styles
const typeColors = {
  General: '#3B82F6', Urgent: '#EF4444', Event: '#10B981', 'Policy Update': '#8B5CF6', Other: '#64748B'
};

const ManageAnnouncements = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Basic Form State
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'General',
    priority: 'Normal',
    targetType: 'All',
    targetDepartments: '', // Stored as comma separated in form for simplicity
    targetRoles: '',
    isActive: true,
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getAllAnnouncements({ limit: 100 });
      setAnnouncements(data.data.announcements);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingId(announcement._id);
      setForm({
        title: announcement.title,
        message: announcement.message,
        type: announcement.type,
        priority: announcement.priority,
        targetType: announcement.targetType,
        targetDepartments: announcement.targetDepartments?.join(', ') || '',
        targetRoles: announcement.targetRoles?.join(', ') || '',
        isActive: announcement.isActive,
      });
    } else {
      setEditingId(null);
      setForm({
        title: '', message: '', type: 'General', priority: 'Normal', 
        targetType: 'All', targetDepartments: '', targetRoles: '', isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    const payload = {
      ...form,
      targetDepartments: form.targetDepartments.split(',').map(s => s.trim()).filter(Boolean),
      targetRoles: form.targetRoles.split(',').map(s => s.trim()).filter(Boolean),
    };

    setLoading(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, payload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement published');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      toast.success('Deleted successfully');
      setAnnouncements(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString();

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 4px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Manage Announcements
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Create and manage company broadcasts
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            style={{
              padding: '12px 24px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #2076C7, #1CADA3)',
              color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(32,118,199,0.3)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={18} strokeWidth={3} />
            New Broadcast
          </button>
        </div>

        {/* List */}
        {loading && announcements.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Loading broadcasts...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '24px', padding: '60px', textAlign: 'center', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
            <Megaphone size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>No announcements</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Click "New Broadcast" to create one.</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Audience</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Stats</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: typeColors[a.type] || '#64748B', background: `${typeColors[a.type] || '#64748B'}15`, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {a.type}
                        </span>
                        {a.priority === 'Urgent' && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FECACA' }}>URGENT</span>}
                        {!a.isActive && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>INACTIVE</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '1.05rem', marginBottom: '4px' }}>{a.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Created {formatDate(a.createdAt)} by {a.createdBy?.name || 'System'}</div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                        <Users size={16} color="#64748B" />
                        {a.targetType === 'All' ? 'Everyone' : a.targetType}
                      </div>
                      {a.targetType === 'Department' && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>{a.targetDepartments.join(', ')}</div>}
                      {a.targetType === 'Role' && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>{a.targetRoles.join(', ')}</div>}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#10B981', fontWeight: 600 }}>
                        <Activity size={16} />
                        {a.readBy.length} Reads
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => handleOpenModal(a)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#3B82F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(a._id)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px', boxSizing: 'border-box',
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto',
            padding: '32px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9',
              border: 'none', width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer',
            }}>
              <X size={18} />
            </button>

            <h2 style={{ margin: '0 0 24px', fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>
              {editingId ? 'Edit Broadcast' : 'Create Broadcast'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>TITLE</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>TYPE</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', background: '#fff' }}>
                    <option>General</option><option>Urgent</option><option>Event</option><option>Policy Update</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>PRIORITY</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', background: '#fff' }}>
                    <option>Normal</option><option>Important</option><option>Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>TARGET AUDIENCE</label>
                <select value={form.targetType} onChange={e => setForm({...form, targetType: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', background: '#fff', marginBottom: '12px' }}>
                  <option value="All">Everyone (Company Wide)</option>
                  <option value="Department">Specific Departments</option>
                  <option value="Role">Specific Roles</option>
                </select>

                {form.targetType === 'Department' && (
                  <input placeholder="e.g., IT, HR, Sales (comma separated)" value={form.targetDepartments} onChange={e => setForm({...form, targetDepartments: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #2076C7', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem', background: '#EFF6FF' }} />
                )}
                {form.targetType === 'Role' && (
                  <input placeholder="e.g., Employee, Manager, Director (comma separated)" value={form.targetRoles} onChange={e => setForm({...form, targetRoles: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #2076C7', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem', background: '#EFF6FF' }} />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>MESSAGE</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="isActive" style={{ fontWeight: 600, color: '#334155', cursor: 'pointer' }}>Active (Visible to target audience)</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#2076C7', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Broadcast'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </AppShell>
  );
};

export default ManageAnnouncements;
