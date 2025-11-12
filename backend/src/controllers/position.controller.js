import * as positionService from '../services/position.service.js';

// create position controller
export const createPosition = async (req, res, next) => {
  try {
    const { position_title, department_id } = req.body;
    const userId = req.user.id;

    const newPosition = await positionService.createNewPosition(position_title, department_id, userId);
    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: newPosition
    });
  } catch (error) {
    next(error);
  }
};

// get all positions controller
export const getAllPositions = async (req, res, next) => {
  try {
    const positions = await positionService.getAllPositions();
    res.status(200).json({
      success: true,
      message: 'Positions retrieved successfully',
      data: positions
    });
  } catch (error) {
    next(error);
  }
};

// get position by id controller
export const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const position = await positionService.getPositionById(id);
    res.status(200).json({
      success: true,
      message: 'Position retrieved successfully',
      data: position
    });
  } catch (error) {
    next(error);
  }
};

// update position controller
export const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { position_title, department_id } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (position_title !== undefined) updateData.position_title = position_title;
    if (department_id !== undefined) updateData.department_id = department_id;

    const updatedPosition = await positionService.updatePosition(id, updateData, userId);

    res.status(200).json({
      success: true,
      message: 'Position updated successfully',
      data: updatedPosition
    });

  } catch (error) {
    next(error);
  }
}

// delete position controller
export const deletePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deletedPosition = await positionService.deletePosition(id, userId);

    res.status(200).json({
      success: true,
      message: 'Position deleted successfully',
      data: deletedPosition
    });
  } catch (error) {
    next(error);
  }
};