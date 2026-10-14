export const peso = (n) => `\u20B1${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Today's date as YYYY-MM-DD in the browser's local time. */
export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const dateOnly = (s) => (s ? String(s).slice(0, 10) : '\u2014');
export const dateTime = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '\u2014');
export const label = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());