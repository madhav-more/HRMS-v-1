import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Filter, Loader2, Search, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { getAllLeaves, getLeaveStats } from '../../api/leave.api';
import { useAuth } from '../../context/AuthContext';

const statusConfig = {
  Pending: { color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  Approved: { color: '#10B981', bg: '#D1FAE5', icon: CheckCircle },
  Rejected: { color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  Cancelled: { color: '#6B7280', bg: '#F3F4F6', icon: CalendarDays },
};

const StatusBadge = ({ status }) => {
  const conf = statusConfig[status] || statusConfig.Pending;
  const Icon = conf.icon;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '99px',
      background: conf.bg, color: conf.color,
      fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <Icon size={12} strokeWidth={2.5} />
      {status}
    </div>
  );
};

const StatCard = ({ title, count, subtitle, color, icon: Icon }) => (
  <div style={{
    background: '#fff', padding: '24px', borderRadius: '20px',
    border: '1px solid #E2E8F0', flex: '1', minWidth: '220px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', lineHeight: '1', marginBottom: '8px' }}>
          {count}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{subtitle}</div>
      </div>
      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const LeaveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState({ status: 'All', department: '' });
  
  // Dummy departments for filter
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leavesRes] = await Promise.all([
        getLeaveStats(),
        getAllLeaves({ status: filter.status, department: filter.department, limit: 50 })
      ]);
      setStats(statsRes.data.data);
      setLeaves(leavesRes.data.data.leaves);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', padding: '0 4px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Leave Dashboard
          </h1>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Company-wide overview of employee leave tracking
          </p>
        </div>

        {/* Top Stats */}
        {stats && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <StatCard 
              title="Total Pending" 
              count={stats.totalPending} 
              subtitle={`HR: ${stats.pendingByStage.hr} • GM: ${stats.pendingByStage.gm} • Dir: ${stats.pendingByStage.director}`}
              color="#F59E0B" icon={Clock} 
            />
            <StatCard 
              title="Approved (This Month)" 
              count={stats.thisMonth.approved} 
              subtitle={`${stats.thisMonth.total} total requests this month`}
              color="#10B981" icon={CheckCircle} 
            />
            <StatCard 
              title="Rejected (This Month)" 
              count={stats.thisMonth.rejected} 
              subtitle="Declined by management"
              color="#EF4444" icon={XCircle} 
            />
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          
          {/* Filters Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
              {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(prev => ({ ...prev, status: f }))}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                    background: filter.status === f ? '#fff' : 'transparent',
                    color: filter.status === f ? '#0F172A' : '#64748B',
                    boxShadow: filter.status === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' }}>
                <Filter size={16} color="#64748B" />
                <select 
                  value={filter.department} 
                  onChange={(e) => setFilter(prev => ({ ...prev, department: e.target.value }))}
                  style={{ border: 'none', outline: 'none', background: 'transparent', color: '#0F172A', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#F8FAFC' }}>
                 <Search size={16} color="#64748B" />
                 <input type="text" placeholder="Search employee..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }} />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p>Loading records...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94A3B8' }}>
              <CalendarDays size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>No records found</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Try adjusting your filters.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applied On</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      
                      {/* Employee Cell */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={leave.employeeId?.profileImageUrl || 'https://via.placeholder.com/150'} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', background: '#E2E8F0' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{leave.employeeId?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{leave.employeeId?.employeeCode} • {leave.employeeId?.department}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type Cell */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>{leave.leaveType}</div>
                        {leave.halfDay && <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 600 }}>Half Day ({leave.halfDayPeriod})</div>}
                      </td>

                      {/* Duration Cell */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 500 }}>
                          {formatDate(leave.startDate)} {leave.totalDays > 1 ? `→ ${formatDate(leave.endDate)}` : ''}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}</div>
                      </td>

                      {/* Date Applied */}
                      <td style={{ padding: '16px', color: '#475569', fontSize: '0.9rem' }}>
                        {formatDate(leave.createdAt)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px' }}>
                        <StatusBadge status={leave.overallStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default LeaveDashboard;
