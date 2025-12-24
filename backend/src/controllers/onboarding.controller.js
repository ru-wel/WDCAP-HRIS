import * as onboardingService from '../services/onboarding.service.js';

export const createEmployeeWithAccount = async (req, res, next) => {
  try {
    const result = await onboardingService.createEmployeeWithAccount(req.body);
    res.status(201).json({
      success: true,
      message: 'Employee onboarded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeChecklist = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const checklist = await onboardingService.getEmployeeChecklist(employeeId);
    res.status(200).json({
      success: true,
      message: 'Employee checklist retrieved successfully',
      data: checklist
    });
  } catch (error) {
    next(error);
  }
};

export const getAllChecklists = async (req, res, next) => {
  try {
    const checklists = await onboardingService.getAllChecklists();
    res.status(200).json({
      success: true,
      message: 'All checklists retrieved successfully',
      data: checklists
    });
  } catch (error) {
    next(error);
  }
};

export const getChecklistItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await onboardingService.getChecklistItemById(id);
    res.status(200).json({
      success: true,
      message: 'Checklist item retrieved successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

export const updateChecklistItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const updatedItem = await onboardingService.updateChecklistItem(id, updates, userId);
    res.status(200).json({
      success: true,
      message: 'Checklist item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
};

export const submitDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { document_id } = req.body;
    const userId = req.user.id;

    const updatedItem = await onboardingService.submitDocument(id, document_id, userId);
    res.status(200).json({
      success: true,
      message: 'Document submitted successfully',
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
};

export const reviewSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const reviewerId = req.user.id;

    const updatedItem = await onboardingService.reviewSubmission(id, status, remarks, reviewerId);
    res.status(200).json({
      success: true,
      message: 'Submission reviewed successfully',
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
};