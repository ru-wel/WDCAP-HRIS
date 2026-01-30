export const validateCronRequest = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['x-cron-secret'];

  if (!cronSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: CRON_SECRET not set'
    });
  }

  if (authHeader !== cronSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized cron request'
    });
  }

  next();
};
