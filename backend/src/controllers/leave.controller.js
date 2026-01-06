import * as leaveService from '../services/leave.service.js';
import { ForbiddenError } from '../utils/errors.js';

export const getLeaveTypes = async (req, res, next) => {
  try {
    const types = await leaveService.getLeaveTypes();
    res.status(200).json({
      success: true,
      message: 'Leave types retrieved successfully',
      data: types
    });
  } catch (error) {
    next(error);
  }
};

export const listLeaveRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await leaveService.listLeaveRequests({ status });

    res.status(200).json({
      success: true,
      message: 'Leave requests retrieved successfully',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

export const listMyLeaveRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    const requests = await leaveService.listLeaveRequests({
      status,
      employee_id: employeeId
    });

    res.status(200).json({
      success: true,
      message: 'My leave requests retrieved successfully',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

export const createLeaveRequest = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user?.employee_id) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    const payload = {
      employee_id: user.employee_id,
      leave_type_id: req.body.leave_type_id,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      reason: req.body.reason || null
    };

    const created = await leaveService.createLeaveRequest(payload, user);

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: created
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveRequestStatus = async (req, res, next) => {
  try {
    const { leave_request_id } = req.params;
    const { status, reason } = req.body;

    const updated = await leaveService.updateLeaveRequestStatus(leave_request_id, { status, reason }, req.user);

    res.status(200).json({
      success: true,
      message: 'Leave request updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const cancelLeaveRequest = async (req, res, next) => {
  try {
    const { leave_request_id } = req.params;
    const updated = await leaveService.cancelLeaveRequest(leave_request_id, req.user);

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const listLeaveHistory = async (req, res, next) => {
  try {
    const { employee_id } = req.query;
    const history = await leaveService.listLeaveHistory({ employee_id });

    res.status(200).json({
      success: true,
      message: 'Leave history retrieved successfully',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

export const listMyLeaveHistory = async (req, res, next) => {
  try {
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    const history = await leaveService.listLeaveHistory({ employee_id: employeeId });

    res.status(200).json({
      success: true,
      message: 'My leave history retrieved successfully',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

export const listLeaveCredits = async (req, res, next) => {
  try {
    const { year } = req.query;
    const credits = await leaveService.listLeaveCredits({ year });

    res.status(200).json({
      success: true,
      message: 'Leave credits retrieved successfully',
      data: credits
    });
  } catch (error) {
    next(error);
  }
};

export const listMyLeaveCredits = async (req, res, next) => {
  try {
    const { year } = req.query;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    const credits = await leaveService.listLeaveCredits({ year, employee_id: employeeId });

    res.status(200).json({
      success: true,
      message: 'My leave credits retrieved successfully',
      data: credits
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveCredit = async (req, res, next) => {
  try {
    const { leave_balance_id } = req.params;
    const { current_balance, carried_over } = req.body;

    const updated = await leaveService.updateLeaveCreditBalance(
      leave_balance_id,
      { current_balance, carried_over },
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Leave credit updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
