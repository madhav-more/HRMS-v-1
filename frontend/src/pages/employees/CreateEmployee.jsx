import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { Loader2, Upload, User, ArrowLeft, Check } from 'lucide-react';

const ROLES = ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'];
const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Marketing', 'Accounting', 'Operations', 'General Manager'];
const GENDERS = ['Male', 'Female', 'Other'];

const FormSection = ({ title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <div style={{ height: '3px', width: '24px', background: 'linear-gradient(135deg, #2076C7, #1CADA3)', borderRadius: '2px' }} />
      <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h3>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="form-label">{label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}</label>
    {children}
  </div>
);

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nextCode, setNextCode] = useState('Loading...');
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', mobileNumber: '', alternateMobileNumber: '',
    gender: '', dateOfBirth: '', maritalStatus: '',
    fatherName: '', motherName: '',
    currentAddress: '', permanentAddress: '', district: '', state: '', pincode: '',
    role: 'Employee', department: '', position: '', joiningDate: '',
    salary: '', reportingManager: '',
    experienceType: 'Fresher', totalExperienceYears: '', lastCompanyName: '',
    aadhaarNumber: '', panNumber: '',
    accountHolderName: '', bankName: '', accountNumber: '', ifsc: '', branch: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactMobile: '', emergencyContactAddress: '',
    hasDisease: 'No', password: '',
  });
  const [files, setFiles] = useState({ profileImage: null });

  useEffect(() => {
    api.get('/employees/next-code')
      .then(({ data }) => setNextCode(data.data.nextCode))
      .catch(() => setNextCode('IA00001'));
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFiles((f) => ({ ...f, profileImage: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.mobileNumber) {
      toast.error('Name, email, and mobile are required');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (files.profileImage) fd.append('profileImage', files.profileImage);
      await api.post('/employees', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`✅ Employee ${nextCode} created successfully!`);
      navigate('/employees');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '28px', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <button onClick={() => navigate('/employees')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: '6px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>Add New Employee</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>Code:</span>
              <code style={{ fontSize: '0.9rem', fontWeight: 800, background: 'var(--color-surface-alt)', padding: '2px 10px', borderRadius: '6px', color: '#2076C7' }}>{nextCode}</code>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Photo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', padding: '24px', background: 'var(--color-surface-alt)', borderRadius: '16px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #2076C7, #1CADA3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {imagePreview ? <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={32} color="rgba(255,255,255,0.7)" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Profile Photo</div>
              <label style={{ cursor: 'pointer' }}>
                <span className="btn-secondary" style={{ fontSize: '0.82rem', padding: '7px 14px' }}>
                  <Upload size={14} /> Upload Photo
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>JPG, PNG up to 10MB</p>
            </div>
          </div>

          {/* Sections */}
          <div className="card" style={{ padding: '28px 32px' }}>
            <FormSection title="Basic Information">
              <Field label="Full Name" required>
                <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
              </Field>
              <Field label="Email" required>
                <input className="input-field" type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@company.com" />
              </Field>
              <Field label="Mobile" required>
                <input className="input-field" name="mobileNumber" value={form.mobileNumber} onChange={handleChange} placeholder="9876543210" />
              </Field>
              <Field label="Alternate Mobile">
                <input className="input-field" name="alternateMobileNumber" value={form.alternateMobileNumber} onChange={handleChange} placeholder="Optional" />
              </Field>
              <Field label="Gender" required>
                <select className="input-field select-field" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of Birth">
                <input className="input-field" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
              </Field>
              <Field label="Marital Status">
                <select className="input-field select-field" name="maritalStatus" value={form.maritalStatus} onChange={handleChange}>
                  <option value="">Select</option>
                  {['Single', 'Married', 'Divorced', 'Widowed'].map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Father's Name">
                <input className="input-field" name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Father's full name" />
              </Field>
              <Field label="Mother's Name">
                <input className="input-field" name="motherName" value={form.motherName} onChange={handleChange} placeholder="Mother's full name" />
              </Field>
            </FormSection>

            <FormSection title="Job Details">
              <Field label="Role" required>
                <select className="input-field select-field" name="role" value={form.role} onChange={handleChange}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select className="input-field select-field" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Position">
                <input className="input-field" name="position" value={form.position} onChange={handleChange} placeholder="e.g. Software Developer" />
              </Field>
              <Field label="Joining Date">
                <input className="input-field" type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} />
              </Field>
              <Field label="Salary">
                <input className="input-field" type="number" name="salary" value={form.salary} onChange={handleChange} placeholder="Monthly salary" />
              </Field>
              <Field label="Reporting Manager">
                <input className="input-field" name="reportingManager" value={form.reportingManager} onChange={handleChange} placeholder="Manager name" />
              </Field>
            </FormSection>

            <FormSection title="Address">
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Current Address">
                  <textarea className="input-field" name="currentAddress" value={form.currentAddress} onChange={handleChange} rows={2} placeholder="Current residential address" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Permanent Address">
                  <textarea className="input-field" name="permanentAddress" value={form.permanentAddress} onChange={handleChange} rows={2} placeholder="Permanent address" />
                </Field>
              </div>
              <Field label="District">
                <input className="input-field" name="district" value={form.district} onChange={handleChange} placeholder="District" />
              </Field>
              <Field label="State">
                <input className="input-field" name="state" value={form.state} onChange={handleChange} placeholder="State" />
              </Field>
              <Field label="Pincode">
                <input className="input-field" name="pincode" value={form.pincode} onChange={handleChange} placeholder="411001" />
              </Field>
            </FormSection>

            <FormSection title="Identity Documents">
              <Field label="Aadhaar Number">
                <input className="input-field" name="aadhaarNumber" value={form.aadhaarNumber} onChange={handleChange} placeholder="XXXX XXXX XXXX" />
              </Field>
              <Field label="PAN Number">
                <input className="input-field" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" />
              </Field>
            </FormSection>

            <FormSection title="Bank Details">
              <Field label="Account Holder Name">
                <input className="input-field" name="accountHolderName" value={form.accountHolderName} onChange={handleChange} placeholder="As per bank records" />
              </Field>
              <Field label="Bank Name">
                <input className="input-field" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Bank name" />
              </Field>
              <Field label="Account Number">
                <input className="input-field" name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="Account number" />
              </Field>
              <Field label="IFSC Code">
                <input className="input-field" name="ifsc" value={form.ifsc} onChange={handleChange} placeholder="SBIN0001234" />
              </Field>
              <Field label="Branch">
                <input className="input-field" name="branch" value={form.branch} onChange={handleChange} placeholder="Branch name" />
              </Field>
            </FormSection>

            <FormSection title="Emergency Contact">
              <Field label="Contact Name">
                <input className="input-field" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} placeholder="Emergency contact full name" />
              </Field>
              <Field label="Relationship">
                <input className="input-field" name="emergencyContactRelationship" value={form.emergencyContactRelationship} onChange={handleChange} placeholder="e.g. Father, Spouse" />
              </Field>
              <Field label="Mobile">
                <input className="input-field" name="emergencyContactMobile" value={form.emergencyContactMobile} onChange={handleChange} placeholder="Emergency contact number" />
              </Field>
            </FormSection>

            <FormSection title="Login Credentials">
              <Field label="Password" required>
                <input className="input-field" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters (default: 123456)" />
              </Field>
            </FormSection>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/employees')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Check size={16} /> Create Employee</>}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppShell>
  );
};

export default CreateEmployee;
