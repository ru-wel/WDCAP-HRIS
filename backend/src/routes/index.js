import express from 'express';
import authRoutes from './auth.js';

const router = express.Router();

// health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes); // localhost:3000/api/auth/...

export default router;