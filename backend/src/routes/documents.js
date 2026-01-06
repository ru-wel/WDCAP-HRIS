import express from 'express';
import multer from 'multer';
import * as documentsController from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as documentsValidation from '../validations/document.validation.js';
import { FILE_VALIDATION } from '../config/constants.js';

const router = express.Router();

// configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_VALIDATION.MAX_FILE_SIZE // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (FILE_VALIDATION.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
  }
});

// all routes require authentication
router.use(authenticate);

// upload document
router.post('/upload', upload.single('file'), validate(documentsValidation.uploadDocumentSchema), documentsController.uploadDocument);

// get all documents for employee
router.get('/:employee_id', validate(documentsValidation.getDocumentsByEmployeeSchema), documentsController.getDocumentsByEmployee);

// download document (employees can download their own)
router.get('/:document_id/download', validate(documentsValidation.documentIdSchema), documentsController.downloadDocument);

// preview document (returns a preview URL)
router.get('/:document_id/preview', validate(documentsValidation.documentIdSchema), documentsController.previewDocument);

// delete document - HR/Admin only
router.delete('/:document_id', validate(documentsValidation.documentIdSchema), documentsController.deleteDocument);

export default router;