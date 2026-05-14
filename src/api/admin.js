import { buildApiUrl } from './config';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new Error('Unable to reach backend API. Check that the production API base URL is configured correctly.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to complete this request. Please try again.');
  }

  return response.json();
}

export function adminLogin(payload) {
  return request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function adminLogout() {
  return request('/api/admin/auth/logout', { method: 'POST' });
}

export function adminMe() {
  return request('/api/admin/auth/me');
}

export function createSalesItem(payload) {
  return request('/api/admin/sales-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchAdminSalesItems(params = {}) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set('q', params.q);
  }
  if (params.batchNumber) {
    search.set('batchNumber', params.batchNumber);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.sortBy) {
    search.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/api/admin/sales-items${suffix}`);
}

export function updateSalesItem(salesItemId, payload) {
  return request(`/api/admin/sales-items/${salesItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteSalesItem(salesItemId) {
  let response;
  try {
    response = await fetch(buildApiUrl(`/api/admin/sales-items/${salesItemId}`), {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new Error('Unable to reach backend API. Check that the production API base URL is configured correctly.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to delete sales item. Please try again.');
  }
}

export function fetchAdminReports(params = {}) {
  const search = new URLSearchParams();

  if (params.startDate) {
    search.set('startDate', params.startDate);
  }
  if (params.endDate) {
    search.set('endDate', params.endDate);
  }
  if (params.salesItemId) {
    search.set('salesItemId', params.salesItemId);
  }
  if (params.batchNumber) {
    search.set('batchNumber', params.batchNumber);
  }
  if (params.reportType) {
    search.set('reportType', params.reportType);
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/api/admin/reports${suffix}`);
}

export function fetchAdminCustomers(params = {}) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set('q', params.q);
  }
  if (params.batchNumber) {
    search.set('batchNumber', params.batchNumber);
  }
  if (params.hasOrders !== undefined && params.hasOrders !== '') {
    search.set('hasOrders', String(params.hasOrders));
  }
  if (params.sortBy) {
    search.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/api/admin/customers${suffix}`);
}

export function fetchAdminOrders(params = {}) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set('q', params.q);
  }
  if (params.batchNumber) {
    search.set('batchNumber', params.batchNumber);
  }
  if (params.paidOnly !== undefined && params.paidOnly !== '') {
    search.set('paidOnly', String(params.paidOnly));
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.paymentStatus) {
    search.set('paymentStatus', params.paymentStatus);
  }
  if (params.paymentMethod) {
    search.set('paymentMethod', params.paymentMethod);
  }
  if (params.fulfillmentMethod) {
    search.set('fulfillmentMethod', params.fulfillmentMethod);
  }
  if (params.fulfillmentStatus) {
    search.set('fulfillmentStatus', params.fulfillmentStatus);
  }
  if (params.sortBy) {
    search.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/api/admin/orders${suffix}`);
}

export async function exportAdminOrders(params = {}) {
  const search = new URLSearchParams();

  if (params.q) search.set('q', params.q);
  if (params.batchNumber) search.set('batchNumber', params.batchNumber);
  if (params.paidOnly !== undefined && params.paidOnly !== '') search.set('paidOnly', String(params.paidOnly));
  if (params.status) search.set('status', params.status);
  if (params.paymentStatus) search.set('paymentStatus', params.paymentStatus);
  if (params.paymentMethod) search.set('paymentMethod', params.paymentMethod);
  if (params.fulfillmentMethod) search.set('fulfillmentMethod', params.fulfillmentMethod);
  if (params.fulfillmentStatus) search.set('fulfillmentStatus', params.fulfillmentStatus);
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);

  const suffix = search.toString() ? `?${search.toString()}` : '';
  let response;
  try {
    response = await fetch(buildApiUrl(`/api/admin/orders/export${suffix}`), {
      credentials: 'include',
    });
  } catch {
    throw new Error('Unable to reach backend API. Check that the production API base URL is configured correctly.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to export orders right now.');
  }

  return {
    blob: await response.blob(),
    fileName: response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'orders-export.csv',
  };
}

export function confirmAdminInteracPayment(orderReference) {
  return request(`/api/admin/payments/${orderReference}/confirm-interac`, {
    method: 'POST',
  });
}

export function resendAdminPaymentConfirmation(orderReference) {
  return request(`/api/admin/payments/${orderReference}/resend-confirmation`, {
    method: 'POST',
  });
}

export function fetchAdminPaymentProofViewUrl(orderReference) {
  return request(`/api/admin/payments/${orderReference}/proof-view-url`);
}

export function updateAdminFulfillmentStatus(orderReference, fulfillmentStatus) {
  return request(`/api/admin/orders/${orderReference}/fulfillment-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fulfillmentStatus }),
  });
}

export function fetchAdminUsers(params = {}) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set('q', params.q);
  }
  if (params.role) {
    search.set('role', params.role);
  }
  if (params.isActive !== undefined) {
    search.set('isActive', String(params.isActive));
  }
  if (params.sortBy) {
    search.set('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder);
  }
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return request(`/api/admin/users${suffix}`);
}

export function createAdminUser(payload) {
  return request('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function inviteAdminUser(payload) {
  return request('/api/admin/users/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function acceptAdminInvite(payload) {
  return request('/api/admin/auth/invite/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function requestAdminPasswordReset(payload) {
  return request('/api/admin/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function resetAdminPassword(payload) {
  return request('/api/admin/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
