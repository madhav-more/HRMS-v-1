import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import AppShell from '../../components/layout/AppShell';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ChevronRight, Loader2, Edit, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';

const ROLES = ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'];
const CAN_CREATE = ['SuperUser', 'HR', 'Director', 'VP', 'GM'];

const EmployeeList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [roleFilter, setRoleFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, status: statusFilter || undefined, role: roleFilter || undefined };
      const { data } = await api.get('/employees', { params });
      setEmployees(data.data.employees);
      setTotal(data.data.total);
    } catch (_) {}
    setLoading(false);
  }, [search, statusFilter, roleFilter]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 350);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const getRoleStyle = (role) => {
    const c = theme.roleColors[role] || theme.roleColors.Employee;
    return { background: c.bg, color: c.text };
  };

  const handleToggleStatus = async (e, emp) => {
    e.stopPropagation();
    try {
      const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
      await api.patch(`/employees/${emp._id}/status`, { status: newStatus });
      toast.success(`Employee marked as ${newStatus}`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    }
  };

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)' }}>Employees</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>{total} total employees</p>
          </div>
          {CAN_CREATE.includes(user?.role) && (
            <button className="btn-primary" onClick={() => navigate('/employees/create')}>
              <Plus size={18} /> Add Employee
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-field select-field" style={{ width: '130px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select className="input-field select-field" style={{ width: '140px' }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={28} color="var(--color-text-tertiary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              <Users size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <div>No employees found</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id} onClick={() => navigate(`/employees/${emp._id}/edit`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, #2076C7, #1CADA3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', flexShrink: 0,
                        }}>
                          {emp.profileImageUrl
                            ? <img src={emp.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{emp.name?.[0]}</span>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.82rem', background: 'var(--color-surface-alt)', padding: '2px 8px', borderRadius: '5px', fontWeight: 700 }}>{emp.employeeCode}</code></td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>{emp.department || '—'}</td>
                    <td><span className="badge" style={getRoleStyle(emp.role)}>{emp.role}</span></td>
                    <td>
                      <span className="badge" style={emp.status === 'Active' ? { background: 'rgba(16,185,129,0.1)', color: '#059669' } : { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                          onClick={() => navigate(`/employees/${emp._id}/edit`)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {CAN_CREATE.includes(user?.role) && (
                          <button 
                            className="btn-secondary" 
                            style={{ 
                              padding: '6px', minWidth: 'auto', 
                              background: emp.status === 'Active' ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', 
                              border: `1px solid ${emp.status === 'Active' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, 
                              color: emp.status === 'Active' ? '#DC2626' : '#059669' 
                            }}
                            onClick={(e) => handleToggleStatus(e, emp)}
                            title={emp.status === 'Active' ? "Deactivate" : "Activate"}
                          >
                            {emp.status === 'Active' ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
};

export default EmployeeList;
