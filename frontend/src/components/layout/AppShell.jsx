import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Clock, Users, LogOut, ChevronLeft, ChevronRight,
  Bell, User, Menu, Shield, Briefcase
} from 'lucide-react';
import theme from '../../theme';

const navItems = [
  {
    icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard',
    roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
  },
  {
    icon: Clock, label: 'Attendance', path: '/attendance',
    roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
  },
  {
    icon: Users, label: 'Employees', path: '/employees',
    roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'],
  },
  {
    icon: User, label: 'My Profile', path: '/profile',
    roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
  },
];

const RoleBadge = ({ role }) => {
  const color = theme.roleColors[role] || theme.roleColors.Employee;
  return (
    <span style={{
      background: color.bg, color: color.text, fontSize: '0.7rem',
      fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
      letterSpacing: '0.03em',
    }}>
      {role}
    </span>
  );
};

const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const visibleNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: collapsed ? '72px' : '240px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e2d4a 60%, #0d3d3b 100%)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'sticky', top: 0, height: '100vh',
        flexShrink: 0, overflow: 'hidden', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          height: '64px', display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 20px' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: '12px', flexShrink: 0,
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #2076C7, #1CADA3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(32,118,199,0.4)',
          }}>
            <Shield size={20} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', lineHeight: '1.2' }}>
                Infinity
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                Arhhvisava HRMS
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflow: 'hidden' }}>
          {visibleNav.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 12px', borderRadius: '10px',
                marginBottom: '4px', textDecoration: 'none',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(32,118,199,0.35), rgba(28,173,163,0.25))'
                  : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.18s',
                whiteSpace: 'nowrap', overflow: 'hidden',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes('32,118,199'))
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.background.includes('32,118,199'))
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 10px',
        }}>
          {/* Profile */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            marginBottom: '8px', overflow: 'hidden',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={18} color="#fff" />
              )}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <RoleBadge role={user?.role} />
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: '12px', padding: '10px 12px', borderRadius: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,100,100,0.8)', transition: 'all 0.18s',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,100,100,0.8)'; }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Sign Out</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', bottom: '20px', right: '-12px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: '#25405a', border: '2px solid rgba(255,255,255,0.15)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.2s',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: '64px', background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{user?.employeeCode}</span>
              <span style={{ margin: '0 8px', color: 'var(--color-border-dark)' }}>·</span>
              <span>{user?.department || 'HRMS'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{user?.name}</div>
              <RoleBadge role={user?.role} />
            </div>
            <div 
              onClick={() => navigate('/profile')}
              style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={18} color="#fff" />
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
