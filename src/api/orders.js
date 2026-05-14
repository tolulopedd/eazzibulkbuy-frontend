import { buildApiUrl } from './config';

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Unable to complete this request. Please try again.');
  }
  return response.json();
}

export function createOrder(payload) {
  return request(buildApiUrl('/api/orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createPaymentIntent(orderReference) {
  return request(buildApiUrl(`/api/orders/${orderReference}/payment-intent`), {
    method: 'POST',
  });
}

export function setOrderPaymentMethod(orderReference, paymentMethod) {
  return request(buildApiUrl(`/api/orders/${orderReference}/payment-method`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod }),
  });
}

export function createManualTransferUploadUrl(orderReference, payload) {
  return request(buildApiUrl(`/api/orders/${orderReference}/manual-transfer-upload-url`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function confirmManualTransfer(orderReference, payload) {
  return request(buildApiUrl(`/api/orders/${orderReference}/manual-transfer-confirmation`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function confirmCardPayment(orderReference, payload) {
  return request(buildApiUrl(`/api/orders/${orderReference}/card-payment-confirmation`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
