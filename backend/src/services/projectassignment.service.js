import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

// Fields to select with relations
const assignmentFields = `
id,
employee_id,
project_id,
assignment_date,
end_date,
status,
notes,
created_at,
updated_at,
employees (id, first_name, last_name),
projects (id, project_name)
`;

// CREATE ASSIGNMENT
export const createAssignment = async (assignmentData, userId) => {
  try {
    // verify employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', assignmentData.employee_id)
      .single();

    if (empError || !employee) throw new NotFoundError('Employee not found');

    // verify project exists
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', assignmentData.project_id)
      .single();

    if (projError || !project) throw new NotFoundError('Project not found');

    // create assignment
    const { data: newAssignment, error: insertError } = await supabase
      .from('project_assignments')
      .insert([
        {
          ...assignmentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) throw new InternalServerError('Failed to create assignment');

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'project_assignments',
      record_id: newAssignment.id,
      new_values: newAssignment,
      timestamp: new Date().toISOString()
    });

    logger.info(`New project assignment created: ${newAssignment.id}`);
    return newAssignment;

  } catch (error) {
    logger.error('Error creating assignment:', error);
    throw error;
  }
};

// GET ALL ASSIGNMENTS
export const getAllAssignments = async () => {
  try {
    const { data: assignments, error } = await supabase
      .from('project_assignments')
      .select(assignmentFields)
      .order('assignment_date', { ascending: true });

    if (error) throw new InternalServerError(error.message);
    return assignments || [];

  } catch (error) {
    logger.error('Error fetching assignments:', error);
    throw error;
  }
};

// GET ASSIGNMENT BY ID
export const getAssignmentById = async (assignmentId) => {
  try {
    const { data: assignment, error } = await supabase
      .from('project_assignments')
      .select(assignmentFields)
      .eq('id', assignmentId)
      .single();

    if (error || !assignment) throw new NotFoundError('Assignment not found');
    return assignment;

  } catch (error) {
    logger.error(`Error fetching assignment ${assignmentId}:`, error);
    throw error;
  }
};

// UPDATE ASSIGNMENT
export const updateAssignment = async (assignmentId, updateData, userId) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !existing) throw new NotFoundError('Assignment not found');

    // verify employee/project if updated
    if (updateData.employee_id && updateData.employee_id !== existing.employee_id) {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', updateData.employee_id)
        .single();
      if (empError || !employee) throw new NotFoundError('Employee not found');
    }

    if (updateData.project_id && updateData.project_id !== existing.project_id) {
      const { data: project, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', updateData.project_id)
        .single();
      if (projError || !project) throw new NotFoundError('Project not found');
    }

    const { data: updatedAssignment, error: updateError } = await supabase
      .from('project_assignments')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) throw new InternalServerError(updateError.message);

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'project_assignments',
      record_id: updatedAssignment.id,
      old_values: existing,
      new_values: updatedAssignment,
      timestamp: new Date().toISOString()
    });

    logger.info(`Assignment updated: ${updatedAssignment.id}`);
    return updatedAssignment;

  } catch (error) {
    logger.error(`Error updating assignment ${assignmentId}:`, error);
    throw error;
  }
};

// DELETE ASSIGNMENT
export const deleteAssignment = async (assignmentId, userId) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !existing) throw new NotFoundError('Assignment not found');

    const { data: deletedAssignment, error: deleteError } = await supabase
      .from('project_assignments')
      .delete()
      .eq('id', assignmentId)
      .select()
      .single();

    if (deleteError) throw new InternalServerError(deleteError.message);

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'project_assignments',
      record_id: deletedAssignment.id,
      old_values: existing,
      timestamp: new Date().toISOString()
    });

    logger.info(`Assignment deleted: ${deletedAssignment.id}`);
    return deletedAssignment;

  } catch (error) {
    logger.error(`Error deleting assignment ${assignmentId}:`, error);
    throw error;
  }
};
