import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, FileText, ChevronLeft, Loader2, Info } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { applyLeave } from '../../api/leave.api';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = [
  { value: 'Casual', label: 'Casual Leave', desc: 'Personal errands or short breaks', color: '#3B82F6' },
  { value: 'Sick', label: 'Sick Leave', desc: 'Medical illness or health issues', color: '#EF4444' },
  { value: 'Earned', label: 'Earned / PTO', desc: 'Accrued paid time off', color: '#10B981' },
  { value: 'Unpaid', label: 'Unpaid Leave', desc: 'Leave without pay', color: '#F59E0B' },
  { value: 'CompOff', label: 'Comp-Off', desc: 'Compensatory off for overtime worked', color: '#8B5CF6' },
  { value: 'MaternityPaternity', label: 'Maternity / Paternity', desc: 'Parental leave', color: '#EC4899' },
  { value: 'Other', label: 'Other', desc: 'Any other reason', color: '#64748B' },
];

const today = () => new Date().toISOString().split('T')[0];

const ApplyLeave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    leaveType: '',
    startDate: today(),
    endDate: today(),
    halfDay: false,
    halfDayPeriod: 'Morning',
    reason: '',
  });

  const totalDays = form.halfDay
    ? 0.5
    : Math.max(
        0,
        Math.round((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1
      );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaveType) { toast.error('Please select a leave type'); return; }
    if (!form.reason.trim()) { toast.error('Please enter a reason'); return; }
    if (totalDays < 0.5) { toast.error('Invalid date range'); return; }

    setLoading(true);
    try {
      await applyLeave(form);
      toast.success('Leave applied successfully! 🎉');
      navigate('/leaves');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = LEAVE_TYPES.find((t) => t.value === form.leaveType);

  return (
    <AppShell>
      <div style={{ maxWidth: '780px', padding: '0 4px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => navigate('/leaves')}
            style={{
              width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #E2E8F0',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#64748B', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Apply for Leave
            </h1>
            <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Submit a leave request for manager review
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Leave Type Selection */}
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px',
            border: '1px solid #E2E8F0', marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} color="#2076C7" /> Leave Type
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {LEAVE_TYPES.map((type) => {
                const active = form.leaveType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => set('leaveType', type.value)}
                    style={{
                      padding: '16px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                      border: active ? `2px solid ${type.color}` : '2px solid #E2E8F0',
                      background: active ? `${type.color}10` : '#fff',
                      transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = type.color; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: type.color, marginBottom: '10px',
                    }} />
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: active ? type.color : '#0F172A', marginBottom: '4px' }}>
                      {type.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: '1.4' }}>
                      {type.desc}
                    </div>
                    {active && (
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: type.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L4 7L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Duration */}
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px',
            border: '1px solid #E2E8F0', marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2076C7" /> Duration
            </h3>

            {/* Half Day Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => set('halfDay', !form.halfDay)}
                style={{
                  width: '44px', height: '24px', borderRadius: '99px', border: 'none',
                  cursor: 'pointer', padding: '3px',
                  background: form.halfDay ? '#2076C7' : '#E2E8F0',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  transform: form.halfDay ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }} />
              </button>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Half Day</span>
              {form.halfDay && (
                <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                  {['Morning', 'Afternoon'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => set('halfDayPeriod', period)}
                      style={{
                        padding: '4px 14px', borderRadius: '99px', border: '1px solid',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        borderColor: form.halfDayPeriod === period ? '#2076C7' : '#E2E8F0',
                        background: form.halfDayPeriod === period ? '#EFF6FF' : '#fff',
                        color: form.halfDayPeriod === period ? '#2076C7' : '#64748B',
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: form.halfDay ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                  START DATE
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  min={today()}
                  onChange={(e) => {
                    set('startDate', e.target.value);
                    if (e.target.value > form.endDate) set('endDate', e.target.value);
                  }}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    border: '1.5px solid #E2E8F0', fontSize: '0.95rem', color: '#0F172A',
                    outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2076C7'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>
              {!form.halfDay && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                    END DATE
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => set('endDate', e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px',
                      border: '1.5px solid #E2E8F0', fontSize: '0.95rem', color: '#0F172A',
                      outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2076C7'}
                    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                  />
                </div>
              )}
            </div>

            {/* Duration Badge */}
            <div style={{
              marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #EFF6FF, #E0F2FE)',
              padding: '8px 16px', borderRadius: '99px',
              border: '1px solid #BFDBFE',
            }}>
              <Info size={14} color="#2076C7" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF' }}>
                {totalDays} {totalDays === 1 ? 'day' : 'days'} requested
              </span>
            </div>
          </div>

          {/* Reason */}
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px',
            border: '1px solid #E2E8F0', marginBottom: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#2076C7" /> Reason
            </h3>
            <textarea
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Please describe the reason for your leave request..."
              rows={4}
              maxLength={500}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: '1.5px solid #E2E8F0', fontSize: '0.95rem', color: '#0F172A',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif', lineHeight: '1.6', background: '#F8FAFC',
              }}
              onFocus={e => e.target.style.borderColor = '#2076C7'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94A3B8', marginTop: '6px' }}>
              {form.reason.length}/500
            </div>
          </div>

          {/* Approval Flow Info */}
          {form.leaveType && (
            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
              border: '1px solid #A7F3D0', borderRadius: '16px',
              padding: '16px 20px', marginBottom: '24px',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
            }}>
              <Info size={16} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065F46', marginBottom: '4px' }}>
                  Approval Required
                </div>
                <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                  {user?.role === 'Director' || user?.role === 'SuperUser'
                    ? 'Your leave will be auto-approved.'
                    : user?.role === 'GM' || user?.role === 'VP'
                    ? 'Your leave requires Director approval.'
                    : user?.role === 'HR'
                    ? 'Your leave requires GM → Director approval.'
                    : 'Your leave requires HR → GM → Director approval.'}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
              background: loading ? '#94A3B8' : 'linear-gradient(135deg, #2076C7, #1CADA3)',
              color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(32,118,199,0.35)',
              transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarDays size={20} />}
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
};

export default ApplyLeave;
