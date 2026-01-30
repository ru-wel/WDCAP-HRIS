import * as evaluationService from '../services/evaluation.service.js';
import logger from '../utils/logger.js';

export const sendEvaluationReminders = async (req, res) => {
  try {
    logger.info('Cron job triggered: sendEvaluationReminders');

    const result = await evaluationService.sendEvaluationReminders();

    res.status(200).json({
      success: true,
      message: 'Evaluation reminders processed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Cron job failed: sendEvaluationReminders', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send evaluation reminders'
    });
  }
};
