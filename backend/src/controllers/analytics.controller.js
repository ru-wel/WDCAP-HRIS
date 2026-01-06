import * as analyticsService from '../services/analytics.service.js';

export const getAnalyticsSummary = async (req, res, next) => {
  try {
    const data = await analyticsService.getAnalyticsSummary(req.user);

    res.status(200).json({
      success: true,
      message: 'Analytics summary retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};
