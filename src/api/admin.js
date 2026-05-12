const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new Error('Unable to reach backend API. Ensure backend and PostgreSQL are running.');
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
    response = await fetch(`${API_BASE_URL}/api/admin/sales-items/${salesItemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new Error('Unable to reach backend API. Ensure backend and PostgreSQL are running.');
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
