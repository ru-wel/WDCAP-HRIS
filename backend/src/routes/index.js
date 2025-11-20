import express from 'express';
import authRoutes from './auth.js';
import departmentRoutes from './departments.js';
import positionRoutes from './positions.js';
import employeeRoutes from './employees.js';

const router = express.Router();

// health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes); // localhost:3000/api/auth/...
router.use('/departments', departmentRoutes); // localhost:3000/api/departments/...
router.use('/positions', positionRoutes); //localhost:3000/api/positions/...
router.use('/employees', employeeRoutes); //localhost:3000/api/employees/...

export default router;