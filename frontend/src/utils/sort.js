export const toSafeString = (value) => (value == null ? "" : String(value));

export const compareText = (a, b) =>
  toSafeString(a).localeCompare(toSafeString(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });

export const toSafeNumber = (value) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const compareNumber = (a, b) => toSafeNumber(a) - toSafeNumber(b);

export const toSafeTime = (value) => {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

export const compareDate = (a, b) => toSafeTime(a) - toSafeTime(b);
