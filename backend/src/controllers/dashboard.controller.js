import * as dashboardService from '../services/dashboard.service.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user);

    res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
