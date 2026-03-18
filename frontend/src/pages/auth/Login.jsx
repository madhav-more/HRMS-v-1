import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

const Login = () => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeCode.trim() || !password) {
      toast.error('Please enter employee code and password');
      return;
    }
    setLoading(true);
    try {
      await login(employeeCode.trim().toUpperCase(), password);
      toast.success('Welcome back! 👋');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0d5e5a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-80px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(32,118,199,0.25) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-60px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(28,173,163,0.2) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '10%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1,
      }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #2076C7, #1CADA3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(32,118,199,0.4)',
          }}>
            <Shield size={36} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '4px',
            letterSpacing: '-0.5px',
          }}>
            Infinity Arhhvisava
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            HRMS — Human Resource Management System
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '24px' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Employee Code */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block', color: 'rgba(255,255,255,0.75)',
                fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Employee Code
              </label>
              <input
                id="employee-code-input"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="e.g. IA00001"
                autoComplete="username"
                name="employeeCode"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px', color: '#fff', fontSize: '1rem',
                  outline: 'none', fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(32,118,199,0.8)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(32,118,199,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block', color: 'rgba(255,255,255,0.75)',
                fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  name="password"
                  style={{
                    width: '100%', padding: '14px 48px 14px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', color: '#fff', fontSize: '1rem',
                    outline: 'none', fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(32,118,199,0.8)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(32,118,199,0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                    display: 'flex', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(32,118,199,0.5)' : 'linear-gradient(135deg, #2076C7, #1CADA3)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 20px rgba(32,118,199,0.4)',
                transition: 'opacity 0.2s, transform 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
            >
              {loading && <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: '24px', textAlign: 'center',
            color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem',
          }}>
            <span>Contact HR for login credentials</span>
          </div>
        </div>

        {/* Bottom text */}
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
          © 2025 Infinity Arhhvisava. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
};

export default Login;
