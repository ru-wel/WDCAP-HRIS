import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS, EMPLOYMENT_STATUSES } from "../config/constants.js";
import logger from "../utils/logger.js";
import { createChecklistForEmployee } from "./onboarding.service.js";

// this will be changed later on kapag alam na yung mga fields na need idisplay
const employeeFields = 
  `id,
  employee_id,
  user_id,
  first_name,
  middle_name,
  last_name,
  birth_date,
  phone_number,
  address,
  emergency_contact_name,
  emergency_contact_number,
  hire_date,
  employment_status,
  personnel_type,
  created_at,
  updated_at,
  departments (id, department_name),
  positions (id, position_title)
  `

// create new employee
export const createNewEmployee = async (employeeData, userId) => {
  try {
    // check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', employeeData.user_id)
      .single();

    if (userError || !existingUser) {
      throw new NotFoundError('User not found');
    }

    // check if user is already an employee
    const { data: existingEmployee, error: empCheckError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', employeeData.user_id)
      .single();

    if (existingEmployee) {
      throw new ConflictError('User is already registered as an employee');
    }

    // verify department exists
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('id, department_name')
      .eq('id', employeeData.department_id)
      .single();

    if (deptError || !department) {
      throw new NotFoundError('Department not found');
    }

    // verify position exists
    const { data: position, error: posError } = await supabase
      .from('positions')
      .select('id, position_title')
      .eq('id', employeeData.position_id)
      .single();

    if (posError || !position) {
      throw new NotFoundError('Position not found');
    }

    // call supabase function to generate employee_id and insert employee
    const { data: newEmployee, error: insertError } = await supabase
      .rpc('create_new_employee', {
        p_user_id: employeeData.user_id,
        p_first_name: employeeData.first_name,
        p_middle_name: employeeData.middle_name || null,
        p_last_name: employeeData.last_name,
        p_birth_date: employeeData.birth_date,
        p_phone_number: employeeData.phone_number,
        p_address: employeeData.address,
        p_emergency_contact_name: employeeData.emergency_contact_name,
        p_emergency_contact_number: employeeData.emergency_contact_number,
        p_hire_date: employeeData.hire_date,
        p_position_id: employeeData.position_id,
        p_department_id: employeeData.department_id,
        p_employment_status: employeeData.employment_status,
        p_personnel_type: employeeData.personnel_type
      })
      .single();

    if (insertError) {
      logger.error('RPC error creating employee:', insertError);
      throw new InternalServerError('Failed to create employee: ' + insertError.message);
    }

    // fetch the complete employee record with relations
    const { data: completeEmployee, error: fetchError } = await supabase
      .from('employees')
      .select(employeeFields)
      .eq('id', newEmployee.id)
      .single();

    if (fetchError) {
      throw new InternalServerError('Employee created but failed to fetch details');
    }
    
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ employee_id: completeEmployee.employee_id })
      .eq('id', employeeData.user_id);

    if (updateUserError) {
      logger.error('Failed to update user with employee_id:', updateUserError);
    }

    // log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'employees',
      record_id: completeEmployee.id,
      new_values: completeEmployee,
      timestamp: new Date().toISOString()
    });

    logger.info(`New employee created: ${completeEmployee.employee_id} - ${completeEmployee.first_name} ${completeEmployee.last_name}`);

    // auto create onboarding checklist when employee is created
    try {
      await createChecklistForEmployee(completeEmployee.id, userId);
      logger.info(`Onboarding checklist auto-created for employee: ${completeEmployee.employee_id}`);
    } catch (checklistError) {
      logger.error(`Failed to create onboarding checklist for employee ${completeEmployee.employee_id}:`, checklistError);
    }

    return completeEmployee;

  } catch (error) {
    logger.error('Error creating employee:', error);
    throw error;
  }
};

// get all employees with department and position info
export const getAllEmployees = async () => {
  return getAllEmployeesWithOptions({ includeInactive: false });
};

export const getAllEmployeesWithOptions = async ({ includeInactive = false } = {}) => {
  try {
    let query = supabase
      .from('employees')
      .select(employeeFields)
      .order('employee_id', { ascending: true });

    if (!includeInactive) {
      query = query.eq('employment_status', EMPLOYMENT_STATUSES.ACTIVE);
    }

    const { data: employees, error } = await query;
    if (error) throw new InternalServerError(error.message);
    return employees || [];
  } catch (error) {
    logger.error('Error fetching employees:', error);
    throw error;
  }
};

// get employee by ID
export const getEmployeeById = async (employeeId) => {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(employeeFields)
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      throw new NotFoundError('Employee not found');
    }

    return employee;

  } catch (error) {
    logger.error(`Error fetching employee ${employeeId}:`, error);
    throw error;
  }
};

// get employee by user_id
export const getEmployeeByUserId = async (userId) => {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(employeeFields)
      .eq('user_id', userId)
      .single();

    if (error || !employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return employee;

  } catch (error) {
    logger.error(`Error fetching employee details for user ${userId}`, error);
    throw error; 
  }
};

// get employee profile for the currently-authenticated user (self)
export const getMyEmployeeProfile = async ({ employee_db_id, employee_id, user_id }) => {
  try {
    let query = supabase.from('employees').select(employeeFields);

    if (employee_db_id) {
      query = query.eq('id', employee_db_id);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (employee_id) {
      query = query.eq('employee_id', employee_id);
    } else {
      throw new NotFoundError('Employee profile not found');
    }

    const { data: employee, error } = await query.maybeSingle();

    if (error || !employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return employee;
  } catch (error) {
    logger.error('Error fetching my employee profile:', error);
    throw error;
  }
};

// update employee
export const updateEmployee = async (employeeId, updateData, userId) => {
  try {
    // fetch existing employee with relations
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select(employeeFields)
      .eq('id', employeeId)
      .single();

    if (fetchError || !existingEmployee) {
      throw new NotFoundError('Employee not found');
    }

    // verify department if being updated
    if (updateData.department_id && updateData.department_id !== existingEmployee.department_id) {
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('id', updateData.department_id)
        .single();

      if (deptError || !department) {
        throw new NotFoundError('Department not found');
      }
    }

    // verify position if being updated
    if (updateData.position_id && updateData.position_id !== existingEmployee.position_id) {
      const { data: position, error: posError } = await supabase
        .from('positions')
        .select('id')
        .eq('id', updateData.position_id)
        .single();

      if (posError || !position) {
        throw new NotFoundError('Position not found');
      }
    }

    // update employee
    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employees')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select(employeeFields)
      .single();

    if (updateError) {
      throw new InternalServerError(updateError.message);
    }

    // log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'employees',
      record_id: updatedEmployee.id,
      old_values: existingEmployee,
      new_values: updatedEmployee,
      timestamp: new Date().toISOString()
    });

    logger.info(`Employee updated: ${updatedEmployee.employee_id} - ${updatedEmployee.first_name} ${updatedEmployee.last_name}`);

    return updatedEmployee;

  } catch (error) {
    logger.error(`Error updating employee ${employeeId}:`, error);
    throw error;
  }
}

// delete employee
export const deleteEmployee = async (employeeId, userId) => {
  try {
    // fetch existing employee with relations
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select(employeeFields)
      .eq('id', employeeId)
      .single();

    if (fetchError || !existingEmployee) {
      throw new NotFoundError('Employee not found');
    }

    // Best-practice: archive (soft-delete) instead of hard delete to preserve
    // employee-linked records like documents and onboarding checklists.
    if (existingEmployee.employment_status === EMPLOYMENT_STATUSES.INACTIVE) {
      throw new ConflictError('Employee is already inactive');
    }

    const { data: archivedEmployee, error: archiveError } = await supabase
      .from('employees')
      .update({
        employment_status: EMPLOYMENT_STATUSES.INACTIVE,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select(employeeFields)
      .single();

    if (archiveError) {
      throw new InternalServerError(archiveError.message);
    }

    // log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'employees',
      record_id: archivedEmployee.id,
      old_values: existingEmployee,
      new_values: archivedEmployee,
      timestamp: new Date().toISOString()
    });

    logger.info(`Employee archived (set inactive): ${archivedEmployee.employee_id} - ${archivedEmployee.first_name} ${archivedEmployee.last_name}`);

    return archivedEmployee;
  } catch (error) {
    logger.error(`Error deleting employee ${employeeId}:`, error);
    throw error;
  }
};
