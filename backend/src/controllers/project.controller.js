import * as projectService from '../services/project.service.js';

// create project controller
export const createProject = async (req, res, next) => {
  try {
    const { project_name, site_location, start_date, end_date, status } = req.body;
    const userId = req.user.id;

    const newProject = await projectService.createNewProject(project_name, site_location, start_date, end_date, status, userId);
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: newProject
    });
  } catch (error) {
    next(error);
  }
};

// get all projects controller
export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getAllProjects();
    res.status(200).json({
      success: true,
      message: 'Projects retrieved successfully',
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

// get project by id controller
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await projectService.getProjectById(id);
    res.status(200).json({
      success: true,
      message: 'Project retrieved successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// update project controller
export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_name, site_location, start_date, end_date, status } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (project_name !== undefined) updateData.project_name = project_name;
    if (site_location !== undefined) updateData.site_location = site_location;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;

    const updatedProject = await projectService.updateProject(id, updateData, userId);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// delete project controller
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedProject = await projectService.deleteProject(id, userId);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      data: deletedProject
    });
  } catch (error) {
    next(error);
  }
};
