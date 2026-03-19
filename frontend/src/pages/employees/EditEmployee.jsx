import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import AppShell from '../../components/layout/AppShell';
import { Loader2, Upload, User, ArrowLeft, Check, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const ROLES = ['SuperUser', 'HR', 'Manager', 'Director', 'VP', 'GM', 'Employee', 'Intern'];
const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Marketing', 'Accounting', 'Operations', 'General Manager'];
const POSITIONS = ['Software Developer', 'Senior Developer', 'HR Executive', 'Accountant', 'Manager'];
const GRADUATION_COURSES = ['B.Tech', 'B.E.', 'B.Sc', 'B.Com', 'B.A.', 'BCA', 'Other'];
const PG_COURSES = ['M.Tech', 'M.E.', 'M.Sc', 'M.Com', 'M.A.', 'MCA', 'MBA', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed'];
const EXPERIENCE_TYPES = ['Fresher', 'Experienced'];

const FormSection = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '24px', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer', background: 'var(--color-surface-alt)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ height: '4px', width: '20px', background: 'linear-gradient(135deg, #2076C7, #1CADA3)', borderRadius: '2px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{title}</h3>
        </div>
        {isOpen ? <ChevronUp size={20} color="var(--color-text-tertiary)" /> : <ChevronDown size={20} color="var(--color-text-tertiary)" />}
      </div>
      
      {isOpen && (
        <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, required, children, fullWidth }) => (
  <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const FileUploadField = ({ label, onChange, file, existingUrl, accept = ".pdf,.jpg,.jpeg,.png", required }) => {
  const hasContent = file || existingUrl;
  const isPdf = existingUrl?.toLowerCase().endsWith('.pdf');
  
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '16px', textAlign: 'center', background: hasContent ? 'rgba(16,185,129,0.05)' : 'var(--color-surface-alt)', transition: 'all 0.2s', position: 'relative' }}>
      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: hasContent ? 'rgba(16,185,129,0.1)' : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasContent ? '#10B981' : 'var(--color-text-tertiary)' }}>
          {file ? <Check size={20} /> : existingUrl ? (isPdf ? <FileText size={20}/> : <Check size={20}/>) : <Upload size={20} />}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: hasContent ? '#10B981' : 'var(--color-text)' }}>
            {file ? file.name : existingUrl ? `Replace ${label}` : `Upload ${label}`} {required && !hasContent && <span style={{ color: '#EF4444' }}>*</span>}
          </div>
          {existingUrl && !file && (
            <a 
              href={existingUrl} 
              target="_blank" 
              rel="noreferrer" 
              onClick={e => e.stopPropagation()} 
              style={{ fontSize: '0.75rem', color: '#2076C7', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}
            >
              View Current File
            </a>
          )}
          {!hasContent && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Click to browse</div>}
        </div>
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files[0])} style={{ display: 'none' }} />
      </label>
    </div>
  );
};

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [employeeCode, setEmployeeCode] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  
  const [form, setForm] = useState({
    name: '', email: '', mobileNumber: '', alternateMobileNumber: '',
    password: '', confirmPassword: '',
    gender: '', fatherName: '', motherName: '', dateOfBirth: '', maritalStatus: '',
    currentAddress: '', permanentAddress: '', sameAsCurrent: false,
    district: '', state: '', pincode: '',
    experienceType: 'Fresher', totalExperienceYears: '', lastCompanyName: '',
    hasDisease: 'No', diseaseName: '',
    joiningDate: '', department: '', position: '', reportingManager: '', role: 'Employee', salary: '',
    hscPercent: '', graduationCourse: '', graduationPercent: '', postGraduationCourse: '', postGraduationPercent: '',
    aadhaarNumber: '', panNumber: '',
    accountHolderName: '', bankName: '', accountNumber: '', ifsc: '', branch: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactMobile: '', emergencyContactAddress: '',
  });

  const [existingUrls, setExistingUrls] = useState({});

  const [files, setFiles] = useState({
    profileImage: null, twelfthMarksheet: null, graduationMarksheet: null, postGraduationMarksheet: null,
    experienceCertificate: null, aadhaarFile: null, panFile: null, passbookFile: null
  });

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data } = await api.get(`/employees/${id}`);
      const emp = data.data;
      setEmployeeCode(emp.employeeCode);
      setImagePreview(emp.profileImageUrl);
      
      setForm({
        name: emp.name || '', email: emp.email || '', mobileNumber: emp.mobileNumber || '', alternateMobileNumber: emp.alternateMobileNumber || '',
        password: '', confirmPassword: '',
        gender: emp.gender || '', fatherName: emp.fatherName || '', motherName: emp.motherName || '', 
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '', 
        maritalStatus: emp.maritalStatus || '',
        currentAddress: emp.currentAddress || '', permanentAddress: emp.permanentAddress || '', sameAsCurrent: false,
        district: emp.district || '', state: emp.state || '', pincode: emp.pincode || '',
        experienceType: emp.experienceType || 'Fresher', totalExperienceYears: emp.totalExperienceYears || '', lastCompanyName: emp.lastCompanyName || '',
        hasDisease: emp.hasDisease || 'No', diseaseName: emp.diseaseName || '',
        joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '', 
        department: emp.department || '', position: emp.position || '', reportingManager: emp.reportingManager || '', role: emp.role || 'Employee', salary: emp.salary || '',
        hscPercent: emp.hscPercent || '', graduationCourse: emp.graduationCourse || '', graduationPercent: emp.graduationPercent || '', postGraduationCourse: emp.postGraduationCourse || '', postGraduationPercent: emp.postGraduationPercent || '',
        aadhaarNumber: emp.aadhaarNumber || '', panNumber: emp.panNumber || '',
        accountHolderName: emp.accountHolderName || '', bankName: emp.bankName || '', accountNumber: emp.accountNumber || '', ifsc: emp.ifsc || '', branch: emp.branch || '',
        emergencyContactName: emp.emergencyContactName || '', emergencyContactRelationship: emp.emergencyContactRelationship || '', emergencyContactMobile: emp.emergencyContactMobile || '', emergencyContactAddress: emp.emergencyContactAddress || '',
      });

      setExistingUrls({
        twelfthMarksheet: emp.twelfthMarksheetUrl,
        graduationMarksheet: emp.graduationMarksheetUrl,
        postGraduationMarksheet: emp.postGraduationMarksheetUrl,
        experienceCertificate: emp.experienceCertificateUrl,
        aadhaarFile: emp.aadhaarFileUrl,
        panFile: emp.panFileUrl,
        passbookFile: emp.passbookFileUrl,
      });

      setInitLoading(false);
    } catch (err) {
      toast.error('Failed to load employee details');
      navigate('/employees');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'sameAsCurrent') {
      setForm(f => ({
        ...f, sameAsCurrent: checked,
        permanentAddress: checked ? f.currentAddress : f.permanentAddress
      }));
    } else {
      setForm(f => {
        const val = type === 'checkbox' ? checked : value;
        const newForm = { ...f, [name]: val };
        if (name === 'currentAddress' && f.sameAsCurrent) {
          newForm.permanentAddress = val;
        }
        return newForm;
      });
    }
  };

  const handleFileChange = (name, file) => {
    if (!file) return;
    if (name === 'profileImage') {
      setImagePreview(URL.createObjectURL(file));
      setFiles(f => ({ ...f, profileImage: file }));
    } else {
      setFiles(f => ({ ...f, [name]: file }));
    }
  };

  const validate = () => {
    if (!form.name) return 'Name is required';
    if (!form.email) return 'Email is required';
    if (!form.mobileNumber) return 'Mobile number is required';
    if (form.password && form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!form.gender) return 'Gender is required';
    if (!form.dateOfBirth) return 'Date of Birth is required';
    if (!form.maritalStatus) return 'Marital Status is required';
    if (!form.currentAddress || !form.permanentAddress) return 'Addresses are required';
    if (form.experienceType === 'Experienced' && !form.totalExperienceYears) return 'Experience years are required';
    if (!form.joiningDate) return 'Joining Date is required';
    if (!form.department || !form.position || !form.role || !form.salary) return 'All Job details are required';
    if (!form.hscPercent) return '12th/Diploma percentage is required';
    if (!form.graduationCourse || !form.graduationPercent) return 'Graduation details are required';
    if (!form.aadhaarNumber || !form.panNumber) return 'Aadhaar and PAN numbers are required';
    if (!form.accountHolderName || !form.bankName || !form.accountNumber || !form.ifsc) return 'All Bank details are required';
    if (!form.emergencyContactName || !form.emergencyContactMobile) return 'Emergency contact name and mobile are required';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { 
        if (v && k !== 'sameAsCurrent' && k !== 'confirmPassword') fd.append(k, String(v)); 
      });
      
      Object.entries(files).forEach(([k, file]) => {
        if (file) fd.append(k, file);
      });

      await api.put(`/employees/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`✅ Employee ${employeeCode} updated successfully!`);
      navigate('/employees');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return <AppShell><div style={{ padding: '60px', textAlign: 'center' }}><Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--color-primary)' }} /></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="page-wrapper fade-in" style={{ padding: '24px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/employees')} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', cursor: 'pointer', display: 'flex', padding: '10px', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <ArrowLeft size={20} color="var(--color-text)" />
            </button>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Edit Employee</h1>
              <p style={{ color: 'var(--color-text-tertiary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Update information for employee {form.name}.</p>
            </div>
          </div>
          <div style={{ background: 'rgba(32, 118, 199, 0.1)', border: '1px solid rgba(32, 118, 199, 0.2)', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#2076C7', fontWeight: 600 }}>Employee Code</span>
            <code style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>{employeeCode}</code>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          
          {/* Section 1: Basic Details */}
          <FormSection title="1. Basic Details" defaultOpen={true}>
            <Field label="Full Name *" fullWidth={true}>
              <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
            </Field>
            <Field label="Email Address *">
              <input className="input-field" type="email" name="email" value={form.email} onChange={handleChange} placeholder="john.doe@company.com" disabled style={{ opacity: 0.7 }} />
            </Field>
            <Field label="Mobile Number *">
              <input className="input-field" name="mobileNumber" value={form.mobileNumber} onChange={handleChange} placeholder="9876543210" maxLength={15} disabled style={{ opacity: 0.7 }} />
            </Field>
            <Field label="Alternate Mobile Number">
              <input className="input-field" name="alternateMobileNumber" value={form.alternateMobileNumber} onChange={handleChange} placeholder="Optional" maxLength={15} />
            </Field>
            <Field label="New Password">
              <input className="input-field" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Leave blank to keep current" />
            </Field>
            <Field label="Confirm New Password">
              <input className="input-field" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Match new password" />
            </Field>
          </FormSection>

          {/* Section 2: Personal Details */}
          <FormSection title="2. Personal Details">
             <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '10px' }}>
                {/* Profile Photo Upload */}
                <div>
                  <label className="form-label">Profile Photo</label>
                  <label style={{ 
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    width: '120px', height: '120px', borderRadius: '16px', border: '2px dashed var(--color-border)', 
                    background: imagePreview ? 'transparent' : 'var(--color-surface-alt)', overflow: 'hidden', position: 'relative'
                  }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <User size={32} color="var(--color-text-tertiary)" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Upload Image</span>
                      </>
                    )}
                    <input type="file" accept="image/jpeg, image/png, image/jpg" onChange={(e) => handleFileChange('profileImage', e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                </div>
                
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                  <Field label="Gender *">
                    <select className="input-field select-field" name="gender" value={form.gender} onChange={handleChange}>
                      <option value="">Select Gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Date of Birth *">
                    <input className="input-field" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                  </Field>
                  <Field label="Marital Status *">
                    <select className="input-field select-field" name="maritalStatus" value={form.maritalStatus} onChange={handleChange}>
                      <option value="">Select Status</option>
                      {MARITAL_STATUS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Father's Name">
                    <input className="input-field" name="fatherName" value={form.fatherName} onChange={handleChange} />
                  </Field>
                  <Field label="Mother's Name">
                    <input className="input-field" name="motherName" value={form.motherName} onChange={handleChange} />
                  </Field>
                </div>
            </div>

            <Field label="Current Address *" fullWidth={true}>
              <textarea className="input-field" name="currentAddress" value={form.currentAddress} onChange={handleChange} rows={2} placeholder="Full current address" />
            </Field>

            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-8px' }}>
              <input type="checkbox" id="sameAsCurrent" name="sameAsCurrent" checked={form.sameAsCurrent} onChange={handleChange} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="sameAsCurrent" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Permanent address same as current</label>
            </div>

            {!form.sameAsCurrent && (
              <Field label="Permanent Address *" fullWidth={true}>
                <textarea className="input-field" name="permanentAddress" value={form.permanentAddress} onChange={handleChange} rows={2} placeholder="Full permanent address" />
              </Field>
            )}

            <Field label="District">
              <input className="input-field" name="district" value={form.district} onChange={handleChange} />
            </Field>
            <Field label="State">
              <input className="input-field" name="state" value={form.state} onChange={handleChange} />
            </Field>
            <Field label="Pincode">
              <input className="input-field" name="pincode" value={form.pincode} onChange={handleChange} />
            </Field>
          </FormSection>

          {/* Section 3: Experience Details */}
          <FormSection title="3. Experience Details" defaultOpen={false}>
            <Field label="Experience Type *">
              <select className="input-field select-field" name="experienceType" value={form.experienceType} onChange={handleChange}>
                {EXPERIENCE_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            
            {form.experienceType === 'Experienced' && (
              <>
                <Field label="Total Experience (Years) *">
                  <input className="input-field" type="number" step="0.1" name="totalExperienceYears" value={form.totalExperienceYears} onChange={handleChange} placeholder="e.g. 2.5" />
                </Field>
                <Field label="Last Company Name">
                  <input className="input-field" name="lastCompanyName" value={form.lastCompanyName} onChange={handleChange} />
                </Field>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <FileUploadField label="Experience Certificates" onChange={(f) => handleFileChange('experienceCertificate', f)} file={files.experienceCertificate} existingUrl={existingUrls.experienceCertificate} required={false} />
                </div>
              </>
            )}
          </FormSection>

          {/* Section 4: Health Information */}
          <FormSection title="4. Health Information" defaultOpen={false}>
            <Field label="Has any pre-existing disease? *">
              <select className="input-field select-field" name="hasDisease" value={form.hasDisease} onChange={handleChange}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </Field>
            {form.hasDisease === 'Yes' && (
              <Field label="Disease Name / Details">
                <input className="input-field" name="diseaseName" value={form.diseaseName} onChange={handleChange} placeholder="Provide details" />
              </Field>
            )}
          </FormSection>

          {/* Section 5: Job Details */}
          <FormSection title="5. Job Details" defaultOpen={false}>
            <Field label="Joining Date *">
              <input className="input-field" type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} />
            </Field>
            <Field label="Department *">
              <select className="input-field select-field" name="department" value={form.department} onChange={handleChange} style={{ padding: '0 8px 0 16px' }} >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Position *">
              <select className="input-field select-field" name="position" value={form.position} onChange={handleChange} style={{ padding: '0 8px 0 16px' }}>
                 <option value="">Select Position</option>
                 {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Role *">
              <select className="input-field select-field" name="role" value={form.role} onChange={handleChange}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Reporting Manager">
              <input className="input-field" name="reportingManager" value={form.reportingManager} onChange={handleChange} placeholder="Manager Name" />
            </Field>
            <Field label="Salary (Monthly) *">
              <input className="input-field" type="number" name="salary" value={form.salary} onChange={handleChange} placeholder="₹" />
            </Field>
          </FormSection>

          {/* Section 6: Education Details */}
          <FormSection title="6. Education Details" defaultOpen={false}>
            {/* 12th details */}
            <div style={{ gridColumn: '1 / -1', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '8px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>12th / Diploma</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                <Field label="Percentage *">
                  <input className="input-field" type="number" step="0.01" name="hscPercent" value={form.hscPercent} onChange={handleChange} placeholder="e.g. 85.50" />
                </Field>
                <FileUploadField label="12th/Diploma Marksheet" onChange={(f) => handleFileChange('twelfthMarksheet', f)} file={files.twelfthMarksheet} existingUrl={existingUrls.twelfthMarksheet} required={false} />
              </div>
            </div>

            {/* Graduation */}
            <div style={{ gridColumn: '1 / -1', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '8px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Graduation</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                <Field label="Course *">
                  <select className="input-field select-field" name="graduationCourse" value={form.graduationCourse} onChange={handleChange}>
                    <option value="">Select Course</option>
                    {GRADUATION_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Percentage *">
                  <input className="input-field" type="number" step="0.01" name="graduationPercent" value={form.graduationPercent} onChange={handleChange} placeholder="e.g. 75.00" />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FileUploadField label="Graduation Marksheet" onChange={(f) => handleFileChange('graduationMarksheet', f)} file={files.graduationMarksheet} existingUrl={existingUrls.graduationMarksheet} required={false} />
                </div>
              </div>
            </div>

            {/* Post Graduation */}
            <div style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--color-text)' }}>Post Graduation (Optional)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                <Field label="Course">
                  <select className="input-field select-field" name="postGraduationCourse" value={form.postGraduationCourse} onChange={handleChange}>
                    <option value="">Select Course</option>
                    {PG_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Percentage">
                  <input className="input-field" type="number" step="0.01" name="postGraduationPercent" value={form.postGraduationPercent} onChange={handleChange} placeholder="e.g. 80.00" />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FileUploadField label="PG Marksheet" onChange={(f) => handleFileChange('postGraduationMarksheet', f)} file={files.postGraduationMarksheet} existingUrl={existingUrls.postGraduationMarksheet} required={false} />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 7: ID Proofs */}
          <FormSection title="7. Identity Proofs" defaultOpen={false}>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* Aadhaar */}
              <div style={{ background: 'var(--color-surface-alt)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>Aadhaar Card</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Field label="Aadhaar Number *">
                    <input className="input-field" name="aadhaarNumber" value={form.aadhaarNumber} onChange={handleChange} placeholder="XXXX XXXX XXXX" />
                  </Field>
                  <FileUploadField label="Aadhaar Card File" onChange={(f) => handleFileChange('aadhaarFile', f)} file={files.aadhaarFile} existingUrl={existingUrls.aadhaarFile} required={false} />
                </div>
              </div>

              {/* PAN */}
              <div style={{ background: 'var(--color-surface-alt)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>PAN Card</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Field label="PAN Number *">
                    <input className="input-field" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
                  </Field>
                  <FileUploadField label="PAN Card File" onChange={(f) => handleFileChange('panFile', f)} file={files.panFile} existingUrl={existingUrls.panFile} required={false} />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 8: Bank Details */}
          <FormSection title="8. Bank Details" defaultOpen={false}>
            <Field label="Account Holder Name *">
              <input className="input-field" name="accountHolderName" value={form.accountHolderName} onChange={handleChange} placeholder="As per bank records" />
            </Field>
            <Field label="Bank Name *">
              <input className="input-field" name="bankName" value={form.bankName} onChange={handleChange} placeholder="e.g. State Bank of India" />
            </Field>
            <Field label="Account Number *">
              <input className="input-field" name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="Account Number" />
            </Field>
            <Field label="IFSC Code *">
              <input className="input-field" name="ifsc" value={form.ifsc} onChange={handleChange} placeholder="e.g. SBIN0001234" style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Branch *">
              <input className="input-field" name="branch" value={form.branch} onChange={handleChange} placeholder="Branch Location" />
            </Field>
            <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
              <FileUploadField label="Bank Passbook / Cancelled Cheque" onChange={(f) => handleFileChange('passbookFile', f)} file={files.passbookFile} existingUrl={existingUrls.passbookFile} required={false} />
            </div>
          </FormSection>

          {/* Section 9: Emergency Contact */}
          <FormSection title="9. Emergency Contact" defaultOpen={false}>
            <Field label="Contact Person Name *">
              <input className="input-field" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} placeholder="Full Name" />
            </Field>
            <Field label="Relationship *">
              <input className="input-field" name="emergencyContactRelationship" value={form.emergencyContactRelationship} onChange={handleChange} placeholder="e.g. Father, Spouse" />
            </Field>
            <Field label="Mobile Number *">
              <input className="input-field" name="emergencyContactMobile" value={form.emergencyContactMobile} onChange={handleChange} placeholder="Emergency Contact No." maxLength={15} />
            </Field>
            <Field label="Address" fullWidth={true}>
              <textarea className="input-field" name="emergencyContactAddress" value={form.emergencyContactAddress} onChange={handleChange} rows={2} placeholder="Contact person's address" />
            </Field>
          </FormSection>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'flex-end', padding: '24px', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 -4px 20px rgba(0,0,0,0.03)' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/employees')} style={{ padding: '12px 24px', fontSize: '1rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px 32px', fontSize: '1rem', minWidth: '200px' }}>
              {loading ? <><Loader2 size={20} className="spin" /> Processing...</> : <><Check size={20} /> Save Updates</>}
            </button>
          </div>
        </form>
        <style>{`
          .spin { animation: spin 1s linear infinite; } 
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </AppShell>
  );
};

export default EditEmployee;
