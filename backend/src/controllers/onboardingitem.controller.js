import * as onboardingItemService from '../services/onboardingitem.service.js';

export const getAllOnboardingItems = async (req, res, next) => {
  try {
    const items = await onboardingItemService.getAllOnboardingItems();
    res.status(200).json({
      success: true,
      message: 'Onboarding items retrieved successfully',
      data: items
    });
  } catch (error) {
    next(error);
  }
};

export const getOnboardingItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await onboardingItemService.getOnboardingItemById(id);
    res.status(200).json({
      success: true,
      message: 'Onboarding item retrieved successfully',
      data: item
    });
  } catch (error) {
    next(error);
  }
};

export const createOnboardingItem = async (req, res, next) => {
  try {
    const itemData = req.body;
    const userId = req.user.id;

    const newItem = await onboardingItemService.createOnboardingItem(itemData, userId);
    res.status(201).json({
      success: true,
      message: 'Onboarding item created successfully',
      data: newItem
    });
  } catch (error) {
    next(error);
  }
};

export const updateOnboardingItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const updatedItem = await onboardingItemService.updateOnboardingItem(id, updates, userId);
    res.status(200).json({
      success: true,
      message: 'Onboarding item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOnboardingItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await onboardingItemService.deleteOnboardingItem(id, userId);
    res.status(200).json({
      success: true,
      message: 'Onboarding item deleted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};