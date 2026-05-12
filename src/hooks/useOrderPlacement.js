import { useState } from 'react';
import {
  createManualTransferUploadUrl,
  createOrder,
  createPaymentIntent,
  confirmCardPayment,
  confirmManualTransfer,
  setOrderPaymentMethod,
} from '../api/orders';

export function useOrderPlacement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResponse, setOrderResponse] = useState(null);

  async function submitOrder(payload) {
    setLoading(true);
    setError('');

    try {
      const data = await createOrder(payload);
      setOrderResponse(data);
      return data;
    } catch (err) {
      setError(err.message || 'Unable to create your order. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function submitPaymentIntent(orderReference) {
    setLoading(true);
    setError('');

    try {
      return await createPaymentIntent(orderReference);
    } catch (err) {
      setError(err.message || 'Unable to start payment. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function submitSetPaymentMethod(orderReference, paymentMethod) {
    setLoading(true);
    setError('');

    try {
      return await setOrderPaymentMethod(orderReference, paymentMethod);
    } catch (err) {
      setError(err.message || 'Unable to update payment method. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function submitManualTransferConfirmation(orderReference, payload) {
    setLoading(true);
    setError('');

    try {
      return await confirmManualTransfer(orderReference, payload);
    } catch (err) {
      setError(err.message || 'Unable to confirm transfer. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function submitManualTransferUploadUrl(orderReference, payload) {
    setLoading(true);
    setError('');

    try {
      return await createManualTransferUploadUrl(orderReference, payload);
    } catch (err) {
      setError(err.message || 'Unable to prepare receipt upload. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function submitCardPaymentConfirmation(orderReference, payload) {
    setLoading(true);
    setError('');

    try {
      return await confirmCardPayment(orderReference, payload);
    } catch (err) {
      setError(err.message || 'Unable to confirm card payment. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    orderResponse,
    submitOrder,
    submitSetPaymentMethod,
    submitPaymentIntent,
    submitManualTransferUploadUrl,
    submitManualTransferConfirmation,
    submitCardPaymentConfirmation,
  };
}
