const CART_STORAGE_KEY = 'eazzibulkbuy-cart';

function sanitizeCartItems(items = []) {
  return items
    .map((item) => ({
      salesItemId: String(item.salesItemId || ''),
      quantity: Math.max(0, Number(item.quantity) || 0),
    }))
    .filter((item) => item.salesItemId && item.quantity > 0);
}

export function readCartItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    return sanitizeCartItems(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function writeCartItems(items) {
  if (typeof window === 'undefined') {
    return [];
  }

  const sanitized = sanitizeCartItems(items);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function setCartQuantity(salesItemId, quantity) {
  const normalizedSalesItemId = String(salesItemId || '');
  const nextQuantity = Math.max(0, Number(quantity) || 0);
  const current = readCartItems();
  const next = [];
  let updatedExistingItem = false;

  if (!normalizedSalesItemId) {
    return writeCartItems(current);
  }

  current.forEach((item) => {
    if (item.salesItemId !== normalizedSalesItemId) {
      next.push(item);
      return;
    }

    if (!updatedExistingItem && nextQuantity > 0) {
      next.push({ salesItemId: normalizedSalesItemId, quantity: nextQuantity });
    }

    updatedExistingItem = true;
  });

  if (!updatedExistingItem && nextQuantity > 0) {
    next.push({ salesItemId: normalizedSalesItemId, quantity: nextQuantity });
  }

  return writeCartItems(next);
}

export function clearCartItems() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(CART_STORAGE_KEY);
}

export function getCartQuantityByItem(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}
