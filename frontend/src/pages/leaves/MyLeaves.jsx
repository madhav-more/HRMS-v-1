import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Search, Loader2, XCircle, Clock, CheckCircle, FileText, X } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { getMyLeaves, cancelLeave } from '../../api/leave.api';

const statusConfig = {
  Pending: { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  Approved: { color: '#10B981', bg: '#D1FAE5', icon: CheckCircle },
  Rejected: { color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  Cancelled: { color: '#6B7280', bg: '#F3F4F6', icon: FileText },
};

const StatusBadge = ({ status }) => {
  const conf = statusConfig[status] || statusConfig.Pending;
  const Icon = conf.icon;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 12px', borderRadius: '99px',
      background: conf.bg, color: conf.color,
      fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <Icon size={14} strokeWidth={2.5} />
      {status}
    </div>
  );
};

const CancelModal = ({ leave, onClose, onRefresh }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelLeave(leave._id, reason);
      toast.success('Leave request cancelled');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '24px', boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '440px',
        padding: '32px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9',
          border: 'none', width: '32px', height: '32px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748B', cursor: 'pointer', transition: 'all 0.2s',
        }} onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}>
          <X size={18} />
        </button>

        <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>
          Cancel Leave Request
        </h2>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Are you sure you want to cancel this {leave.leaveType} leave?
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            CANCELLATION REASON (OPTIONAL)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you cancelling?"
            rows={3}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              border: '1px solid #E2E8F0', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'Inter, sans-serif', resize: 'vertical',
            }}
            onFocus={e => e.target.style.borderColor = '#2076C7'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0',
            background: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer',
          }}>
            Keep Leave
          </button>
          <button onClick={handleCancel} disabled={loading} style={{
            padding: '12px 24px', borderRadius: '12px', border: 'none',
            background: '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Cancel Leave'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

const SummaryCard = ({ title, count, color }) => (
  <div style={{
    background: '#fff', padding: '24px', borderRadius: '20px',
    border: '1px solid #E2E8F0', flex: '1', minWidth: '160px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }} />
    <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
      {title}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: '1' }}>
      {count}
    </div>
  </div>
);

const MyLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [filter, setFilter] = useState('All');
  const [cancelLeaveObj, setCancelLeaveObj] = useState(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMyLeaves({ status: filter, limit: 50 });
      setLeaves(data.data.leaves);
      // Update summary based on the 'All' fetch or just use what backend sends
      if (data.data.summary) {
        setSummary(data.data.summary);
      }
    } catch (err) {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', padding: '0 4px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              My Leaves
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Track your leave applications and their status
            </p>
          </div>
          <button
            onClick={() => navigate('/leaves/apply')}
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
            Apply Leave
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <SummaryCard title="Total Applied" count={summary.total} color="#3B82F6" />
          <SummaryCard title="Approved" count={summary.approved} color="#10B981" />
          <SummaryCard title="Pending" count={summary.pending} color="#F59E0B" />
          <SummaryCard title="Rejected" count={summary.rejected} color="#EF4444" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
          {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                background: filter === f ? '#2076C7' : '#F1F5F9',
                color: filter === f ? '#fff' : '#64748B',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Loading your leaves...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '60px 24px',
            textAlign: 'center', border: '1px solid #E2E8F0', color: '#94A3B8',
          }}>
            <CalendarDays size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>No leaves found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>You haven't applied for any leaves yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {leaves.map((leave) => (
              <div key={leave._id} style={{
                background: '#fff', borderRadius: '20px', padding: '24px',
                border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)', transition: 'transform 0.2s',
              }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 300px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2076C7',
                  }}>
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>{leave.leaveType}</span>
                      {leave.halfDay && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', background: '#EFF6FF', color: '#3B82F6', borderRadius: '6px', textTransform: 'uppercase' }}>
                          Half Day ({leave.halfDayPeriod})
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>
                      {formatDate(leave.startDate)} {leave.totalDays > 1 ? `to ${formatDate(leave.endDate)}` : ''} • <span style={{ fontWeight: 600 }}>{leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ flex: '1 1 200px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Reason</div>
                  {leave.reason.length > 60 ? `${leave.reason.substring(0, 60)}...` : leave.reason}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Status</div>
                    <StatusBadge status={leave.overallStatus} />
                  </div>
                  
                  <div style={{ width: '40px' }}>
                    {leave.overallStatus === 'Pending' && (
                      <button
                        onClick={() => setCancelLeaveObj(leave)}
                        title="Cancel Request"
                        style={{
                          width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #FEE2E2',
                          background: '#fff', color: '#EF4444', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <XCircle size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
      
      {cancelLeaveObj && (
        <CancelModal
          leave={cancelLeaveObj}
          onClose={() => setCancelLeaveObj(null)}
          onRefresh={fetchLeaves}
        />
      )}
    </AppShell>
  );
};

export default MyLeaves;
