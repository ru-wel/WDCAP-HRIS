-- ============================================
-- EMPLOYEES TABLE MIGRATION
-- ============================================
-- Description: Complete schema for employees table including:
--   - Table creation with all fields and constraints
--   - Foreign key relationships to users, departments, and positions
--   - RPC function for auto-generating employee_id (AC-00001 format)
--   - Indexes for performance optimization
--   - Row Level Security (RLS) policies
-- ============================================

-- ============================================
-- 1. CREATE EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(20) UNIQUE NOT NULL, -- Format: AC-00001, AC-00002, etc.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Information
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  birth_date DATE NOT NULL,
  phone_number VARCHAR(11) NOT NULL, -- Format: 09XXXXXXXXX
  address TEXT NOT NULL,

  -- Emergency Contact
  emergency_contact_name VARCHAR(100) NOT NULL,
  emergency_contact_number VARCHAR(11) NOT NULL, -- Format: 09XXXXXXXXX

  -- Employment Information
  hire_date DATE NOT NULL,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  employment_status VARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Inactive
  personnel_type VARCHAR(20) NOT NULL, -- Regular, Project-Based, Probationary

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_employee UNIQUE(user_id),
  CONSTRAINT check_employment_status CHECK (employment_status IN ('Active', 'Inactive')),
  CONSTRAINT check_personnel_type CHECK (personnel_type IN ('Regular', 'Project-Based', 'Probationary')),
  CONSTRAINT check_phone_format CHECK (phone_number ~ '^09\d{9}$'),
  CONSTRAINT check_emergency_phone_format CHECK (emergency_contact_number ~ '^09\d{9}$'),
  CONSTRAINT check_birth_date CHECK (birth_date < CURRENT_DATE),
  CONSTRAINT check_hire_date CHECK (hire_date <= CURRENT_DATE)
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_personnel_type ON employees(personnel_type);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);

-- ============================================
-- 3. CREATE SEQUENCE FOR EMPLOYEE_ID
-- ============================================
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

-- Sync sequence with existing data (if any)
SELECT setval('employee_id_seq',
  COALESCE(
    (SELECT MAX(CAST(SUBSTRING(employee_id FROM 4) AS INTEGER))
     FROM employees
     WHERE employee_id ~ '^AC-\d+$'),
    0
  )
);

-- ============================================
-- 4. CREATE RPC FUNCTION FOR EMPLOYEE CREATION
-- ============================================
-- This function auto-generates employee_id in format AC-00001
CREATE OR REPLACE FUNCTION create_new_employee(
    p_user_id UUID,
    p_first_name VARCHAR,
    p_middle_name VARCHAR,
    p_last_name VARCHAR,
    p_birth_date DATE,
    p_phone_number VARCHAR,
    p_address TEXT,
    p_emergency_contact_name VARCHAR,
    p_emergency_contact_number VARCHAR,
    p_hire_date DATE,
    p_position_id UUID,
    p_department_id UUID,
    p_employment_status VARCHAR,
    p_personnel_type VARCHAR
)
RETURNS employees
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_employee_id VARCHAR;
  v_next_number INTEGER;
  new_employee_row employees%rowtype;
BEGIN
  -- Get next value from sequence (atomic operation)
  v_next_number := nextval('employee_id_seq');

  -- Format as AC-00001, AC-00002, etc.
  v_employee_id := 'AC-' || LPAD(v_next_number::TEXT, 5, '0');

  -- Insert the employee record
  INSERT INTO employees (
    user_id, employee_id, first_name, middle_name, last_name,
    birth_date, phone_number, address, emergency_contact_name,
    emergency_contact_number, hire_date, position_id, department_id,
    employment_status, personnel_type, created_at, updated_at
  ) VALUES (
    p_user_id, v_employee_id, p_first_name, p_middle_name, p_last_name,
    p_birth_date, p_phone_number, p_address, p_emergency_contact_name,
    p_emergency_contact_number, p_hire_date, p_position_id, p_department_id,
    p_employment_status, p_personnel_type, NOW(), NOW()
  )
  RETURNING * INTO new_employee_row;

  RETURN new_employee_row;
END;
$$;

-- ============================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ============================================
-- Automatically update the updated_at timestamp on row updates
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own profile
CREATE POLICY "employees_select_own_profile"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: HR and Admin can view all employees
CREATE POLICY "employees_select_all_for_hr_admin"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('HR', 'Admin')
    )
  );

-- Policy: Only HR and Admin can insert employees
CREATE POLICY "employees_insert_for_hr_admin"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('HR', 'Admin')
    )
  );

-- Policy: Only HR and Admin can update employees
CREATE POLICY "employees_update_for_hr_admin"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('HR', 'Admin')
    )
  );

-- Policy: Only Admin can delete employees
CREATE POLICY "employees_delete_for_admin"
  ON employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Admin'
    )
  );

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
-- Grant necessary permissions to authenticated users
GRANT SELECT ON employees TO authenticated;
GRANT INSERT, UPDATE ON employees TO authenticated;
GRANT DELETE ON employees TO authenticated;

-- Grant usage on sequence
GRANT USAGE ON SEQUENCE employee_id_seq TO authenticated;

-- Grant execute on RPC function
GRANT EXECUTE ON FUNCTION create_new_employee TO authenticated;

-- ============================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE employees IS 'Stores employee information for the HRIS system';
COMMENT ON COLUMN employees.employee_id IS 'Auto-generated employee ID in format AC-00001';
COMMENT ON COLUMN employees.user_id IS 'References auth.users for authentication';
COMMENT ON COLUMN employees.employment_status IS 'Employee status: Active or Inactive';
COMMENT ON COLUMN employees.personnel_type IS 'Type: Regular, Project-Based, or Probationary';
COMMENT ON FUNCTION create_new_employee IS 'Creates new employee with auto-generated employee_id';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- To run this migration:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run the SQL
-- 4. Verify the table exists in Database > Tables
-- ============================================
