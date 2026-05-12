const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to complete this request. Please try again.');
  }
  return response.json();
}

export function createOrder(payload) {
  return request(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createPaymentIntent(orderReference) {
  return request(`${API_BASE_URL}/api/orders/${orderReference}/payment-intent`, {
    method: 'POST',
  });
}

export function setOrderPaymentMethod(orderReference, paymentMethod) {
  return request(`${API_BASE_URL}/api/orders/${orderReference}/payment-method`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod }),
  });
}

export function createManualTransferUploadUrl(orderReference, payload) {
  return request(`${API_BASE_URL}/api/orders/${orderReference}/manual-transfer-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function confirmManualTransfer(orderReference, payload) {
  return request(`${API_BASE_URL}/api/orders/${orderReference}/manual-transfer-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function confirmCardPayment(orderReference, payload) {
  return request(`${API_BASE_URL}/api/orders/${orderReference}/card-payment-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
