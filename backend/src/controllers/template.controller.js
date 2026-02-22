import * as templateService from '../services/template.service.js';

// get all active templates
export const getActiveTemplates = async (req, res, next) => {
  try {
    const templates = await templateService.getActiveTemplates();
    res.status(200).json({
      success: true,
      message: 'Active templates retrieved successfully',
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

// get all templates (including inactive)
export const getAllTemplates = async (req, res, next) => {
  try {
    const templates = await templateService.getAllTemplates();
    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

// get a single template with sections and items
export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);
    res.status(200).json({
      success: true,
      message: 'Template retrieved successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// get the template assigned to a specific position
export const getTemplateForPosition = async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const template = await templateService.getTemplateForPosition(positionId);
    res.status(200).json({
      success: true,
      message: template
        ? 'Template for position retrieved successfully'
        : 'No template assigned to this position',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// get all position-template assignments
export const getPositionTemplateAssignments = async (req, res, next) => {
  try {
    const assignments = await templateService.getPositionTemplateAssignments();
    res.status(200).json({
      success: true,
      message: 'Position-template assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// create a new template with sections and items
export const createTemplate = async (req, res, next) => {
  try {
    const template = await templateService.createTemplate(req.body, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// update template metadata
export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: _id, ...payload } = req.body;
    const template = await templateService.updateTemplate(id, payload, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// deactivate a template
export const deactivateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await templateService.deactivateTemplate(id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Template deactivated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// reactivate a template
export const reactivateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await templateService.reactivateTemplate(id, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Template reactivated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// add a section to a template
export const addSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: _id, ...payload } = req.body;
    const template = await templateService.addSection(id, payload, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Section added successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// update a section
export const updateSection = async (req, res, next) => {
  try {
    const { id, sectionId } = req.params;
    const { id: _id, sectionId: _sid, ...payload } = req.body;
    const template = await templateService.updateSection(id, sectionId, payload, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// delete a section
export const deleteSection = async (req, res, next) => {
  try {
    const { id, sectionId } = req.params;
    const template = await templateService.deleteSection(id, sectionId, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Section deleted successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// add an item to a section
export const addItem = async (req, res, next) => {
  try {
    const { id, sectionId } = req.params;
    const { id: _id, sectionId: _sid, ...payload } = req.body;
    const template = await templateService.addItem(id, sectionId, payload, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// update an item
export const updateItem = async (req, res, next) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const { id: _id, sectionId: _sid, itemId: _iid, ...payload } = req.body;
    const template = await templateService.updateItem(id, sectionId, itemId, payload, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// delete an item
export const deleteItem = async (req, res, next) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const template = await templateService.deleteItem(id, sectionId, itemId, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// assign a template to a position
export const assignTemplateToPosition = async (req, res, next) => {
  try {
    const { positionId, templateId } = req.body;
    const assignment = await templateService.assignTemplateToPosition(positionId, templateId, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Template assigned to position successfully',
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// unassign a template from a position
export const unassignTemplateFromPosition = async (req, res, next) => {
  try {
    const { positionId } = req.params;
    const result = await templateService.unassignTemplateFromPosition(positionId, req.user?.id);
    res.status(200).json({
      success: true,
      message: 'Template unassigned from position successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
