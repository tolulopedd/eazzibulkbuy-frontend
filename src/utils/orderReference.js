const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function sanitizeNamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3);
}

function splitFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !['MR', 'MRS', 'MISS'].includes(part.toUpperCase()));

  return {
    firstName: parts[0] || '',
    lastName: parts[1] || '',
  };
}

export function formatOrderReferenceDisplay(orderReference, dateValue, buyer = {}) {
  const parsedDate = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const day = String(safeDate.getDate()).padStart(2, '0');
  const month = MONTHS[safeDate.getMonth()];
  const suffix = String(orderReference || '').slice(-6).toUpperCase() || 'N/A';
  const fallbackName = splitFullName(buyer.fullName || buyer.name);
  const firstCode = sanitizeNamePart(buyer.firstName || fallbackName.firstName);
  const lastCode = sanitizeNamePart(buyer.lastName || fallbackName.lastName);
  const buyerCode = `${firstCode}${lastCode}`;

  return `${day}${month}${buyerCode}${suffix}`;
}
