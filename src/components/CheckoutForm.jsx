import { useMemo, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { PAYMENT_METHODS } from '../types/paymentMethods';
import CustomerSearch from './CustomerSearch';
import { ui } from '../ui/classes';

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#2a2a2a',
      '::placeholder': { color: '#8a8a8a' },
    },
  },
};

export default function CheckoutForm({ onPlaceOrder, placingOrder, orderResponse, groupBuys, loadingGroupBuys }) {
  const stripe = useStripe();
  const elements = useElements();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [groupBuyId, setGroupBuyId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE_CARD');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  const requiresCard = useMemo(() => paymentMethod === 'STRIPE_CARD', [paymentMethod]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');

    const payload = {
      customer: {
        fullName,
        email,
        phone: phone || undefined,
        address: address || undefined,
      },
      items: [{ groupBuyId, quantity: Number(quantity) }],
      paymentMethod,
      notes: notes || undefined,
    };

    const result = await onPlaceOrder(payload);

    if (requiresCard && result.payment?.clientSecret) {
      if (!stripe || !elements) {
        setStatus('Payment form is still loading. Please try again.');
        return;
      }

      const cardElement = elements.getElement(CardElement);
      const paymentResult = await stripe.confirmCardPayment(result.payment.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: fullName,
            email,
            phone: phone || undefined,
            address: address ? { line1: address } : undefined,
          },
        },
      });

      if (paymentResult.error) {
        setStatus(paymentResult.error.message || 'Unable to process payment. Please try again.');
        return;
      }

      setStatus('Payment received. We are finalizing your confirmation.');
      return;
    }

    setStatus('Order created. Follow the payment instructions below.');
  }

  return (
    <form onSubmit={handleSubmit} className={`${ui.card} mx-auto w-full max-w-3xl space-y-4`}>
      <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Checkout</h1>
      <CustomerSearch
        onSelect={(customer) => {
          setFullName(customer.fullName || '');
          setEmail(customer.email || '');
          setPhone(customer.phone || '');
          setAddress(customer.address || '');
        }}
      />

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Full name</label>
        <input className={ui.input} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Email</label>
        <input className={ui.input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Phone</label>
        <input className={ui.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Address</label>
        <textarea className={ui.textarea} value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Sales item</label>
        <select className={ui.select} required value={groupBuyId} onChange={(e) => setGroupBuyId(e.target.value)} disabled={loadingGroupBuys}>
          <option value="">{loadingGroupBuys ? 'Loading products...' : 'Select a product'}</option>
          {groupBuys.map((gb) => (
            <option key={gb.id} value={gb.id}>
              {gb.title} - CAD {(gb.unitPrice / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Quantity</label>
        <input className={ui.input} type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Payment method</label>
        <select className={ui.select} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {requiresCard ? (
        <div className={ui.fieldWrap}>
          <label className={ui.label}>Card details</label>
          <div className="rounded-xl border border-slate-300 bg-white px-3 py-3">
            <CardElement options={CARD_STYLE} />
          </div>
        </div>
      ) : null}

      <div className={ui.fieldWrap}>
        <label className={ui.label}>Order notes (optional)</label>
        <textarea className={ui.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-center pt-1">
        <button
          className={`${ui.buttonPrimary} min-w-32`}
          disabled={placingOrder || loadingGroupBuys || !groupBuyId || (requiresCard && !stripe)}
          type="submit"
        >
          {placingOrder ? 'Creating order...' : 'Place order'}
        </button>
      </div>

      {status && <p className={ui.success}>{status}</p>}

      {orderResponse ? (
        <div className={ui.summary}>
          <h2 className="text-lg font-semibold text-slate-900">Order details</h2>
          <p className="text-sm leading-6 text-slate-600">Order ID: {orderResponse.orderId}</p>
          <p className="text-sm leading-6 text-slate-600">Order status: {orderResponse.status}</p>
          <p className="text-sm leading-6 text-slate-600">
            Total: {orderResponse.currency} {(orderResponse.totalAmount / 100).toFixed(2)}
          </p>
          {orderResponse.payment?.instructions ? <p className="text-sm leading-6 text-slate-600">{orderResponse.payment.instructions}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
