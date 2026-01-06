const pad2 = (n) => String(n).padStart(2, '0');

export const toIsoDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toStartOfDay = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

const addDaysIso = (isoDate, days) => {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

export const filterRowsByDateRange = (rows, getRowDate, startDate, endDate) => {
  if (!Array.isArray(rows) || typeof getRowDate !== 'function') return rows;

  const startT = toStartOfDay(startDate);
  const endExclusiveT = endDate ? toStartOfDay(addDaysIso(endDate, 1)) : null;

  if (startT == null && endExclusiveT == null) return rows;

  return rows.filter((row) => {
    const raw = getRowDate(row);
    if (!raw) return false;

    const t = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
    if (!Number.isFinite(t)) return false;

    if (startT != null && t < startT) return false;
    if (endExclusiveT != null && t >= endExclusiveT) return false;
    return true;
  });
};
