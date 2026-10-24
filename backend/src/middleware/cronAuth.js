export const validateCronRequest = (req, res, next) => {
  const cronSecret = process.env.CRON_SECRET;
  // Vercel Cron sends CRON_SECRET as "Authorization: Bearer <secret>"
  const authHeader = req.headers.authorization;

  if (!cronSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: CRON_SECRET not set'
    });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized cron request'
    });
  }

  next();
};
