import * as evaluationService from '../services/evaluation.service.js';
import { ROLES } from '../config/constants.js';
import { ForbiddenError } from '../utils/errors.js';

const ensureEmployeeAccess = async ({ req, employeeDbId }) => {
  const userRole = req.user?.role;
  if (userRole === ROLES.ADMIN || userRole === ROLES.HR) return;

  const me = String(req.user?.employee_db_id ?? '');
  if (!me) throw new ForbiddenError('You do not have an associated employee profile');

  if (String(employeeDbId ?? '') !== me) {
    throw new ForbiddenError('You can only access your own evaluation data');
  }
};

export const listEvaluations = async (req, res, next) => {
  try {
    const { employee_id, from, to } = req.query;
    const rows = await evaluationService.listEvaluations({ employee_id, from, to });
    res.status(200).json({ success: true, message: 'Evaluations retrieved successfully', data: rows });
  } catch (e) {
    next(e);
  }
};

export const listMyEvaluations = async (req, res, next) => {
  try {
    const employeeDbId = req.user?.employee_db_id;
    if (!employeeDbId) throw new ForbiddenError('You do not have an associated employee profile');

    const rows = await evaluationService.listEvaluations({ employee_id: employeeDbId });
    res.status(200).json({ success: true, message: 'My evaluations retrieved successfully', data: rows });
  } catch (e) {
    next(e);
  }
};

export const listEvaluationsByEmployee = async (req, res, next) => {
  try {
    const { employee_id } = req.params;
    await ensureEmployeeAccess({ req, employeeDbId: employee_id });

    const rows = await evaluationService.listEvaluations({ employee_id });
    res.status(200).json({ success: true, message: 'Evaluations retrieved successfully', data: rows });
  } catch (e) {
    next(e);
  }
};

export const getEvaluationById = async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;
    const row = await evaluationService.getEvaluationById(evaluation_id);
    await ensureEmployeeAccess({ req, employeeDbId: row?.employee_id });

    res.status(200).json({ success: true, message: 'Evaluation retrieved successfully', data: row });
  } catch (e) {
    next(e);
  }
};

export const createSchedule = async (req, res, next) => {
  try {
    const payload = {
      employee_id: req.body.employee_id,
      evaluation_type: req.body.evaluation_type,
      evaluation_date: req.body.evaluation_date,
      evaluation_notes: req.body.evaluation_notes ?? null
    };

    const created = await evaluationService.createSchedule(payload, req.user);
    res.status(201).json({ success: true, message: 'Evaluation scheduled successfully', data: created });
  } catch (e) {
    next(e);
  }
};

export const updateSchedule = async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;
    const payload = {
      evaluation_date: req.body.evaluation_date,
      evaluation_type: req.body.evaluation_type
    };

    const updated = await evaluationService.updateSchedule(evaluation_id, payload, req.user);
    res.status(200).json({ success: true, message: 'Evaluation schedule updated successfully', data: updated });
  } catch (e) {
    next(e);
  }
};

export const submitEvaluation = async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;

    const files = req.files || {};
    const singleFile = (files.file && files.file[0]) ? files.file[0] : null;
    const breakdownFile = (files.breakdown_file && files.breakdown_file[0]) ? files.breakdown_file[0] : null;
    const finalFile = (files.final_file && files.final_file[0]) ? files.final_file[0] : null;

    const payload = {
      score: req.body.score,
      remarks: req.body.remarks,
      evaluation_type: req.body.evaluation_type,
      file: singleFile
        ? {
            buffer: singleFile.buffer,
            originalname: singleFile.originalname,
            mimetype: singleFile.mimetype,
            size: singleFile.size
          }
        : null,
      breakdown_file: breakdownFile
        ? {
            buffer: breakdownFile.buffer,
            originalname: breakdownFile.originalname,
            mimetype: breakdownFile.mimetype,
            size: breakdownFile.size
          }
        : null,
      final_file: finalFile
        ? {
            buffer: finalFile.buffer,
            originalname: finalFile.originalname,
            mimetype: finalFile.mimetype,
            size: finalFile.size
          }
        : null
    };

    const updated = await evaluationService.submitEvaluation(evaluation_id, payload, req.user);
    res.status(200).json({ success: true, message: 'Evaluation updated successfully', data: updated });
  } catch (e) {
    next(e);
  }
};

export const downloadEvaluationDocument = async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;
    const doc = String(req.query?.doc || '').trim().toLowerCase();
    const dispositionRaw = String(req.query?.disposition || '').trim().toLowerCase();
    const disposition = dispositionRaw === 'inline' ? 'inline' : 'attachment';

    const meta = await evaluationService.getEvaluationById(evaluation_id);
    await ensureEmployeeAccess({ req, employeeDbId: meta?.employee_id });

    const result = await evaluationService.downloadEvaluationDocument({ evaluationId: evaluation_id, doc });

    if (result?.provider === 'google_drive') {
      res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${result.fileName || 'evaluation'}"`);
      return result.stream.pipe(res);
    }

    res.status(200).json({ success: true, message: 'Evaluation download URL generated successfully', data: result });
  } catch (e) {
    next(e);
  }
};

export const previewEvaluationDocument = async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;
    const doc = String(req.query?.doc || '').trim().toLowerCase();

    const meta = await evaluationService.getEvaluationById(evaluation_id);
    await ensureEmployeeAccess({ req, employeeDbId: meta?.employee_id });

    const result = await evaluationService.previewEvaluationDocument({ evaluationId: evaluation_id, doc });

    // For Drive-backed docs, point to our authenticated inline stream endpoint.
    if (result?.provider === 'google_drive') {
      const origin = `${req.protocol}://${req.get('host')}`;
      result.url = `${origin}${req.baseUrl}/${evaluation_id}/document/download?disposition=inline&doc=${encodeURIComponent(doc || 'file')}`;
    }

    res.status(200).json({ success: true, message: 'Preview URL generated successfully', data: result });
  } catch (e) {
    next(e);
  }
};
