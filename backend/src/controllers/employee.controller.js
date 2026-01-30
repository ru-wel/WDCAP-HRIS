import * as employeeService from '../services/employee.service.js';

// create employee controller
export const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;
    const userId = req.user.id;

    const newEmployee = await employeeService.createNewEmployee(employeeData, userId);
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee
    });
  } catch (error) {
    next(error);
  }
};

// get all employees controller
export const getAllEmployees = async (req, res, next) => {
  try {
    const includeInactive = String(req.query?.include_inactive || '').toLowerCase() === 'true';
    const employees = await employeeService.getAllEmployeesWithOptions({ includeInactive });
    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: employees
    });
  } catch (error) {
    next(error);
  }
};

// get employee by id controller
export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(id);
    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

// get employee by user_id controller
export const getEmployeeByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const employee = await employeeService.getEmployeeByUserId(userId);
    res.status(200).json({
      success: true,
      message: 'Employee profile retrieved successfully',
      data: employee
    })
  } catch (error) {
    next(error);
  }
};

// get my employee profile controller
export const getMyEmployeeProfile = async (req, res, next) => {
  try {
    const employee = await employeeService.getMyEmployeeProfile({
      employee_db_id: req.user?.employee_db_id,
      employee_id: req.user?.employee_id,
      user_id: req.user?.id
    });

    res.status(200).json({
      success: true,
      message: 'My employee profile retrieved successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

// update employee controller
export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const updatedEmployee = await employeeService.updateEmployee(id, updateData, userId);

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    next(error);
  }
};

// delete employee controller
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedEmployee = await employeeService.deleteEmployee(id, userId);

    res.status(200).json({
      success: true,
      message: 'Employee archived successfully',
      data: deletedEmployee
    });
  } catch (error) {
    next(error);
  }
};

// regularize employee controller
export const regularizeEmployee = async (req, res, next) => {
  try {
    const { employee_id } = req.params;
    const { regularization_date } = req.body;
    const userId = req.user.id;

    const regularizedEmployee = await employeeService.regularizeEmployee(
      employee_id,
      regularization_date,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Employee regularized successfully',
      data: regularizedEmployee
    });
  } catch (error) {
    next(error);
  }
};