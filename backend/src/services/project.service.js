import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

// create a new project
export const createNewProject = async (projectName, siteLocation, startDate, endDate, status, userId) => {
  try {
    // check duplicate by project_name
    const { data: existing, error: dupError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_name', projectName)
      .single();

    if (existing) {
      throw new ConflictError('Project with the same name already exists');
    }

    const timestamp = new Date().toISOString();
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([
        {
          project_name: projectName,
          site_location: siteLocation,
          start_date: startDate,
          end_date: endDate,
          status,
          created_at: timestamp,
          updated_at: timestamp
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw new InternalServerError('Failed to create project');
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'projects',
      record_id: newProject.id,
      new_values: newProject,
      timestamp: new Date().toISOString()
    });

    logger.info(`New project created: ${newProject.project_name}`);

    return newProject;
  } catch (error) {
    logger.error('Error creating project', error);
    throw error;
  }
};

export const getAllProjects = async () => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, project_name, site_location, start_date, end_date, status, created_at, updated_at, project_assignments(count)')
      .order('project_name', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    const normalized = (projects || []).map(({ project_assignments, ...rest }) => ({
      ...rest,
      employee_count: project_assignments?.[0]?.count ?? 0,
    }));

    return normalized;
  } catch (error) {
    logger.error('Error fetching projects:', error);
    throw error;
  }
};

export const getProjectById = async (projectId) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, project_name, site_location, start_date, end_date, status, created_at, updated_at')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  } catch (error) {
    logger.error(`Error fetching project ${projectId}:`, error);
    throw error;
  }
};

export const getProjectMembers = async (projectId) => {
  try {
    // ensure project exists
    await getProjectById(projectId);

    const { data: assignments, error } = await supabase
      .from('project_assignments')
      .select(
        'id, assignment_date, end_date, status, employees (employee_id, first_name, middle_name, last_name, personnel_type, positions (position_title))'
      )
      .eq('project_id', projectId)
      .order('assignment_date', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return assignments || [];
  } catch (error) {
    logger.error(`Error fetching project members ${projectId}:`, error);
    throw error;
  }
};

export const getProjectsForEmployee = async (employeeDbId) => {
  try {
    if (!employeeDbId) return [];

    const { data, error } = await supabase
      .from('project_assignments')
      .select(
        `
        projects ( id, project_name, site_location, start_date, end_date, status, created_at, updated_at )
        `
      )
      .eq('employee_id', employeeDbId);

    if (error) throw new InternalServerError(error.message);

    const projects = (data || [])
      .map((r) => r?.projects)
      .filter((p) => p && p.id);

    return projects;
  } catch (error) {
    logger.error(`Error fetching projects for employee ${employeeDbId}:`, error);
    throw error;
  }
};

export const updateProject = async (projectId, updateData, userId) => {
  try {
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      throw new NotFoundError('Project not found');
    }

    // if project_name changed, verify duplicate
    if (updateData.project_name && updateData.project_name !== existingProject.project_name) {
      const { data: dup, error: dupError } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', updateData.project_name)
        .single();

      if (dup) {
        throw new ConflictError('Project name already exists');
      }
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      throw new InternalServerError(updateError.message);
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'projects',
      record_id: updatedProject.id,
      old_values: existingProject,
      new_values: updatedProject,
      timestamp: new Date().toISOString()
    });

    logger.info(`Project updated: ${updatedProject.project_name}`);

    return updatedProject;
  } catch (error) {
    logger.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
};

export const deleteProject = async (projectId, userId) => {
  try {
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      throw new NotFoundError('Project not found');
    }

    // Safety: prevent deleting projects that still have assignments.
    const { data: assignments, error: assignmentsError } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('project_id', projectId)
      .limit(1);

    if (assignmentsError) {
      throw new InternalServerError('Failed to check project assignments');
    }

    if (assignments && assignments.length > 0) {
      throw new ConflictError(
        'Cannot delete a project with existing assignments. Remove project assignments first or set the project status to Completed/Cancelled.'
      );
    }

    const { data: deletedProject, error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select()
      .single();

    if (deleteError) {
      throw new InternalServerError(deleteError.message);
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'projects',
      record_id: deletedProject.id,
      old_values: existingProject,
      timestamp: new Date().toISOString()
    });

    logger.info(`Project deleted: ${deletedProject.project_name}`);

    return deletedProject;
  } catch (error) {
    logger.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
};
