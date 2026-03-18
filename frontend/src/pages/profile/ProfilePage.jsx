import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { 
  User, Mail, Phone, MapPin, Briefcase, Hash, 
  Calendar, Shield, Camera, Loader2, Save, KeyRound 
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

const ProfilePage = () => {
  const { user, login } = useAuth(); // login function updates the contextual user details
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    currentAddress: '',
    permanentAddress: '',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data.data);
      setForm({
        phone: data.data.phone || '',
        currentAddress: data.data.currentAddress || '',
        permanentAddress: data.data.permanentAddress || '',
        bloodGroup: data.data.bloodGroup || '',
        emergencyContactName: data.data.emergencyContact?.name || '',
        emergencyContactNumber: data.data.emergencyContact?.phone || '',
      });
      setAvatarPreview(data.data.profileImageUrl);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePassChange = (e) => setPassForm({ ...passForm, [e.target.name]: e.target.value });

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (selectedFile) fd.append('profileImage', selectedFile);

      const { data } = await api.put('/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success('Profile updated successfully');
      setProfile({ ...profile, ...data.data }); // Optimistic
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <AppShell><div style={{ padding: 40 }}>Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)' }}>My Profile</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Manage your personal information and security</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Identity Card */}
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 20px' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #0d3d3b)', padding: '4px' }}>
                  <img 
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name)}&background=2076C7&color=fff&size=150`} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                </div>
                <label style={{
                  position: 'absolute', bottom: '0', right: '0', width: '36px', height: '36px',
                  background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '3px solid var(--color-surface)', color: '#fff',
                  transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <Camera size={16} />
                  <input type="file" hidden accept="image/*" onChange={handleAvatarSelect} />
                </label>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>{profile?.name}</h2>
              <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(32, 118, 199, 0.1)', color: '#2076C7', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, marginTop: '8px' }}>
                {profile?.role}
              </div>
              
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-secondary)' }}>
                  <Briefcase size={18} />
                  <span style={{ fontSize: '0.9rem' }}>{profile?.department} - {profile?.position}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-secondary)' }}>
                  <Mail size={18} />
                  <span style={{ fontSize: '0.9rem' }}>{profile?.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-secondary)' }}>
                  <Hash size={18} />
                  <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{profile?.employeeCode}</span>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Shield color="#8B5CF6" size={22} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Change Password</h3>
              </div>
              <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-tertiary)' }} />
                    <input className="input-field" type="password" style={{ paddingLeft: '40px' }}
                      name="currentPassword" value={passForm.currentPassword} onChange={handlePassChange} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-tertiary)' }} />
                    <input className="input-field" type="password" style={{ paddingLeft: '40px' }} minLength={6}
                      name="newPassword" value={passForm.newPassword} onChange={handlePassChange} required />
                  </div>
                </div>
                <div className="input-group">
                  <label>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-tertiary)' }} />
                    <input className="input-field" type="password" style={{ paddingLeft: '40px' }} minLength={6}
                      name="confirmPassword" value={passForm.confirmPassword} onChange={handlePassChange} required />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={savingPassword} style={{ marginTop: '8px' }}>
                  {savingPassword ? <Loader2 size={18} className="spin" /> : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '24px', flex: 1 }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>Personal Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <div className="input-group">
                  <label>Phone Number</label>
                  <input className="input-field" type="text" name="phone" value={form.phone} onChange={handleProfileChange} />
                </div>
                <div className="input-group">
                  <label>Blood Group</label>
                  <select className="input-field" name="bloodGroup" value={form.bloodGroup} onChange={handleProfileChange}>
                    <option value="">Select...</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Current Address</label>
                  <textarea className="input-field" name="currentAddress" value={form.currentAddress} onChange={handleProfileChange} style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>
                
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Permanent Address</label>
                  <textarea className="input-field" name="permanentAddress" value={form.permanentAddress} onChange={handleProfileChange} style={{ resize: 'vertical', minHeight: '80px' }} />
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--color-border)', margin: '32px 0 24px' }} />
              
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--color-text)' }}>Emergency Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>Contact Name</label>
                  <input className="input-field" type="text" name="emergencyContactName" value={form.emergencyContactName} onChange={handleProfileChange} />
                </div>
                <div className="input-group">
                  <label>Contact Phone</label>
                  <input className="input-field" type="text" name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleProfileChange} />
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={saveProfile} className="btn-primary" disabled={savingProfile} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                  {savingProfile ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                  Save Profile Changes
                </button>
              </div>

            </div>
          </div>

        </div>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
};

export default ProfilePage;
