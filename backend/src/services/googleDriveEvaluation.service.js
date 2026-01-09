import logger from '../utils/logger.js';
import { uploadToDrive } from './googleDrive.service.js';
import PDFDocument from 'pdfkit';
import { ARISE_FORM_ITEMS, ARISE_SCORE_LABELS } from '../constants/ariseFormData.js';

const sanitizeForFileName = (value) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 140);

const formatDateForText = (dateInput) => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
};

const padRight = (value, len) => {
  const str = String(value ?? '');
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
};

const bufferFromPdf = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });

const ensureSpace = (doc, neededHeight) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + neededHeight <= bottom) return;
  doc.addPage();
};

const drawCheckbox = (doc, x, y, checked) => {
  const s = 10;
  doc.rect(x, y, s, s).stroke();
  if (checked) {
    doc.save();
    doc.lineWidth(2);
    doc
      .moveTo(x + 2, y + 5)
      .lineTo(x + 4, y + 8)
      .lineTo(x + 9, y + 2)
      .stroke();
    doc.restore();
  }
};

export const buildEvaluationFormPdfBuffer = async (evaluationData, employee) => {
  const form = evaluationData?.evaluation_form || {};
  const items = form?.items && typeof form.items === 'object' ? form.items : {};

  const employeeName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
  const employeeId = String(employee?.employee_id || '').trim();
  const evaluationType = String(evaluationData?.evaluation_type || '').trim();
  const evaluationDate = formatDateForText(evaluationData?.evaluation_date);
  const generatedDate = formatDateForText(new Date());

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.info.Title = 'ARISE Performance Evaluation Form';

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const leftX = doc.page.margins.left;
  const rightX = leftX + pageWidth;
  const col3 = rightX - 90; // 3 small cols
  const col2 = rightX - 60;
  const col1 = rightX - 30;
  const itemTextWidth = pageWidth - 110;

  doc.font('Helvetica-Bold').fontSize(16).text('ARISE PERFORMANCE EVALUATION FORM', { align: 'center' });
  doc.moveDown(0.6);

  doc.font('Helvetica').fontSize(10);
  const metaLines = [
    employeeName ? `${padRight('Employee', 16)}: ${employeeName}` : null,
    employeeId ? `${padRight('Employee ID', 16)}: ${employeeId}` : null,
    evaluationType ? `${padRight('Evaluation Type', 16)}: ${evaluationType}` : null,
    evaluationDate ? `${padRight('Evaluation Date', 16)}: ${evaluationDate}` : null,
    `${padRight('Date Generated', 16)}: ${generatedDate || new Date().toLocaleDateString()}`
  ].filter(Boolean);
  metaLines.forEach((l) => doc.text(l, leftX, doc.y, { width: pageWidth }));

  doc.moveDown(0.8);
  doc.moveTo(leftX, doc.y).lineTo(rightX, doc.y).stroke();
  doc.moveDown(0.8);

  // Table header
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Evaluation Items', leftX, doc.y, { width: itemTextWidth });
  doc.text('3', col3, doc.y, { width: 20, align: 'center' });
  doc.text('2', col2, doc.y, { width: 20, align: 'center' });
  doc.text('1', col1, doc.y, { width: 20, align: 'center' });
  doc.moveDown(0.4);
  doc
    .moveTo(leftX, doc.y)
    .lineTo(rightX, doc.y)
    .stroke();
  doc.moveDown(0.6);

  doc.font('Helvetica').fontSize(10);

  for (const section of ARISE_FORM_ITEMS.sections) {
    ensureSpace(doc, 24);
    doc.font('Helvetica-Bold').text(section.title, leftX, doc.y, { width: pageWidth });
    doc.moveDown(0.3);
    doc.font('Helvetica');

    for (const it of section.items) {
      const v = items[`item_${it.number}`];
      const n = Number(v);
      const lineY = doc.y;
      const itemLabel = `${it.number}. ${it.text}`;
      const h = doc.heightOfString(itemLabel, { width: itemTextWidth, align: 'left' });
      ensureSpace(doc, Math.max(18, h) + 6);

      const y = doc.y;
      doc.text(itemLabel, leftX, y, { width: itemTextWidth, align: 'left' });

      const boxY = y + 2;
      drawCheckbox(doc, col3 + 5, boxY, n === 3);
      drawCheckbox(doc, col2 + 5, boxY, n === 2);
      drawCheckbox(doc, col1 + 5, boxY, n === 1);

      doc.y = y + Math.max(h, 14) + 4;
    }

    doc.moveDown(0.3);
  }

  // Summary
  ensureSpace(doc, 180);
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text('Performance Summary', leftX, doc.y, { width: pageWidth });
  doc.font('Helvetica').moveDown(0.3);

  const totalScore = form.total_score !== undefined ? `${form.total_score}/${form.total_possible || 60}` : '';
  const percentage = form.percentage !== undefined ? `${form.percentage}%` : '';
  const performanceRating = String(form.performance_rating || '').trim();
  const employmentStatus = String(form.is_reliable || '').trim();
  const memo = String(form.memo || '').trim();

  if (totalScore) doc.text(`${padRight('Total Score', 18)}: ${totalScore}`, leftX, doc.y, { width: pageWidth });
  if (percentage) doc.text(`${padRight('Percentage', 18)}: ${percentage}`, leftX, doc.y, { width: pageWidth });
  if (performanceRating) doc.text(`${padRight('Performance Rating', 18)}: ${performanceRating}`, leftX, doc.y, { width: pageWidth });
  if (employmentStatus) doc.text(`${padRight('Employment Status', 18)}: ${employmentStatus}`, leftX, doc.y, { width: pageWidth });

  if (memo) {
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').text('Comments / Recommendation', leftX, doc.y, { width: pageWidth });
    doc.font('Helvetica');
    doc.text(memo, leftX, doc.y, { width: pageWidth });
  }

  // Small legend
  doc.moveDown(0.8);
  doc.fontSize(8).fillColor('#444');
  doc.text(`Legend: 3 = ${ARISE_SCORE_LABELS[3]}, 2 = ${ARISE_SCORE_LABELS[2]}, 1 = ${ARISE_SCORE_LABELS[1]}`,
    leftX,
    doc.y,
    { width: pageWidth }
  );
  doc.fillColor('#000').fontSize(10);

  return bufferFromPdf(doc);
};

export const uploadEvaluationFormToDrive = async ({ evaluationData, employee, parentFolderId, fileName }) => {
  try {
    const rawName = String(fileName || '').trim();
    const baseName =
      rawName ||
      `Evaluation_Form_${sanitizeForFileName(employee?.employee_id)}_${sanitizeForFileName(employee?.first_name)}_${Date.now()}.pdf`;

    const effectiveName = baseName.toLowerCase().endsWith('.pdf') ? baseName : baseName.replace(/\.[^.]+$/, '') + '.pdf';

    const fileBuffer = await buildEvaluationFormPdfBuffer(evaluationData, employee);

    const uploaded = await uploadToDrive({
      fileBuffer,
      mimeType: 'application/pdf',
      fileName: effectiveName,
      parentFolderId: parentFolderId || null
    });

    return {
      provider: 'google_drive',
      fileId: uploaded.fileId,
      fileName: uploaded.name,
      mimeType: uploaded.mimeType
    };
  } catch (error) {
    logger.error('Error uploading evaluation form to Google Drive:', error);
    throw new Error('Failed to upload evaluation form to Google Drive: ' + error.message);
  }
};

