import { supabase } from '../config/supabase.js';
import { NotFoundError, InternalServerError, ConflictError } from '../utils/errors.js';
import { AUDIT_ACTIONS, ONBOARDING_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { ROLES } from '../config/constants.js';

// Fields to select for checklist items with relations
const checklistFields = `
  id,
  employee_id,
  checklist_item_id,
  is_required,
  status,
  remarks,
  document_id,
  submitted_at,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at,
  onboarding_items (id, item_name),
  documents (id, file_name, file_path),
  reviewed_by_user:users!onboarding_checklists_reviewed_by_fkey (id, email)
`;

// create user account and employee record together, so if employee creation fails, fail user creation
export const createEmployeeWithAccount = async (onboardingData) => {
  let authUserId = null;
  let createdUserId = null;

  try {
    const {
      // account info
      email,
      password,
      role = ROLES.EMPLOYEE,
      // employee info
      first_name,
      middle_name,
      last_name,
      birth_date,
      phone_number,
      address,
      emergency_contact_name,
      emergency_contact_number,
      hire_date,
      position_id,
      department_id,
      employment_status,
      personnel_type
    } = onboardingData;

    // check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError || !authData.user) {
      throw new InternalServerError('Failed to create user account in Auth');
    }

    authUserId = authData.user.id;

    // insert user into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        id: authUserId,
        email,
        role,
        employee_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: null
      }])
      .select()
      .single();

    if (insertError) {
      throw new InternalServerError(`Failed to create user record: ${insertError.message}`);
    }

    createdUserId = newUser.id;

    // verify department and position exist
    const [deptResult, posResult] = await Promise.all([
      supabase.from('departments').select('id').eq('id', department_id).single(),
      supabase.from('positions').select('id').eq('id', position_id).single()
    ]);

    if (deptResult.error || !deptResult.data) {
      throw new InternalServerError('Department not found');
    }
    if (posResult.error || !posResult.data) {
      throw new InternalServerError('Position not found');
    }

    // create employee record using supabase RPC function
    const { data: newEmployee, error: employeeError } = await supabase
      .rpc('create_new_employee', {
        p_user_id: createdUserId,
        p_first_name: first_name,
        p_middle_name: middle_name || null,
        p_last_name: last_name,
        p_birth_date: birth_date,
        p_phone_number: phone_number,
        p_address: address,
        p_emergency_contact_name: emergency_contact_name,
        p_emergency_contact_number: emergency_contact_number,
        p_hire_date: hire_date,
        p_position_id: position_id,
        p_department_id: department_id,
        p_employment_status: employment_status,
        p_personnel_type: personnel_type
      })
      .single();

    if (employeeError) {
      throw new InternalServerError(`Failed to create employee: ${employeeError.message}`);
    }

    // fetch complete employee record
    const { data: completeEmployee, error: fetchError } = await supabase
      .from('employees')
      .select(`
          id, employee_id, user_id, first_name, middle_name, last_name,
          birth_date, phone_number, address, emergency_contact_name,
          emergency_contact_number, hire_date, employment_status, personnel_type,
          created_at, updated_at,
          departments (id, department_name),
          positions (id, position_title)
        `)
      .eq('id', newEmployee.id)
      .single();

    if (fetchError) {
      throw new InternalServerError('Employee created but failed to fetch details');
    }

    // update user with employee_id (AC-00001)
    await supabase
      .from('users')
      .update({ employee_id: completeEmployee.employee_id })
      .eq('id', createdUserId);

    // log to audit_logs
    await supabase.from('audit_logs').insert([
      {
        user_id: createdUserId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'users',
        record_id: createdUserId,
        new_values: { email, role },
        timestamp: new Date().toISOString()
      },
      {
        user_id: createdUserId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'employees',
        record_id: completeEmployee.id,
        new_values: completeEmployee,
        timestamp: new Date().toISOString()
      }
    ]);

    // create onboarding checklist
    try {
      await createChecklistForEmployee(completeEmployee.id, createdUserId);
    } catch (checklistError) {
      logger.error(`Failed to create checklist: ${checklistError.message}`);
    }

    logger.info(`Employee onboarded successfully: ${completeEmployee.employee_id} - ${email}`);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      employee: completeEmployee
    };

  } catch (error) {
    // if anything fails, clean up what was created
    logger.error('Onboarding failed, attempting rollback:', error);

    // delete employee if it was created
    if (createdUserId) {
      try {
        await supabase.from('employees').delete().eq('user_id', createdUserId);
        logger.info('Rolled back employee record');
      } catch (rollbackError) {
        logger.error('Failed to rollback employee:', rollbackError);
      }
    }

    // rollback to delete user from users table
    if (createdUserId) {
      try {
        await supabase.from('users').delete().eq('id', createdUserId);
        logger.info('Rolled back user record');
      } catch (rollbackError) {
        logger.error('Failed to rollback user record:', rollbackError);
      }
    }

    // rollback to delete auth user
    if (authUserId) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
        logger.info('Rolled back auth user');
      } catch (rollbackError) {
        logger.error('Failed to rollback auth user:', rollbackError);
      }
    }

    throw error;
  }
};

export const createChecklistForEmployee = async (employeeId, userId) => {
  try {
    const { data: items, error: fetchError } = await supabase
      .from('onboarding_items')
      .select('id, item_name, is_required_by_default')
      .order('display_order', { ascending: true });

    if (fetchError) {
      throw new InternalServerError(fetchError.message);
    }

    if (!items || items.length === 0) {
      logger.info(`No onboarding items found to create checklist for employee ${employeeId}`);
      return [];
    }

    const checklistItems = items.map(item => ({
      employee_id: employeeId,
      checklist_item_id: item.id,
      is_required: item.is_required_by_default,
      status: ONBOARDING_STATUSES.PENDING
    }));

    const { data: createdItems, error: insertError } = await supabase
      .from('onboarding_checklists')
      .insert(checklistItems)
      .select();

    if (insertError) {
      throw new InternalServerError(insertError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'onboarding_checklists',
      record_id: employeeId,
      new_values: { employee_id: employeeId, items_count: createdItems.length },
      timestamp: new Date().toISOString()
    });

    logger.info(`Onboarding checklist created for employee ${employeeId}: ${createdItems.length} items`);

    return createdItems;

  } catch (error) {
    logger.error(`Error creating checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

export const getEmployeeChecklist = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name,
            display_order
          ),
          documents (
            id,
            file_name,
            file_path,
            uploaded_at
          ),
          reviewed_by:users!onboarding_checklists_reviewed_by_fkey (
            id,
            email
          )
        `)
      .eq('employee_id', employeeId)
      .order('onboarding_items(display_order)', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];

  } catch (error) {
    logger.error(`Error fetching checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

export const getAllChecklists = async () => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
        id,
        employee_id,
        is_required,
        status,
        remarks,
        submitted_at,
        reviewed_at,
        employees (
          id,
          employee_id,
          first_name,
          last_name,
          hire_date,
          personnel_type
        ),
        onboarding_items (
          id,
          item_name
        ),
        documents (
          id,
          file_name,
          file_path
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];

  } catch (error) {
    logger.error('Error fetching all checklists:', error);
    throw error;
  }
};

export const getChecklistItemById = async (checklistId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          id,
          employee_id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name
          ),
          documents (
            id,
            file_name,
            file_url
          )
        `)
      .eq('id', checklistId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Checklist item not found');
    }

    return data;

  } catch (error) {
    logger.error(`Error fetching checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const updateChecklistItem = async (checklistId, updates, userId) => {
  try {
    // fetch existing checklist item with relations
    const { data: existingItem, error: fetchError } = await supabase
      .from('onboarding_checklists')
      .select(checklistFields)
      .eq('id', checklistId)
      .single();

    if (fetchError || !existingItem) {
      throw new NotFoundError('Checklist item not found');
    }

    const { data, error } = await supabase
      .from('onboarding_checklists')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', checklistId)
      .select(checklistFields)
      .single();

    if (error) {
      throw new InternalServerError(error.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'onboarding_checklists',
      record_id: checklistId,
      old_values: existingItem,
      new_values: data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Checklist item updated: ${checklistId}`);

    return data;

  } catch (error) {
    logger.error(`Error updating checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const submitDocument = async (checklistId, documentId, userId) => {
  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new NotFoundError('Document not found');
    }

    const updates = {
      document_id: documentId,
      status: ONBOARDING_STATUSES.SUBMITTED,
      submitted_at: new Date().toISOString()
    };

    return await updateChecklistItem(checklistId, updates, userId);

  } catch (error) {
    logger.error(`Error submitting document for checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const reviewSubmission = async (checklistId, status, remarks, reviewerId) => {
  try {
    const updates = {
      status,
      remarks: remarks || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId
    };

    return await updateChecklistItem(checklistId, updates, reviewerId);

  } catch (error) {
    logger.error(`Error reviewing checklist item ${checklistId}:`, error);
    throw error;
  }
};