import ExcelJS from 'exceljs';
import { downloadBlobFile } from './download.js';
import { ARISE_FORM_ITEMS } from '../constants/ariseFormData.js';

export const downloadTemplateSpreadsheet = async () => {
  const workbook = new ExcelJS.Workbook();

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF990100' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const headerBorder = {
    bottom: { style: 'thin', color: { argb: 'FF666666' } },
  };

  // ── Sheet 1: Template Info ───
  const infoSheet = workbook.addWorksheet('Template Info');
  infoSheet.columns = [
    { header: 'Template Name', key: 'name', width: 40 },
    { header: 'Description', key: 'description', width: 60 },
  ];

  const infoHeader = infoSheet.getRow(1);
  infoHeader.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = headerBorder;
  });
  infoSheet.views = [{ state: 'frozen', ySplit: 1 }];

  infoSheet.getCell('A1').note = 'Enter the name of the evaluation template.';
  infoSheet.getCell('B1').note = 'Optional. A short description of the template\'s purpose.';

  infoSheet.addRow({
    name: 'ARISE Performance Evaluation Form',
    description: 'Standard performance evaluation for all positions',
  });

  // ── Sheet 2: Sections & Questions ───
  const questionsSheet = workbook.addWorksheet('Sections & Questions');
  questionsSheet.columns = [
    { header: 'Section Title', key: 'section_title', width: 55 },
    { header: 'Evaluation Question / Criteria', key: 'question_text', width: 90 },
  ];

  const qHeader = questionsSheet.getRow(1);
  qHeader.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = headerBorder;
  });
  questionsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  questionsSheet.getCell('A1').note =
    'Group questions by section. Rows with the same Section Title belong to the same section.\n' +
    'The section order follows the first appearance of each title.\n' +
    'You may leave this column blank for subsequent rows if the section title is the same as the row above.';
  questionsSheet.getCell('B1').note =
    'Enter the evaluation question or criteria.\n' +
    'Each row is one question. The item number is auto-assigned based on row order within each section.';

  for (const section of ARISE_FORM_ITEMS.sections) {
    for (let i = 0; i < section.items.length; i++) {
      questionsSheet.addRow({
        section_title: i === 0 ? section.title : '',
        question_text: section.items[i].text,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlobFile({ filename: 'evaluation-template-import.xlsx', blob });
};

const cellValue = (cell) => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'object' && cell.result !== undefined) return String(cell.result);
  if (typeof cell === 'object' && cell.text !== undefined) return String(cell.text);
  return String(cell);
};

export const parseTemplateSpreadsheet = async (file) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  // ── Sheet 1: Template Info ───
  const infoSheet = workbook.getWorksheet('Template Info') || workbook.getWorksheet(1);
  if (!infoSheet) {
    throw new Error('Missing "Template Info" sheet. Please use the provided template.');
  }

  const infoRow = infoSheet.getRow(2);
  const name = cellValue(infoRow.getCell(1).value).trim();
  if (!name) {
    throw new Error('Template Name is required (Sheet "Template Info", row 2, column A).');
  }
  const description = cellValue(infoRow.getCell(2).value).trim();

  // ── Sheet 2: Sections & Questions ───
  const questionsSheet =
    workbook.getWorksheet('Sections & Questions') ||
    workbook.getWorksheet('Sections & Items') ||
    workbook.getWorksheet(2);
  if (!questionsSheet) {
    throw new Error('Missing "Sections & Questions" sheet. Please use the provided template.');
  }

  const sectionOrder = [];
  const sectionItems = new Map();
  let currentSectionTitle = '';

  questionsSheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;

    const rawTitle = cellValue(row.getCell(1).value).trim();
    const questionText = cellValue(row.getCell(2).value).trim();

    if (!questionText) {
      throw new Error(`Missing question text on row ${rowNum} of "Sections & Questions".`);
    }

    const sectionTitle = rawTitle || currentSectionTitle;
    if (!sectionTitle) {
      throw new Error(
        `Row ${rowNum}: No section title found. Either fill in column A or ensure a previous row defines the section.`
      );
    }
    currentSectionTitle = sectionTitle;

    if (!sectionItems.has(sectionTitle)) {
      sectionOrder.push(sectionTitle);
      sectionItems.set(sectionTitle, []);
    }
    sectionItems.get(sectionTitle).push(questionText);
  });

  if (sectionOrder.length === 0) {
    throw new Error('No questions found in "Sections & Questions" sheet. Add at least one row below the header.');
  }

  const sections = sectionOrder.map((title, sIdx) => ({
    _key: crypto.randomUUID(),
    section_number: sIdx + 1,
    title,
    description: '',
    items: sectionItems.get(title).map((text, iIdx) => ({
      _key: crypto.randomUUID(),
      item_number: iIdx + 1,
      question_text: text,
    })),
  }));

  return {
    name,
    description: description || '',
    sections,
  };
};
