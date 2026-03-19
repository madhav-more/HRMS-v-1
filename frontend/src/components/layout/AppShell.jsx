import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Clock, Users, LogOut, ChevronRight,
  User, Shield, Bell, Search, Settings, CalendarDays, Megaphone,
  ChevronDown, Hexagon
} from 'lucide-react';
import theme from '../../theme';
import { getUnreadCount } from '../../api/announcement.api';

const navGroups = [
  { 
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
    ]
  },
  {
    label: 'Communications',
    items: [
      { 
        icon: Megaphone, label: 'Announcements', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
        children: [
          { label: 'My Feed', path: '/announcements', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
          { label: 'Manage Broadcasts', path: '/manage-announcements', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
        ]
      }
    ]
  },
  {
    label: 'HR Operations',
    items: [
      { icon: Clock, label: 'Attendance', path: '/attendance', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
      { 
        icon: CalendarDays, label: 'Leave Management', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'],
        children: [
          { label: 'My Leaves', path: '/leaves', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
          { label: 'Leave Approvals', path: '/leave-approvals', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
          { label: 'Leave Dashboard', path: '/leave-dashboard', roles: ['SuperUser', 'HR', 'Director'] },
        ]
      },
      { icon: Users, label: 'Employees', path: '/employees', roles: ['SuperUser', 'HR', 'Director', 'VP', 'GM', 'Manager'] },
    ]
  },
  {
    label: 'Account',
    items: [
      { icon: User, label: 'My Profile', path: '/profile', roles: ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'] },
    ]
  }
];

const RoleBadge = ({ role }) => {
  const color = theme.roleColors[role] || theme.roleColors.Employee;
  return (
    <span style={{
      background: color.bg, color: color.text,
      fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: '99px',
      letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '4px',
      boxShadow: `0 2px 8px ${color.bg}80`
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color.dot }} />
      {role}
    </span>
  );
};

const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Keep track of which menu groups are expanded
  const [expandedMenus, setExpandedMenus] = useState({});

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUnread = async () => {
    try {
      if (user) {
        const { data } = await getUnreadCount();
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) { }
  };

  useEffect(() => {
    fetchUnread();
    window.addEventListener('announcementsRead', fetchUnread);
    return () => window.removeEventListener('announcementsRead', fetchUnread);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-expand menus based on current location
  useEffect(() => {
    navGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(child => location.pathname.startsWith(child.path));
          if (isChildActive) {
            setExpandedMenus(prev => ({ ...prev, [item.label]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully', { icon: '👋' });
    navigate('/login');
  };

  const toggleMenu = (label) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedMenus(prev => ({ ...prev, [label]: true }));
    } else {
      setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const sidebarWidth = collapsed ? 80 : 280;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: `${sidebarWidth}px`,
        background: theme.colors.surface,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
        borderRight: '1px solid rgba(226, 232, 240, 0.6)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
      }}>
        
        {/* Branding */}
        <div style={{
          height: '80px', display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 28px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '16px', transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, #1A1A1A, #333333)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) rotate(-5deg)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0)'}>
            <Shield size={22} color="#fff" strokeWidth={2.5} />
          </div>
          
          <div style={{ 
            opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            <div style={{ color: '#111827', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              INFINITY
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Arthhvisva OS
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          {navGroups.map((group, groupIndex) => {
            // Filter items in this group that the user has access to
            const visibleItems = group.items.map(item => {
              if (item.children) {
                const visibleChildren = item.children.filter(child => child.roles.includes(user?.role));
                return { ...item, children: visibleChildren };
              }
              return item;
            }).filter(item => item.roles.includes(user?.role) && (!item.children || item.children.length > 0));

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                
                {/* Group Header */}
                <div style={{ 
                  fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', 
                  letterSpacing: '0.1em', padding: '0 12px 8px 12px', opacity: collapsed ? 0 : 1, 
                  transition: 'opacity 0.2s', whiteSpace: 'nowrap', overflow: 'hidden'
                }}>
                  {group.label}
                </div>

                {/* Group Items */}
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const hasChildren = !!item.children;
                  const isExpanded = expandedMenus[item.label];
                  
                  // Check if this item (or its children) are active
                  const isActive = hasChildren 
                    ? item.children.some(child => location.pathname.startsWith(child.path))
                    : location.pathname.startsWith(item.path);

                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Parent Menu Item */}
                      {hasChildren ? (
                        <div className="nav-item"
                          onClick={() => toggleMenu(item.label)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '16px',
                            padding: '10px 12px', borderRadius: '12px',
                            cursor: 'pointer', position: 'relative',
                            background: isActive && !isExpanded && collapsed ? 'rgba(32, 118, 199, 0.08)' : 'transparent',
                            color: isActive && !isExpanded && collapsed ? '#2076C7' : '#64748B',
                            fontWeight: isActive && !isExpanded && collapsed ? 700 : 600,
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', flexShrink: 0, marginLeft: '4px' }}>
                            <Icon size={20} strokeWidth={2} style={{ transition: 'transform 0.2s', transform: (isActive && !isExpanded && collapsed) ? 'scale(1.1)' : 'scale(1)' }} />
                          </div>
                          
                          <span style={{ 
                            fontSize: '0.9rem', flex: 1, opacity: collapsed ? 0 : 1, 
                            transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}>
                            {item.label}
                          </span>

                          <div style={{ 
                            opacity: collapsed ? 0 : 1, transition: 'all 0.2s', 
                            display: 'flex', alignItems: 'center', marginRight: '4px',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}>
                            <ChevronDown size={14} />
                          </div>

                          {collapsed && <div className="tooltip">{item.label}</div>}
                        </div>
                      ) : (
                        <NavLink to={item.path} className="nav-item"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '16px',
                            padding: '10px 12px', borderRadius: '12px',
                            textDecoration: 'none', position: 'relative',
                            background: isActive ? 'rgba(32, 118, 199, 0.08)' : 'transparent',
                            color: isActive ? '#2076C7' : '#64748B',
                            fontWeight: isActive ? 700 : 600,
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                        >
                          {isActive && (
                            <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '4px', background: '#2076C7', borderRadius: '0 4px 4px 0', animation: 'slideInY 0.2s' }} />
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', flexShrink: 0, marginLeft: '4px' }}>
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} style={{ transition: 'transform 0.2s', transform: isActive ? 'scale(1.1)' : 'scale(1)' }} />
                          </div>
                          <span style={{ fontSize: '0.9rem', opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-10px)' : 'translateX(0)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            {item.label}
                          </span>
                          {collapsed && <div className="tooltip">{item.label}</div>}
                        </NavLink>
                      )}

                      {/* Expandable Children */}
                      {hasChildren && (
                        <div style={{ 
                          maxHeight: (isExpanded && !collapsed) ? `${item.children.length * 50}px` : '0px', 
                          opacity: (isExpanded && !collapsed) ? 1 : 0, overflow: 'hidden', 
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          marginLeft: '26px', marginTop: (isExpanded && !collapsed) ? '4px' : '0',
                          borderLeft: '1px solid #E2E8F0', paddingLeft: '12px'
                        }}>
                          {item.children.map(child => {
                            const isChildActive = location.pathname.startsWith(child.path);
                            return (
                              <NavLink key={child.path} to={child.path} className="nav-child"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  padding: '8px 12px', borderRadius: '10px',
                                  textDecoration: 'none', fontSize: '0.85rem',
                                  color: isChildActive ? '#2076C7' : '#64748B',
                                  background: isChildActive ? 'rgba(32,118,199,0.05)' : 'transparent',
                                  fontWeight: isChildActive ? 700 : 500,
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: isChildActive ? '#2076C7' : '#CBD5E1' }} />
                                {child.label}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Card */}
        <div style={{ padding: '24px 16px', borderTop: '1px solid rgba(226, 232, 240, 0.6)' }}>
          <div style={{
            background: collapsed ? 'transparent' : 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: collapsed ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px', padding: collapsed ? '0' : '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: collapsed ? 'none' : '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              margin: collapsed ? '0 auto' : '0'
            }}>
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={20} color="#4F46E5" strokeWidth={2.5} />
              )}
            </div>
            
            <div style={{ 
              flex: 1, overflow: 'hidden', opacity: collapsed ? 0 : 1, 
              width: collapsed ? 0 : 'auto', transition: 'all 0.3s ease'
           }}>
              <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '2px' }}>
                {user?.employeeCode}
              </div>
            </div>
            
            {!collapsed && (
              <button 
                onClick={handleLogout}
                className="logout-btn"
                style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: '#FEF2F2', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={16} strokeWidth={2.5} style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>
          
          {collapsed && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>
                <LogOut size={20} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', top: '34px', right: '-14px', width: '28px', height: '28px',
            borderRadius: '50%', background: '#fff', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: '#64748B', zIndex: 10,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronRight size={16} strokeWidth={2.5} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ 
        flex: 1, marginLeft: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', 
        transition: 'margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1)', minWidth: 0, position: 'relative'
      }}>
        
        {/* Top Header - Glassmorphism */}
        <header style={{
          height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px', position: 'sticky', top: 0, zIndex: 50,
          background: scrolled ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}>
          {/* Brand/Context Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', background: '#F1F5F9',
              padding: '10px 16px', borderRadius: '12px', color: '#64748B', fontSize: '0.9rem',
              border: '1px solid #E2E8F0'
            }}>
               <Search size={18} />
               <input 
                 type="text" placeholder="Quick search..." 
                 style={{ border: 'none', background: 'transparent', outline: 'none', width: '200px', fontSize: '0.9rem', color: '#111827' }} 
               />
            </div>
          </div>

          {/* User & Actions Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => navigate('/announcements')}
                title="Announcements"
                className="icon-btn" style={{ position: 'relative' }}
              >
                <Bell size={20} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', border: '2px solid #fff' }} />
                )}
              </button>
              <button className="icon-btn"><Settings size={20} strokeWidth={2} /></button>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: '#E2E8F0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>{user?.name}</div>
                <div style={{ marginTop: '4px' }}><RoleBadge role={user?.role} /></div>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px', background: '#E0E7FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                   <User size={22} color="#4F46E5" strokeWidth={2.5} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>

      <style>{`
        .nav-item:hover, .nav-child:hover {
          background: rgba(241, 245, 249, 0.8) !important;
        }
        .nav-item .tooltip {
          position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%) translateX(-10px);
          background: #111827; color: #fff; padding: 6px 12px; border-radius: 6px;
          font-size: 0.75rem; font-weight: 600; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 200;
        }
        .nav-item .tooltip::before {
          content: ''; position: absolute; left: -4px; top: 50%; transform: translateY(-50%);
          border-width: 5px 5px 5px 0; border-style: solid; border-color: transparent #111827 transparent transparent;
        }
        .nav-item:hover .tooltip {
          opacity: 1; transform: translateY(-50%) translateX(0);
        }
        .icon-btn {
          width: 40px; height: 40px; border-radius: 50%; background: #F8FAFC; border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center; color: #64748B;
          cursor: pointer; transition: all 0.2s;
        }
        .icon-btn:hover {
          background: #F1F5F9; color: #111827; border-color: #E2E8F0;
          transform: translateY(-1px);
        }
        .logout-btn:hover {
          background: #FEE2E2 !important; color: #DC2626 !important;
        }
        @keyframes slideInY {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AppShell;