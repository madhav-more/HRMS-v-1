import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, CalendarDays, X, Clock, FileText, ChevronRight } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { getPendingLeaves, approveLeave, rejectLeave } from '../../api/leave.api';
import { useAuth } from '../../context/AuthContext';

const ActionModal = ({ leave, actionType, onClose, onRefresh }) => {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const isApprove = actionType === 'Approve';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isApprove) {
        await approveLeave(leave._id, remarks);
        toast.success('Leave approved successfully');
      } else {
        await rejectLeave(leave._id, remarks);
        toast.success('Leave rejected');
      }
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionType.toLowerCase()} leave`);
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer',
        }}>
          <X size={18} />
        </button>

        <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>
          {actionType} Leave Request
        </h2>
        <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '0.9rem', lineHeight: '1.5' }}>
          {isApprove ? 'Add optional remarks for the applicant.' : 'Please add remarks explaining the rejection.'}
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            REMARKS {isApprove ? '(OPTIONAL)' : '(REQUIRED)'}
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={`E.g., ${isApprove ? 'Enjoy your leave!' : 'Insufficient leave balance...'}`}
            rows={3}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px', boxSizing: 'border-box',
              border: '1px solid #E2E8F0', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical',
            }}
            onFocus={e => e.target.style.borderColor = '#2076C7'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '12px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!isApprove && !remarks.trim())}
            style={{
              padding: '12px 24px', borderRadius: '12px', border: 'none',
              background: isApprove ? '#10B981' : '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', opacity: (loading || (!isApprove && !remarks.trim())) ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : isApprove ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
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

const LeaveApproval = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [modalState, setModalState] = useState({ show: false, leave: null, actionType: null });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getPendingLeaves();
      setLeaves(data.data);
    } catch (err) {
      toast.error('Failed to load pending leaves');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', padding: '0 4px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Leave Approvals
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Pending requests awaiting your review ({user?.role})
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Loading pending requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '60px 24px',
            textAlign: 'center', border: '1px solid #E2E8F0', color: '#94A3B8',
          }}>
            <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>All Caught Up!</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No pending leave requests require your approval at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
            {leaves.map((leave) => (
              <div key={leave._id} style={{
                background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)', transition: 'transform 0.2s',
              }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                
                {/* Applicant Info Section */}
                <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={leave.employeeId?.profileImageUrl || 'https://via.placeholder.com/150'} alt="Applicant" style={{
                    width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover', background: '#F1F5F9'
                  }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', marginBottom: '4px' }}>
                      {leave.employeeId?.name || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{leave.employeeId?.employeeCode}</span>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
                      <span>{leave.employeeId?.department || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Details Section */}
                <div style={{ padding: '24px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                        <CalendarDays size={16} />
                      </div>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{leave.leaveType} Leave</span>
                    </div>
                    {leave.halfDay && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: '#FDF4FF', color: '#C026D3', borderRadius: '6px' }}>
                        Half Day ({leave.halfDayPeriod})
                      </span>
                    )}
                  </div>

                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>From</div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{formatDate(leave.startDate)}</div>
                    </div>
                    <ChevronRight size={16} color="#CBD5E1" />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>To</div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{formatDate(leave.endDate)}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Duration</div>
                    <div style={{ fontWeight: 700, color: '#2076C7' }}>{leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Reason</div>
                    <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      {leave.reason}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '20px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setModalState({ show: true, leave, actionType: 'Reject' })}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #FCA5A5',
                      background: '#fff', color: '#EF4444', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button
                    onClick={() => setModalState({ show: true, leave, actionType: 'Approve' })}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                      background: '#10B981', color: '#fff', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalState.show && (
          <ActionModal
            leave={modalState.leave}
            actionType={modalState.actionType}
            onClose={() => setModalState({ show: false, leave: null, actionType: null })}
            onRefresh={fetchLeaves}
          />
        )}
      </div>
    </AppShell>
  );
};

export default LeaveApproval;
