import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STATUS_LABELS = {
  P: 'Present', A: 'Absent', WO: 'Week Off', L: 'Leave', Coff: 'Comp Off', AUTO: 'Partial', H: 'Holiday',
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  return (
    <span className={`badge status-${status}`}>{STATUS_LABELS[status] || status}</span>
  );
};

const AttendanceSummary = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, weekOff: 0, late: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const from = start.toISOString().split('T')[0];
      const to = end.toISOString().split('T')[0];
      const { data } = await api.get('/attendance/my-summary', { params: { from, to } });
      setRecords(data.data.records);
      setSummary(data.data.summary);
    } catch (_) {}
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const monthName = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const formatTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>My Attendance</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>{user?.name} · {user?.employeeCode}</p>

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={prevMonth} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} color="var(--color-text-secondary)" />
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: '180px', textAlign: 'center' }}>{monthName}</div>
          <button onClick={nextMonth} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={18} color="var(--color-text-secondary)" />
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Present', value: summary.present, color: '#10B981' },
            { label: 'Absent', value: summary.absent, color: '#EF4444' },
            { label: 'Late', value: summary.late, color: '#F59E0B' },
            { label: 'Week Off', value: summary.weekOff, color: '#3B82F6' },
            { label: 'Avg Hours', value: summary.present ? (summary.totalHours / summary.present).toFixed(1) + 'h' : '--', color: '#8B5CF6' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Records Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '8px' }} />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-tertiary)' }}>No records found</td></tr>
                ) : records.map((r, i) => {
                  const date = new Date(r.date);
                  const isWeekend = date.getDay() === 0;
                  return (
                    <tr key={i} style={{ background: isWeekend ? 'rgba(59,130,246,0.03)' : 'transparent' }}>
                      <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                        {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </td>
                      <td style={{ fontWeight: r.inTime ? 600 : 400, color: r.inTime ? '#059669' : 'var(--color-text-tertiary)', fontSize: '0.88rem' }}>
                        {r.isWeekOff || r.isAbsent ? '—' : formatTime(r.inTime)}
                      </td>
                      <td style={{ fontWeight: r.outTime ? 600 : 400, color: r.outTime ? '#2076C7' : 'var(--color-text-tertiary)', fontSize: '0.88rem' }}>
                        {r.isWeekOff || r.isAbsent ? '—' : formatTime(r.outTime)}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {r.totalHours ? `${r.totalHours.toFixed(1)}h` : '—'}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.isLate && !r.isWeekOff && (
                          <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '99px', fontWeight: 600 }}>
                            Late {r.lateMinutes}m
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AttendanceSummary;
