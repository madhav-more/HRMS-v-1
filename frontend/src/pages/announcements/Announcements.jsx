import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, CalendarDays, Loader2, CheckCircle, Clock, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { getMyAnnouncements, markAsRead } from '../../api/announcement.api';
import { useAuth } from '../../context/AuthContext';

const typeConfig = {
  General: { color: '#3B82F6', bg: '#EFF6FF', icon: Megaphone },
  Urgent: { color: '#EF4444', bg: '#FEF2F2', icon: ShieldAlert },
  Event: { color: '#10B981', bg: '#ECFDF5', icon: CalendarDays },
  'Policy Update': { color: '#8B5CF6', bg: '#F5F3FF', icon: Info },
  Other: { color: '#64748B', bg: '#F8FAFC', icon: Megaphone },
};

const PriorityBadge = ({ priority }) => {
  if (priority === 'Normal') return null;
  const isUrgent = priority === 'Urgent';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 8px', borderRadius: '6px',
      background: isUrgent ? '#FEF2F2' : '#FFFBEB',
      color: isUrgent ? '#EF4444' : '#F59E0B',
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
      border: `1px solid ${isUrgent ? '#FECACA' : '#FDE68A'}`
    }}>
      <AlertTriangle size={12} strokeWidth={3} />
      {priority}
    </div>
  );
};

const Announcements = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMyAnnouncements();
      setAnnouncements(data.data);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      // Optimistically update local state
      setAnnouncements(prev => prev.map(a => 
        a._id === id ? { ...a, readBy: [...a.readBy, user._id] } : a
      ));
      // Dispatch custom event to update AppShell bell icon
      window.dispatchEvent(new Event('announcementsRead'));
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <AppShell>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 4px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #2076C7, #1CADA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(32,118,199,0.3)' }}>
            <Megaphone size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Announcements
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Important updates and broadcasts from management
            </p>
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Loading your feed...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '60px 24px',
            textAlign: 'center', border: '1px solid #E2E8F0', color: '#94A3B8',
          }}>
            <Megaphone size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>You're all caught up!</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>There are no active announcements for you right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {announcements.map((announcement) => {
              const config = typeConfig[announcement.type] || typeConfig.General;
              const TypeIcon = config.icon;
              const isRead = announcement.readBy.some(id => id.toString() === user._id.toString() || id === user._id.toString() || id?._id?.toString() === user._id.toString());
              const isUrgent = announcement.priority === 'Urgent';

              return (
                <div key={announcement._id} style={{
                  background: '#fff', borderRadius: '20px', overflow: 'hidden',
                  border: isUrgent && !isRead ? '2px solid #FECACA' : '1px solid #E2E8F0',
                  boxShadow: isUrgent && !isRead ? '0 8px 24px rgba(239, 68, 68, 0.1)' : '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  
                  {/* Unread indicator dot */}
                  {!isRead && (
                    <div style={{ position: 'absolute', top: '24px', right: '24px', width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', boxShadow: '0 0 0 2px #FECACA' }} title="Unread" />
                  )}

                  {/* Header */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon size={24} />
                    </div>
                    <div style={{ flex: 1, paddingRight: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: config.color, background: config.bg, padding: '4px 10px', borderRadius: '99px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                          {announcement.type}
                        </span>
                        <PriorityBadge priority={announcement.priority} />
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', lineHeight: '1.4' }}>
                        {announcement.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748B', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> {formatDate(announcement.createdAt)}
                        </div>
                        {announcement.createdBy && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
                            <span>Posted by <span style={{ fontWeight: 600, color: '#475569' }}>{announcement.createdBy.name}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '24px', fontSize: '0.95rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {announcement.message}
                  </div>

                  {/* Footer / Actions */}
                  <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {announcement.expiresAt && (
                        <>Valid until {new Date(announcement.expiresAt).toLocaleDateString()}</>
                      )}
                    </div>
                    
                    {!isRead ? (
                      <button
                        onClick={() => handleMarkAsRead(announcement._id)}
                        style={{
                          padding: '8px 16px', borderRadius: '99px', border: '1px solid #2076C7', background: '#EFF6FF',
                          color: '#2076C7', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#2076C7'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2076C7'; }}
                      >
                        <CheckCircle size={16} /> Mark as Read
                      </button>
                    ) : (
                      <div style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Read
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
};

export default Announcements;
