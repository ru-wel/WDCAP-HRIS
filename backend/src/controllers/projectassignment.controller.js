import * as assignmentService from '../services/projectassignment.service.js';

// CREATE ASSIGNMENT
export const createAssignment = async (req, res, next) => {
  try {
    const assignmentData = req.body;
    const userId = req.user.id;

    const newAssignment = await assignmentService.createAssignment(assignmentData, userId);
    res.status(201).json({
      success: true,
      message: 'Project assignment created successfully',
      data: newAssignment
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL ASSIGNMENTS
export const getAllAssignments = async (req, res, next) => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.status(200).json({
      success: true,
      message: 'Project assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// GET ASSIGNMENT BY ID
export const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    res.status(200).json({
      success: true,
      message: 'Project assignment retrieved successfully',
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// GET ASSIGNMENT BY ID
export const getAssignmentByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const assignment = await assignmentService.getAssignmentByProject(projectId);
    res.status(200).json({
      success: true,
      message: 'Assignments per project retrieved successfully',
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ASSIGNMENT
export const updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const updatedAssignment = await assignmentService.updateAssignment(id, updateData, userId);
    res.status(200).json({
      success: true,
      message: 'Project assignment updated successfully',
      data: updatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

// DELETE ASSIGNMENT
export const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedAssignment = await assignmentService.deleteAssignment(id, userId);
    res.status(200).json({
      success: true,
      message: 'Project assignment deleted successfully',
      data: deletedAssignment
    });
  } catch (error) {
    next(error);
  }
};
