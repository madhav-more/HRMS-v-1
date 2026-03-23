-- ==========================================
-- HRMS PostgreSQL Schema (Production Ready)
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. EMPLOYEES TABLE ──
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    status VARCHAR(20) DEFAULT 'Active',
    deactivate_reason TEXT,
    
    -- Basic Details
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    alternate_mobile_number VARCHAR(20),
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    date_of_birth DATE,
    marital_status VARCHAR(20),
    profile_image_url TEXT,

    -- Personal Details
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    current_address TEXT,
    permanent_address TEXT,
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),

    -- Job Details
    joining_date DATE,
    department VARCHAR(100),
    position VARCHAR(100),
    salary NUMERIC(15, 2),
    reporting_manager VARCHAR(255),
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Experience
    experience_type VARCHAR(50),
    total_experience_years NUMERIC(5, 2),
    last_company_name VARCHAR(255),
    experience_certificate_url TEXT,

    -- Education
    hsc_percent NUMERIC(5, 2),
    graduation_course VARCHAR(255),
    graduation_percent NUMERIC(5, 2),
    post_graduation_course VARCHAR(255),
    post_graduation_percent NUMERIC(5, 2),

    -- Docs
    aadhaar_number VARCHAR(20),
    pan_number VARCHAR(20),
    aadhaar_file_url TEXT,
    pan_file_url TEXT,
    passbook_file_url TEXT,
    tenth_marksheet_url TEXT,
    twelfth_marksheet_url TEXT,
    graduation_marksheet_url TEXT,
    post_graduation_marksheet_url TEXT,
    medical_document_url TEXT,

    -- Bank Details
    account_holder_name VARCHAR(255),
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc VARCHAR(20),
    branch VARCHAR(255),
    bank_verified BOOLEAN DEFAULT FALSE,
    bank_verified_date TIMESTAMP,

    -- Verification
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified_date TIMESTAMP,
    pan_verified_date TIMESTAMP,

    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_mobile VARCHAR(20),
    emergency_contact_address TEXT,

    -- Health
    has_disease VARCHAR(10) DEFAULT 'No',
    disease_name VARCHAR(255),
    disease_type VARCHAR(255),
    disease_since VARCHAR(100),
    medicines_required TEXT,
    doctor_name VARCHAR(255),
    doctor_contact VARCHAR(20),

    -- Comp Off & System
    comp_off_balance NUMERIC(5, 2) DEFAULT 0,
    last_working_date DATE,
    refresh_token TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. ATTENDANCE TABLE ──
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_code VARCHAR(20) NOT NULL,
    employee_name VARCHAR(255),
    date DATE NOT NULL,
    
    in_time TIMESTAMP,
    out_time TIMESTAMP,
    total_hours NUMERIC(5, 2),
    total_minutes INTEGER,
    status VARCHAR(10) DEFAULT 'P',
    
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INTEGER DEFAULT 0,
    
    is_geo_attendance BOOLEAN DEFAULT FALSE,
    check_in_latitude NUMERIC(10, 8),
    check_in_longitude NUMERIC(11, 8),
    check_out_latitude NUMERIC(10, 8),
    check_out_longitude NUMERIC(11, 8),
    
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_status VARCHAR(20) DEFAULT 'None',
    correction_remark TEXT,
    correction_proof_url TEXT,
    correction_requested_on TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_on TIMESTAMP,
    requested_by_role VARCHAR(50),
    pending_with_role VARCHAR(50),
    
    is_comp_off_credited BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_code, date)
);

-- ── 3. LEAVES TABLE ──
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL,
    half_day BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(20) DEFAULT '',
    reason TEXT NOT NULL,
    
    hr_status VARCHAR(20) DEFAULT 'Pending',
    gm_status VARCHAR(20) DEFAULT 'Pending',
    director_status VARCHAR(20) DEFAULT 'Pending',
    overall_status VARCHAR(20) DEFAULT 'Pending',
    current_approver_role VARCHAR(20) DEFAULT 'HR',
    
    hr_remarks TEXT DEFAULT '',
    gm_remarks TEXT DEFAULT '',
    director_remarks TEXT DEFAULT '',
    
    cancelled_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT DEFAULT '',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. LEAVE ACTION HISTORY TABLE ──
CREATE TABLE IF NOT EXISTS leave_action_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leave_id UUID NOT NULL REFERENCES leaves(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    by_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    by_name VARCHAR(255),
    by_role VARCHAR(50),
    remarks TEXT DEFAULT '',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. ANNOUNCEMENTS TABLE ──
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'General',
    priority VARCHAR(50) DEFAULT 'Normal',
    
    target_type VARCHAR(50) DEFAULT 'All',
    target_departments TEXT[], -- Array of strings
    target_roles TEXT[], -- Array of strings
    -- target_employees will be mapped in a separate table
    
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 6. ANNOUNCEMENT TARGET EMPLOYEES ──
CREATE TABLE IF NOT EXISTS announcement_target_employees (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, employee_id)
);

-- ── 7. ANNOUNCEMENT READ STATUS ──
CREATE TABLE IF NOT EXISTS announcement_read_status (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (announcement_id, employee_id)
);

-- ==========================================
-- SUPERUSER SEED DATA
-- Note: Replace the hash with a real hashed password if you run this manually without backend script or use raw password if seeding through backend.
-- The passwords below must be hashed since we are removing Mongoose's `pre('save')` hook.
-- Assuming 'Madhav@123' generates: $2a$12$W9yH... (You should hash it properly in production)
-- FOR NOW: using placeholder hash for "password123": $2a$12$LhO8/RIfJv4Y9g2vG2wQou5aD.0Zl8wO18S6b0B/.V4T.Qp4I.jJ2
-- ==========================================

INSERT INTO employees (
    employee_code, password, role, name, email, mobile_number, status
) VALUES (
    'IA00001', 
    '$2a$12$AftG9O1.V/b3kYn3R5i3.erw9.LpOhL3E2E69bXzO/G9aZ6/k9S2G', -- hashed 'Madhav@123'
    'SuperUser', 
    'System Admin One', 
    'admin1@infinity.com', 
    '9999999991',
    'Active'
) ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO employees (
    employee_code, password, role, name, email, mobile_number, status
) VALUES (
    'IA00002', 
    '$2a$12$AftG9O1.V/b3kYn3R5i3.erw9.LpOhL3E2E69bXzO/G9aZ6/k9S2G', -- hashed 'Madhav@123'
    'SuperUser', 
    'System Admin Two', 
    'admin2@infinity.com', 
    '9999999992',
    'Active'
) ON CONFLICT (employee_code) DO NOTHING;
