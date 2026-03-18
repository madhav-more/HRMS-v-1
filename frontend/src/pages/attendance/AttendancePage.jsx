import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Clock, MapPin, CheckCircle, LogOut, Timer, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const GeoStatus = ({ status, distance }) => {
  const config = {
    checking: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', text: 'Getting location...' },
    valid: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', text: `Within office (${distance}m)` },
    invalid: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', text: `Outside office (${distance}m away)` },
    error: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', text: 'Location access denied' },
  };
  const c = config[status] || config.checking;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: c.bg, color: c.color, padding: '6px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600 }}>
      <MapPin size={13} />
      {c.text}
    </div>
  );
};

const AttendancePage = () => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState('checking');
  const [geoDistance, setGeoDistance] = useState(0);
  const [coords, setCoords] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [officeSettings, setOfficeSettings] = useState(null);

  // ── Live timer ──
  useEffect(() => {
    if (!todayRecord?.inTime || todayRecord?.outTime) return;
    const inTime = new Date(todayRecord.inTime);
    const dayOfWeek = inTime.getDay();
    // Mon-Fri = 8.5 hours, Sat = 7 hours
    const shiftMs = (dayOfWeek === 6 ? 7 : 8.5) * 3600 * 1000;

    const tick = () => {
      const workedMs = Date.now() - inTime.getTime();
      const rem = shiftMs - workedMs;
      if (rem < 0) {
        setIsOvertime(true);
        setRemainingMs(Math.abs(rem));
      } else {
        setIsOvertime(false);
        setRemainingMs(rem);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [todayRecord]);

  // ── Geo location ──
  const fetchGeo = useCallback((office) => {
    if (!office) return;
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        // Haversine
        const R = 6371000;
        const toRad = (v) => (v * Math.PI) / 180;
        const dLat = toRad(latitude - office.lat);
        const dLng = toRad(longitude - office.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(office.lat)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
        const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        setGeoDistance(dist);
        setGeoStatus(dist <= office.radius ? 'valid' : 'invalid');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Fetch today status ──
  const fetchToday = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setTodayRecord(data.data.record);
      if (data.data.office) {
        setOfficeSettings(data.data.office);
        fetchGeo(data.data.office);
      }
    } catch (_) {}
    setLoading(false);
  }, [fetchGeo]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCheckIn = async () => {
    if (!coords) { toast.error('Location not available'); return; }
    if (geoStatus === 'invalid') { toast.error(`You are ${geoDistance}m outside office premises`); return; }
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in', { latitude: coords.latitude, longitude: coords.longitude });
      toast.success('✅ Checked in successfully!');
      fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!coords) { toast.error('Location not available'); return; }
    if (geoStatus === 'invalid') { toast.error(`You are ${geoDistance}m outside office premises`); return; }
    setActionLoading(true);
    try {
      const { data } = await api.post('/attendance/check-out', { latitude: coords.latitude, longitude: coords.longitude });
      const { totalHours, overtimeMinutes, shortfallMinutes } = data.data;
      if (overtimeMinutes > 0) toast.success(`✅ Checked out! Overtime: ${overtimeMinutes} min`);
      else if (shortfallMinutes > 0) toast(`⚠ Checked out ${shortfallMinutes} min early`, { icon: '⚠️' });
      else toast.success('✅ Checked out successfully!');
      fetchToday();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const isCheckedIn = !!todayRecord?.inTime;
  const isCheckedOut = !!todayRecord?.outTime;

  const formatTimeStr = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px', maxWidth: '900px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)' }}>Attendance</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Mark your daily attendance</p>
        </div>

        {/* Date + Geo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <GeoStatus status={geoStatus} distance={geoDistance} />
            <button
              onClick={() => fetchGeo(officeSettings)}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f, #0d3d3b)',
          borderRadius: '24px', padding: '40px',
          color: '#fff', marginBottom: '24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(32,118,199,0.3) 0%, transparent 70%)', filter: 'blur(30px)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(28,173,163,0.2) 0%, transparent 70%)', filter: 'blur(25px)' }} />

          {/* Status */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)', marginBottom: '12px' }}>
              Today's Status
            </div>

            {loading ? (
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>...</div>
            ) : (
              <>
                {/* Timer */}
                {isCheckedIn && !isCheckedOut && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', color: isOvertime ? '#F59E0B' : 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      {isOvertime ? 'Overtime' : 'Time Remaining'}
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', lineHeight: 1, color: isOvertime ? '#FCD34D' : '#fff' }}>
                      {isOvertime && '+'}{formatDuration(remainingMs)}
                    </div>
                  </div>
                )}

                {/* Time Row */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '32px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', textTransform: 'uppercase' }}>In</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ADE80' }}>{formatTimeStr(todayRecord?.inTime)}</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', textTransform: 'uppercase' }}>Out</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isCheckedOut ? '#60A5FA' : 'rgba(255,255,255,0.3)' }}>
                      {formatTimeStr(todayRecord?.outTime)}
                    </div>
                  </div>
                  {todayRecord?.totalHours && (
                    <>
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', textTransform: 'uppercase' }}>Hours</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#A78BFA' }}>{todayRecord.totalHours.toFixed(1)}h</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Button */}
                {!isCheckedIn && (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading || geoStatus === 'checking' || geoStatus === 'error'}
                    style={{
                      padding: '16px 48px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                      background: geoStatus === 'valid' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      display: 'inline-flex', alignItems: 'center', gap: '10px',
                      boxShadow: geoStatus === 'valid' ? '0 8px 24px rgba(16,185,129,0.4)' : 'none',
                      transition: 'all 0.2s', opacity: (actionLoading || geoStatus !== 'valid') ? 0.6 : 1,
                    }}
                  >
                    {actionLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={22} />}
                    Check In
                  </button>
                )}

                {isCheckedIn && !isCheckedOut && (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading || geoStatus === 'checking' || geoStatus === 'error'}
                    style={{
                      padding: '16px 48px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                      background: geoStatus === 'valid' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      display: 'inline-flex', alignItems: 'center', gap: '10px',
                      boxShadow: geoStatus === 'valid' ? '0 8px 24px rgba(239,68,68,0.4)' : 'none',
                      transition: 'all 0.2s', opacity: (actionLoading || geoStatus !== 'valid') ? 0.6 : 1,
                    }}
                  >
                    {actionLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <LogOut size={22} />}
                    Check Out
                  </button>
                )}

                {isCheckedOut && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', padding: '12px 24px', borderRadius: '12px', color: '#4ADE80', fontWeight: 600 }}>
                    <CheckCircle size={18} /> Attendance complete for today!
                  </div>
                )}

                {todayRecord?.isLate && (
                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'rgba(245,158,11,0.9)' }}>
                    ⚠ Late by {todayRecord.lateMinutes} minutes
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* My Summary Link */}
        <a href="/attendance/summary" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #2076C7, #1CADA3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Timer size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>My Attendance Summary</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>View monthly breakdown & history</div>
              </div>
            </div>
            <ChevronDown size={18} color="var(--color-text-tertiary)" style={{ transform: 'rotate(-90deg)' }} />
          </div>
        </a>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
};

import React from 'react';

class AttendanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("AttendancePage Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#222', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#EF4444' }}>Attendance Page Crashed</h1>
          <p style={{ color: '#A3A3A3', marginBottom: '20px' }}>An unexpected React render error occurred.</p>
          <div style={{ background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
            <h3 style={{ color: '#EF4444' }}>Error:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#F87171' }}>{this.state.error && this.state.error.toString()}</pre>
            <h3 style={{ color: '#60A5FA', marginTop: '20px' }}>Stack Trace:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#93C5FD', fontSize: '12px' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SafeAttendancePage(props) {
  return (
    <AttendanceErrorBoundary>
      <AttendancePage {...props} />
    </AttendanceErrorBoundary>
  );
}
