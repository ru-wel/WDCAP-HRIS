import * as departmentService from '../services/department.service.js';

// create department controller
export const createDepartment = async (req, res, next) => {
  try {
    const { department_name } = req.body;
    const userId = req.user.id;

    const newDepartment = await departmentService.createNewDepartment(department_name, userId);
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: newDepartment
    });
  } catch (error) {
    next(error);
  }
};

// get all departments controller
export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await departmentService.getAllDepartments();
    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: departments
    });
  } catch (error) {
    next(error);
  }
};

// get department by id controller
export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await departmentService.getDepartmentById(id);
    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

// update department controller
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { department_name } = req.body;
    const userId = req.user.id;

    const updateDepartment = await departmentService.updateDepartment(id, department_name, userId);

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: updateDepartment
    });
  } catch (error) {
    next(error);
  }
};

// delete department controller
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedDepartment = await departmentService.deleteDepartment(id, userId);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
      data: deletedDepartment
    });
  } catch (error) {
    next(error);
  }
}