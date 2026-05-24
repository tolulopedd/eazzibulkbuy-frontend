const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatOrderReferenceDisplay(orderReference, dateValue, buyer = {}, metadata = {}) {
  const parsedDate = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const day = String(safeDate.getDate()).padStart(2, '0');
  const month = MONTHS[safeDate.getMonth()];
  const batchNumber = String(metadata.batchNumber || buyer.batchNumber || buyer.salesItem?.batchNumber || '').trim().toUpperCase();
  const orderSequence = metadata.orderSequence ?? buyer.orderSequence ?? buyer.sequenceNo;

  if (batchNumber && orderSequence) {
    return `${day}${month}-${batchNumber}-${String(Math.max(1, Number(orderSequence) || 1)).padStart(4, '0')}`;
  }

  return String(orderReference || '').toUpperCase() || 'N/A';
}
