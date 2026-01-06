import express from 'express';
import multer from 'multer';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES, FILE_VALIDATION } from '../config/constants.js';
import * as evaluationController from '../controllers/evaluation.controller.js';
import * as evaluationValidation from '../validations/evaluation.validation.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_VALIDATION.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (FILE_VALIDATION.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
  }
});

router.use(authenticate);

// Employee: view own evaluations
router.get('/me', evaluationController.listMyEvaluations);

// Admin/HR: list + schedule management
router.get('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(evaluationValidation.listEvaluationsSchema), evaluationController.listEvaluations);
router.post('/schedule', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(evaluationValidation.createScheduleSchema), evaluationController.createSchedule);

// Shared (employee ownership enforced in controller)
router.get('/employee/:employee_id', validate(evaluationValidation.employeeIdParamSchema), evaluationController.listEvaluationsByEmployee);
router.get('/:evaluation_id', validate(evaluationValidation.evaluationIdParamSchema), evaluationController.getEvaluationById);

// Admin/HR only: reschedule + submit results
router.put('/:evaluation_id/schedule', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(evaluationValidation.updateScheduleSchema), evaluationController.updateSchedule);

router.post(
  '/:evaluation_id/submit',
  authorizeRoles(ROLES.ADMIN, ROLES.HR),
  upload.fields([
    { name: 'breakdown_file', maxCount: 1 },
    { name: 'final_file', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]),
  validate(evaluationValidation.submitEvaluationSchema),
  evaluationController.submitEvaluation
);

router.get(
  '/:evaluation_id/document/download',
  validate(evaluationValidation.downloadSchema),
  evaluationController.downloadEvaluationDocument
);

router.get(
  '/:evaluation_id/document/preview',
  validate(evaluationValidation.downloadSchema),
  evaluationController.previewEvaluationDocument
);

export default router;
