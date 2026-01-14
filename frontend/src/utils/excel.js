import ExcelJS from 'exceljs';
import { downloadBlobFile } from './download.js';

export const exportRowsToXlsx = async ({ filename, sheetName = 'Report', columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // headers
  const headers = (columns || []).map((c) => String(c.header || ''));
  worksheet.addRow(headers);

  // bold styling for headers
  worksheet.getRow(1).font = { bold: true };

  // data rows
  const dataRows = (rows || []).map((row) =>
    (columns || []).map((c) => {
      const v = typeof c.value === 'function' ? c.value(row) : row?.[c.value];
      return v == null ? '' : v;
    })
  );

  dataRows.forEach((row) => {
    worksheet.addRow(row);
  });

  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? String(cell.value).length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50); // max width of 50
  });

  // create blob for download
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlobFile({ filename, blob });
};
