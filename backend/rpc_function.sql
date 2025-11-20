-- Create the sequence (run once)
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

-- After creating, run this once to sync with existing data
SELECT setval('employee_id_seq',
  COALESCE(
    (SELECT MAX(CAST(SUBSTRING(employee_id FROM 4) AS INTEGER))
     FROM employees
     WHERE employee_id ~ '^AC-\d+$'),
    0
  )
);

-- Create or replace the function
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
-- 👇 FIX: Change the return type to the full 'employees' table
RETURNS employees
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id VARCHAR;
  v_next_number INTEGER;
  -- 👇 FIX: Create a variable to hold the entire new row
  new_employee_row employees%rowtype; 
BEGIN
  -- Get next value from sequence (atomic)
  v_next_number := nextval('employee_id_seq');

  -- Format as AC-00001
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
  -- 👇 FIX: Return the *entire* new row into the variable
  RETURNING * INTO new_employee_row;

  -- 👇 FIX: Return the single variable
  RETURN new_employee_row;

END;
$$;