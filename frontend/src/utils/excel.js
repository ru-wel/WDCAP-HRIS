import * as XLSX from 'xlsx';
import { downloadBlobFile } from './download.js';

export const exportRowsToXlsx = ({ filename, sheetName = 'Report', columns, rows }) => {
  const headers = (columns || []).map((c) => String(c.header || ''));
  const dataRows = (rows || []).map((row) =>
    (columns || []).map((c) => {
      const v = typeof c.value === 'function' ? c.value(row) : row?.[c.value];
      return v == null ? '' : v;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlobFile({ filename, blob });
};
