import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Clock, Calendar, TrendingUp, CheckCircle, XCircle, Timer, MapPin } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

const StatCard = ({ icon: Icon, label, value, gradient, sublabel }) => (
  <div className="stat-card" style={{ '--card-gradient': gradient }} >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: gradient }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, marginTop: '6px' }}>{value}</p>
        {sublabel && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{sublabel}</p>}
      </div>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <Icon size={22} color="#fff" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, totalHours: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, summaryRes] = await Promise.all([
          api.get('/attendance/today'),
          api.get('/attendance/my-summary'),
        ]);
        setTodayRecord(todayRes.data.data.record);
        setSummary(summaryRes.data.data.summary);
      } catch (_) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (date) =>
    date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const getCheckinTime = () => {
    if (!todayRecord?.inTime) return '--';
    return new Date(todayRecord.inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const getCheckoutTime = () => {
    if (!todayRecord?.outTime) return 'Not yet';
    return new Date(todayRecord.outTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '6px' }}>
            Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{formatDate(currentTime)}</p>
        </div>

        {/* Live Clock + Today Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Clock */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
            borderRadius: '20px', padding: '28px', color: '#fff',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '150px', height: '150px', borderRadius: '50%',
              background: 'rgba(32,118,199,0.2)', filter: 'blur(30px)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'rgba(255,255,255,0.6)' }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Time</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
          </div>

          {/* Today's Attendance */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
              <CheckCircle size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today's Attendance</span>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: '60px', borderRadius: '8px' }} />
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Check In</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10B981' }}>{getCheckinTime()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Check Out</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: todayRecord?.outTime ? '#2076C7' : 'var(--color-text-tertiary)' }}>
                      {getCheckoutTime()}
                    </div>
                  </div>
                  {todayRecord?.totalHours && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Hours</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#8B5CF6' }}>
                        {todayRecord.totalHours.toFixed(1)}h
                      </div>
                    </div>
                  )}
                </div>
                {!todayRecord?.inTime && (
                  <button className="btn-primary" onClick={() => navigate('/attendance')} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                    <Clock size={15} /> Go to Attendance
                  </button>
                )}
                {todayRecord?.isLate && (
                  <span style={{ fontSize: '0.78rem', color: '#D97706', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '99px', fontWeight: 600 }}>
                    ⚠ Late by {todayRecord.lateMinutes} min
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
          This Month's Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
          <StatCard icon={CheckCircle} label="Present" value={summary.present} gradient="linear-gradient(135deg, #10B981, #059669)" sublabel="days" />
          <StatCard icon={XCircle} label="Absent" value={summary.absent} gradient="linear-gradient(135deg, #EF4444, #DC2626)" sublabel="days" />
          <StatCard icon={Calendar} label="Week Off" value={summary.weekOff} gradient="linear-gradient(135deg, #3B82F6, #2563EB)" sublabel="Sundays" />
          <StatCard icon={Timer} label="Late" value={summary.late} gradient="linear-gradient(135deg, #F59E0B, #D97706)" sublabel="instances" />
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
