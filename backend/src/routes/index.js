import express from 'express';
import authRoutes from './auth.js';
import departmentRoutes from './departments.js';
import positionRoutes from './positions.js';
import employeeRoutes from './employees.js';
import projectRoutes from './projects.js';
import projectAssignmentRoutes from './projectassignments.js';
import documentRoutes from './documents.js';
<<<<<<< HEAD
import auditLogRoutes from "./auditLog.routes.js";
import usersRoutes from "./users.js";

=======
import auditLogRoutes from "./auditLog.js";
import onboardingItemRoutes from './onboardingitems.js';
import onboardingRoutes from './onboarding.js';        
>>>>>>> 1c4ad355442cc3ff4c4532fa875661ab16d6ac7b

const router = express.Router();

// health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes); // localhost:3000/api/auth/...
router.use('/departments', departmentRoutes); // localhost:3000/api/departments/...
router.use('/positions', positionRoutes); //localhost:3000/api/positions/...
router.use('/employees', employeeRoutes); //localhost:3000/api/employees/...
router.use('/projects', projectRoutes); // localhost:3000/api/projects/...
router.use('/projectassignments', projectAssignmentRoutes); // localhost:3000/api/projectassignments/...
router.use('/documents', documentRoutes); //localhost:3000/api/documents/...
<<<<<<< HEAD
router.use("/audit-logs", auditLogRoutes);
router.use("/users", usersRoutes);
=======
router.use("/audit-logs", auditLogRoutes); //localhost:3000/api/audit-logs/...
router.use('/onboarding-items', onboardingItemRoutes); // localhost:3000/api/onboarding-items/...  
router.use('/onboarding', onboardingRoutes); // localhost:3000/api/onboarding/...              
>>>>>>> 1c4ad355442cc3ff4c4532fa875661ab16d6ac7b

export default router;