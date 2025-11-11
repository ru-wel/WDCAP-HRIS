import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

// create a new department
export const createNewDepartment = async (departmentName, userId) => {
  try {
    const { data: existingDepartment, error: checkError } = await supabase
      .from('departments')
      .select('id, department_name')
      .eq('department_name', departmentName)
      .single();

    if (existingDepartment){
      throw new ConflictError('Department already exists');
    }

    const { data: newDepartment, error: insertError } = await supabase
      .from('departments')
      .insert([
        {
          department_name: departmentName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError){
      throw new InternalServerError('Failed to create department')
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'departments',
      record_id: newDepartment.id,
      new_values: newDepartment,
      timestamp: new Date().toISOString()
    });

    logger.info(`New department created: ${newDepartment.department_name}`);

    return newDepartment;

  } catch (error) {
    logger.error('Error creating department', error);
    throw error;
  }
};

export const getAllDepartments = async () => {
  try {
    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .order('department_name', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return departments || [];

  } catch (error) {
    logger.error('Error fetching departments:', error);
    throw error;
  }
};

export const getDepartmentById = async (departmentId) => {
  try {
    const { data: department, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();
    
    if (error || !department) {
      throw new NotFoundError('Department not found');
    }

    return department;

  } catch (error) {
    logger.error(`Error fetching department ${departmentId}:`, error);
    throw error;
  }
};

export const updateDepartment = async (departmentId, departmentName, userId) => {
  try {
    const { data: existingDepartment, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (fetchError || !existingDepartment) {
      throw new NotFoundError('Department not found');
    }

    if (departmentName && departmentName !== existingDepartment.department_name){
      const { data: duplicateDept, error: dupError } = await supabase
        .from('departments')
        .select('id')
        .eq('department_name', departmentName)
        .single();

      if (duplicateDept) {
        throw new ConflictError('Department name already exists');
      }
    }

    const { data: updatedDepartment, error: updateError } = await supabase
     .from('departments')
     .update({
        department_name: departmentName, 
        updated_at: new Date().toISOString()
      })
      .eq('id', departmentId)
      .select()
      .single()

    if (updateError){
      throw new InternalServerError(updateError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'departments',
      record_id: updatedDepartment.id,
      old_values: existingDepartment,
      new_values: updatedDepartment,
      timestamp: new Date().toISOString()
    });

    logger.info(`Department updated: ${updatedDepartment.department_name}`);

    return updatedDepartment;

  } catch (error) {
    logger.error(`Error updating department ${departmentId}:`, error);
    throw error;
  }
};

export const deleteDepartment = async (departmentId, userId) => {
  try {
    const { data: existingDepartment, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (fetchError || !existingDepartment) {
      throw new NotFoundError('Department not found');
    }

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('department_id', departmentId)
      .limit(1);

    if (empError) { 
      throw new InternalServerError('Failed to check department');
    }

    if (employees && employees.length > 0) {
      throw new ConflictError('Cannot delete department with existing employees');
    }

    const { data: deletedDepartment, error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentId)
      .select()
      .single();

    if (deleteError) {
      throw new InternalServerError(deleteError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'departments',
      record_id: deletedDepartment.id,
      old_values: existingDepartment,
      timestamp: new Date().toISOString()
    });

    logger.info(`Department deleted ${deletedDepartment.department_name}`);

    return deletedDepartment;

  } catch (error) {
    logger.error(`Error deleting department ${departmentId}:`, error);
    throw error;
  }
};