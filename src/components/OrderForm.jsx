import { useEffect, useMemo, useRef, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { fetchActiveSalesItems } from '../api/salesItems';
import { saveCustomerDetails, searchCustomers } from '../api/customers';
import CustomerSearch from './CustomerSearch';
import { ui } from '../ui/classes';
import { clearCartItems, readCartItems, setCartQuantity, writeCartItems } from '../utils/cart';
import { formatOrderReferenceDisplay } from '../utils/orderReference';

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#2a2a2a',
      '::placeholder': { color: '#8a8a8a' },
    },
  },
};

const PAYMENT_OPTIONS = [
  {
    value: 'INTERAC_E_TRANSFER',
    label: 'Interac e-Transfer',
    note: 'Send payment by Interac e-Transfer, share a receipt with us and receive confirmation within 6 hours. Pay instantly using your bank app.',
  },
  {
    value: 'STRIPE_CARD',
    label: 'Stripe (Card)',
    note: 'Pay instantly with Visa, Mastercard, or debit card.',
  },
];

const PROVINCE_OPTIONS = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

const PROVINCE_CITY_OPTIONS = {
  Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat'],
  'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna'],
  Manitoba: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie', 'Winkler', 'Morden', 'Selkirk'],
  'New Brunswick': ['Moncton', 'Saint John', 'Fredericton', 'Miramichi', 'Edmundston'],
  'Newfoundland and Labrador': ["St. John's", 'Mount Pearl', 'Corner Brook', 'Conception Bay South', 'Grand Falls-Windsor'],
  'Northwest Territories': ['Yellowknife', 'Hay River', 'Inuvik', 'Fort Smith', 'Behchoko'],
  'Nova Scotia': ['Halifax', 'Sydney', 'Dartmouth', 'Truro', 'New Glasgow'],
  Nunavut: ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake', 'Cambridge Bay'],
  Ontario: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton'],
  'Prince Edward Island': ['Charlottetown', 'Summerside', 'Stratford', 'Cornwall', 'Montague'],
  Quebec: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
  Saskatchewan: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current'],
  Yukon: ['Whitehorse', 'Dawson City', 'Watson Lake', 'Haines Junction', 'Carmacks'],
};

const MANUAL_TRANSFER_WINDOW_SECONDS = 10 * 60;
const CANADIAN_POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/;
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const isMapboxConfigured = Boolean(MAPBOX_ACCESS_TOKEN);

function parseMapboxContext(context = [], feature) {
  const allParts = [...context, ...(feature ? [{ id: feature.id, text: feature.text, short_code: feature.properties?.short_code }] : [])];
  const provincePart = allParts.find((part) => part.id?.startsWith('region.'));
  const cityPart = allParts.find((part) => part.id?.startsWith('place.'));
  const postalPart = allParts.find((part) => part.id?.startsWith('postcode.'));
  const placeTypes = Array.isArray(feature?.place_type) ? feature.place_type : [];
  const isAddressFeature = placeTypes.includes('address');
  const addressText = isAddressFeature
    ? [feature?.address, feature?.text].filter(Boolean).join(' ').trim()
    : feature?.properties?.address
    ? [feature.properties.address, feature?.text].filter(Boolean).join(' ').trim()
    : '';

  return {
    address: addressText,
    city: cityPart?.text || '',
    province: provincePart?.text || '',
    postalCode: postalPart?.text || '',
  };
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildDeliveryGroupKey(item) {
  return [item.deliveryBaseRangeMax || 0, item.deliveryBasePrice || 0, item.deliveryAdditionalUnitPrice || 0].join(':');
}

function calculateDeliveryFeeForGroup(item, quantity) {
  if (!item.deliveryEnabled) {
    return 0;
  }

  const baseRangeMax = Math.max(1, item.deliveryBaseRangeMax || 10);
  const basePrice = item.deliveryBasePrice || 0;
  const additionalUnitPrice = item.deliveryAdditionalUnitPrice || 0;

  return quantity <= baseRangeMax
    ? basePrice
    : basePrice + (quantity - baseRangeMax) * additionalUnitPrice;
}

function buildCartSummary(cartLines, fulfillmentMethod) {
  const deliveryGroups = new Map();

  if (fulfillmentMethod !== 'DELIVERY') {
    const subtotal = cartLines.reduce((sum, line) => sum + line.quantity * line.pricePerUnit, 0);
    const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);
    return {
      subtotal,
      groupedDeliveryFee: 0,
      totalQuantity,
      totalAmount: subtotal,
      deliveryGroups: [],
    };
  }

  for (const line of cartLines) {
    const groupKey = buildDeliveryGroupKey(line);
    const current = deliveryGroups.get(groupKey) || { quantity: 0, item: line };
    deliveryGroups.set(groupKey, {
      quantity: current.quantity + line.quantity,
      item: current.item,
    });
  }

  const groupedDeliveryFee = [...deliveryGroups.values()].reduce(
    (sum, group) => sum + calculateDeliveryFeeForGroup(group.item, group.quantity),
    0,
  );

  const subtotal = cartLines.reduce((sum, line) => sum + line.quantity * line.pricePerUnit, 0);
  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    subtotal,
    groupedDeliveryFee,
    totalQuantity,
    totalAmount: subtotal + groupedDeliveryFee,
    deliveryGroups: [...deliveryGroups.values()],
  };
}

function calculateStripeProcessingFee(totalAmountCents) {
  if (!totalAmountCents || totalAmountCents <= 0) {
    return 0;
  }

  const grossTotal = Math.round((totalAmountCents + 30) / (1 - 0.029));
  return Math.max(0, grossTotal - totalAmountCents);
}

function PaymentSuccessPage({
  orderReference,
  createdAt,
  itemName,
  totalAmount,
  buyer,
  emailSent = false,
  demoMode = false,
  variant = 'payment',
}) {
  const isManualReview = variant === 'manual-review';
  return (
    <section className={`${ui.card} mx-auto w-full max-w-3xl space-y-3`}>
      <h1 className="text-2xl font-bold tracking-tight text-emerald-950">
        {isManualReview ? 'Order submitted successfully' : 'Payment successful'}
      </h1>
      <p className="leading-6 text-slate-700">
        {isManualReview
          ? 'Your Interac transfer receipt has been received and your order is now awaiting payment confirmation.'
          : demoMode
          ? 'Demo mode: this is a simulated Stripe confirmation and no card was charged.'
          : 'Your order has been received and your payment was processed.'}
      </p>
      <p className="leading-6 text-slate-700">
        Order reference: <span className="font-semibold text-slate-900">{formatOrderReferenceDisplay(orderReference, createdAt, buyer)}</span>
      </p>
      <p className="leading-6 text-slate-700">
        Items: <span className="font-semibold text-slate-900">{itemName}</span>
      </p>
      <p className="leading-6 text-slate-700">
        Total paid: <span className="font-semibold text-slate-900">CAD {(totalAmount / 100).toFixed(2)}</span>
      </p>
      {emailSent ? (
        <p className="leading-6 text-emerald-800">
          {isManualReview ? 'A confirmation email will be sent once your payment is confirmed.' : 'Your order confirmation email has been sent successfully.'}
        </p>
      ) : null}
      <p className="leading-6 text-slate-700">
        {isManualReview
          ? 'Our team will review the transfer and update the order once payment is confirmed.'
          : 'We would provide further details once your order is ready for pick-up/delivery.'}
      </p>
    </section>
  );
}

function PaymentSuccessModal({ onClose, ...props }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-3xl">
        <PaymentSuccessPage {...props} />
        <div className="mt-4 flex justify-center">
          <button type="button" className={ui.buttonPrimary} onClick={onClose}>
            Start a new order
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderForm({
  salesItemId,
  onCreateOrder,
  onSetOrderPaymentMethod,
  onCreatePaymentIntent,
  onCreateManualTransferUploadUrl,
  onConfirmManualTransfer,
  onConfirmCardPayment,
  stripeConfigured = false,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [activeItems, setActiveItems] = useState([]);
  const [cartItems, setCartItems] = useState(() => readCartItems());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState('PICKUP');
  const [status, setStatus] = useState('');
  const [detailsStatus, setDetailsStatus] = useState('');
  const [retrievedCustomerEmail, setRetrievedCustomerEmail] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('INTERAC_E_TRANSFER');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [successfulOrder, setSuccessfulOrder] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [manualOrder, setManualOrder] = useState(null);
  const [confirmingManualTransfer, setConfirmingManualTransfer] = useState(false);
  const [manualTransferFeedback, setManualTransferFeedback] = useState('');
  const [manualTransferError, setManualTransferError] = useState('');
  const [manualTransferProofFile, setManualTransferProofFile] = useState(null);
  const [manualTransferProofName, setManualTransferProofName] = useState('');
  const [manualTransferDeadlineMs, setManualTransferDeadlineMs] = useState(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [addressLookupStatus, setAddressLookupStatus] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showBuyerDetails, setShowBuyerDetails] = useState(false);
  const [newBuyerMode, setNewBuyerMode] = useState(false);
  const [emailConflictBuyer, setEmailConflictBuyer] = useState(null);
  const resetTimerRef = useRef(null);
  const selectedAddressRef = useRef('');

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();
  const trimmedAddress = address.trim();
  const trimmedCity = city.trim();
  const trimmedProvince = province.trim();
  const trimmedPostalCode = postalCode.trim().toUpperCase();
  const isValidCanadianPostalCode = CANADIAN_POSTAL_CODE_REGEX.test(trimmedPostalCode);
  const hasBuyerData =
    trimmedFirstName.length >= 2 &&
    trimmedLastName.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) &&
    trimmedPhone.length >= 7 &&
    trimmedAddress.length >= 5 &&
    trimmedCity.length >= 2 &&
    trimmedProvince.length >= 2 &&
    isValidCanadianPostalCode;
  const buyerDetailsReady = hasBuyerData;
  const isStripePayment = paymentMethod === 'STRIPE_CARD';
  const stripeReady = stripeConfigured && Boolean(stripe) && Boolean(elements);
  const isStripeDemoMode = isStripePayment && !stripeConfigured;
  const hasCreatedOrder = Boolean(createdOrder?.orderReference);
  const normalizedRetrievedEmail = retrievedCustomerEmail.trim().toLowerCase();
  const normalizedTypedEmail = trimmedEmail.toLowerCase();
  const isExistingBuyerFlow = Boolean(normalizedRetrievedEmail) && normalizedRetrievedEmail === normalizedTypedEmail;
  const saveDetailsLabel = isExistingBuyerFlow ? 'Update details' : 'Save';
  const nameAndEmailLocked = isExistingBuyerFlow;
  const cartLines = useMemo(() => {
    const itemMap = new Map(activeItems.map((item) => [item.id, item]));
    return cartItems
      .map((entry) => {
        const salesItem = itemMap.get(entry.salesItemId);
        if (!salesItem) {
          return null;
        }

        return {
          ...salesItem,
          quantity: entry.quantity,
        };
      })
      .filter(Boolean);
  }, [activeItems, cartItems]);
  const cartAllowsDelivery = useMemo(
    () => cartLines.length > 0 && cartLines.every((line) => line.deliveryEnabled),
    [cartLines],
  );
  const cartSummary = useMemo(() => buildCartSummary(cartLines, fulfillmentMethod), [cartLines, fulfillmentMethod]);
  const cartItemSummary = useMemo(() => cartLines.map((line) => `${line.name} x${line.quantity}`).join(', '), [cartLines]);
  const manualTransferEmail = manualOrder?.manualPayment?.transferEmail || 'payments@eazzibulkbuy.ca';
  const manualConfirmationEtaHours = manualOrder?.manualPayment?.confirmationEtaHours || manualOrder?.manualConfirmationEtaHours || 12;
  const stripeFeeBaseAmount = createdOrder
    ? (createdOrder.subtotal || 0) + (createdOrder.deliveryFee || 0)
    : cartSummary.totalAmount;
  const stripeProcessingFeePreview = useMemo(
    () => calculateStripeProcessingFee(stripeFeeBaseAmount),
    [stripeFeeBaseAmount],
  );
  const stripeTotalPreview = stripeFeeBaseAmount + stripeProcessingFeePreview;
  const manualTransferRemainingSeconds = manualTransferDeadlineMs
    ? Math.max(0, Math.ceil((manualTransferDeadlineMs - currentTimeMs) / 1000))
    : 0;
  const isManualTransferCountdownActive = Boolean(manualOrder) && manualTransferRemainingSeconds > 0;
  const isManualTransferCountdownExpired = Boolean(manualOrder) && manualTransferRemainingSeconds <= 0;

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      setLoading(true);
      setLoadError('');
      try {
        const items = await fetchActiveSalesItems();
        if (!mounted) {
          return;
        }

        setActiveItems(items);
        const currentCart = readCartItems();
        if (currentCart.length === 0 && salesItemId) {
          const seededCart = writeCartItems([{ salesItemId, quantity: 1 }]);
          setCartItems(seededCart);
          return;
        }

        const validItemIds = new Set(items.map((item) => item.id));
        const sanitized = currentCart.filter((item) => validItemIds.has(item.salesItemId));
        if (sanitized.length !== currentCart.length) {
          setCartItems(writeCartItems(sanitized));
        } else {
          setCartItems(currentCart);
        }
      } catch (err) {
        if (mounted) {
          setLoadError(err.message || 'Unable to load active products. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      mounted = false;
    };
  }, [salesItemId]);

  useEffect(() => {
    if (!cartAllowsDelivery && fulfillmentMethod === 'DELIVERY') {
      setFulfillmentMethod('PICKUP');
    }
  }, [cartAllowsDelivery, fulfillmentMethod]);

  useEffect(() => {
    if (!newBuyerMode) {
      setEmailConflictBuyer(null);
      return;
    }

    const normalizedEmail = trimmedEmail.toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailConflictBuyer(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await searchCustomers(normalizedEmail);
        if (cancelled) {
          return;
        }

        const exactMatch = results.find((customer) => customer.email?.toLowerCase() === normalizedEmail);
        setEmailConflictBuyer(exactMatch || null);
      } catch {
        if (!cancelled) {
          setEmailConflictBuyer(null);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newBuyerMode, trimmedEmail]);

  useEffect(() => {
    if (!isMapboxConfigured) {
      setAddressSuggestions([]);
      setAddressLookupStatus('Address suggestions need a Mapbox token. Add VITE_MAPBOX_ACCESS_TOKEN to frontend/.env and restart the frontend.');
      return undefined;
    }

    if (trimmedAddress.length < 3) {
      setAddressSuggestions([]);
      return undefined;
    }

    if (selectedAddressRef.current && trimmedAddress === selectedAddressRef.current) {
      setAddressSuggestions([]);
      setAddressLookupStatus('');
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedAddress)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&country=CA&types=address&limit=5&language=en`,
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(errorText || 'Unable to load address suggestions.');
        }

        const data = await response.json();
        if (!cancelled) {
          setAddressSuggestions(data.features || []);
          setAddressLookupStatus('');
        }
      } catch (error) {
        if (!cancelled) {
          setAddressSuggestions([]);
          setAddressLookupStatus(
            error?.message?.includes('proximity')
              ? 'Address suggestions failed because the location bias request was invalid.'
              : 'Address suggestions are unavailable right now.',
          );
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, postalCode, province, trimmedAddress]);

  useEffect(() => {
    if (!isMapboxConfigured || !isValidCanadianPostalCode) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const lookupQuery = [trimmedPostalCode, city, province, 'Canada'].filter(Boolean).join(', ');
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(lookupQuery)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=false&country=CA&types=postcode,address&limit=1`,
        );

        if (!response.ok) {
          throw new Error('Unable to look up postal code.');
        }

        const data = await response.json();
        const result = data?.features?.[0];
        if (!result || cancelled) {
          return;
        }

        const resolved = parseMapboxContext(result.context, result);
        if (resolved.province) {
          setProvince(resolved.province);
        }
        if (resolved.city) {
          setCity(resolved.city);
        }
        if (resolved.postalCode) {
          setPostalCode(resolved.postalCode.toUpperCase());
        }
        if (resolved.address) {
          setAddress(resolved.address);
        }
        setAddressLookupStatus('');
      } catch {
        if (!cancelled) {
          setAddressLookupStatus('Postal code lookup is unavailable right now.');
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, isValidCanadianPostalCode, province, trimmedPostalCode]);

  useEffect(() => () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!manualOrder || !manualTransferDeadlineMs) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [manualOrder, manualTransferDeadlineMs]);

  function updateCartLineQuantity(line, nextQuantity) {
    if (hasCreatedOrder) {
      return;
    }

    const nextCart = setCartQuantity(line.id, nextQuantity);
    setCartItems(nextCart);
  }

  function resetToFreshOrderForm() {
    clearCartItems();
    setCartItems([]);
    setTitle('Mr');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setProvince('');
    setPostalCode('');
    setFulfillmentMethod('PICKUP');
    setStatus('');
    setDetailsStatus('');
    setRetrievedCustomerEmail('');
    setPaymentMethod('INTERAC_E_TRANSFER');
    setPaymentProcessing(false);
    setPaymentError('');
    setPaymentModalOpen(false);
    setCreatedOrder(null);
    setManualOrder(null);
    setConfirmingManualTransfer(false);
    setManualTransferFeedback('');
    setManualTransferError('');
    setManualTransferProofFile(null);
    setManualTransferProofName('');
    setManualTransferDeadlineMs(null);
    setCurrentTimeMs(Date.now());
    setShowSuccessPage(false);
    setSuccessfulOrder(null);
    setAddressLookupStatus('');
    setAddressSuggestions([]);
    setShowBuyerDetails(false);
    setNewBuyerMode(false);
    setEmailConflictBuyer(null);
    selectedAddressRef.current = '';
  }

  function resetBuyerFormForNewEntry() {
    setTitle('Mr');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setProvince('');
    setPostalCode('');
    setRetrievedCustomerEmail('');
    setDetailsStatus('');
    setEmailConflictBuyer(null);
    setNewBuyerMode(true);
    setShowBuyerDetails(true);
    selectedAddressRef.current = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setPaymentError('');
    setManualTransferFeedback('');
    setManualTransferError('');

    if (cartLines.length === 0) {
      setStatus('Add at least one active product to your cart first.');
      return;
    }

    if (!hasBuyerData) {
      setStatus('Select a returning buyer or click New Buyer before creating your order.');
      return;
    }

    if (!buyerDetailsReady) {
      setStatus('Complete the buyer details before creating your order.');
      return;
    }

    try {
      const created = await onCreateOrder({
        title,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        province,
        postalCode: trimmedPostalCode,
        items: cartLines.map((line) => ({
          salesItemId: line.id,
          quantity: line.quantity,
          fulfillmentMethod,
        })),
      });

      setCreatedOrder(created);
      setManualOrder(null);
      setManualTransferDeadlineMs(null);
      setCurrentTimeMs(Date.now());
      setStatus('Order created. Choose your payment method below.');
      setPaymentModalOpen(true);
    } catch (err) {
      setPaymentError(err.message || 'Unable to create your order. Please try again.');
    }
  }

  async function handleContinueToPayment() {
    if (!createdOrder) {
      setStatus('Create your order first before choosing a payment method.');
      return;
    }

    try {
      if (isStripePayment && stripeConfigured && !stripeReady) {
        setStatus('Card checkout is still loading. Please try again.');
        return;
      }

      setPaymentProcessing(true);
      setPaymentError('');
      const paymentSelection = await onSetOrderPaymentMethod(createdOrder.orderReference, paymentMethod);
      setCreatedOrder(paymentSelection);

      if (!isStripePayment) {
        setManualOrder(paymentSelection);
        const createdAtMs = paymentSelection.createdAt ? new Date(paymentSelection.createdAt).getTime() : Date.now();
        const safeCreatedAtMs = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs;
        setManualTransferDeadlineMs(safeCreatedAtMs + MANUAL_TRANSFER_WINDOW_SECONDS * 1000);
        setCurrentTimeMs(Date.now());
        setStatus('Order created. Send your Interac transfer, then confirm below.');
        setPaymentModalOpen(true);
        return;
      }

      if (isStripeDemoMode) {
        const confirmedPayment = await onConfirmCardPayment(createdOrder.orderReference, {
          paymentIntentId: `stripe-demo:${createdOrder.orderReference}`,
        });
        setSuccessfulOrder({
          orderReference: createdOrder.orderReference,
          createdAt: confirmedPayment.createdAt || createdOrder.createdAt,
          itemName: cartItemSummary,
          totalAmount: paymentSelection.totalAmount,
          buyer: { firstName, lastName },
          emailSent: Boolean(confirmedPayment.emailSent),
          demoMode: true,
        });
        clearCartItems();
        setCartItems([]);
        setShowSuccessPage(true);
        setPaymentModalOpen(false);
        setStatus('');
        return;
      }

      setManualOrder(null);
      setManualTransferDeadlineMs(null);
      setStatus('Preparing payment...');
      const paymentIntentData = await onCreatePaymentIntent(createdOrder.orderReference);
      const cardElement = elements.getElement(CardElement);

      setStatus('Processing payment...');
      const paymentResult = await stripe.confirmCardPayment(paymentIntentData.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: [title, firstName, lastName].filter(Boolean).join(' '),
            email,
            phone,
            address: { line1: address },
          },
        },
      });

      if (paymentResult.error) {
        setPaymentError(paymentResult.error.message || 'Unable to process payment. Please try again.');
        setStatus('');
        return;
      }

      const paymentIntentId = paymentResult.paymentIntent?.id;
      if (!paymentIntentId) {
        throw new Error('Stripe payment completed, but no payment reference was returned.');
      }

      const confirmedPayment = await onConfirmCardPayment(createdOrder.orderReference, {
        paymentIntentId,
      });

      setSuccessfulOrder({
        orderReference: createdOrder.orderReference,
        createdAt: confirmedPayment.createdAt || createdOrder.createdAt,
        itemName: cartItemSummary,
        totalAmount: paymentSelection.totalAmount,
        buyer: { firstName, lastName },
        emailSent: Boolean(confirmedPayment.emailSent),
      });
      clearCartItems();
      setCartItems([]);
      setShowSuccessPage(true);
      setPaymentModalOpen(false);
      setStatus('');
    } catch (err) {
      setPaymentError(err.message || 'Unable to continue with payment. Please try again.');
      setStatus('');
    } finally {
      setPaymentProcessing(false);
    }
  }

  async function handleConfirmManualTransfer() {
    if (!manualOrder) {
      return;
    }

    if (!manualTransferProofFile || !manualTransferProofName) {
      setManualTransferError('Upload your Interac transfer screenshot before confirming payment.');
      return;
    }

    try {
      setConfirmingManualTransfer(true);
      setManualTransferFeedback('');
      setManualTransferError('');
      const uploadTarget = await onCreateManualTransferUploadUrl(manualOrder.orderReference, {
        fileName: manualTransferProofFile.name,
        contentType: manualTransferProofFile.type,
        sizeBytes: manualTransferProofFile.size,
      });
      const uploadResponse = await fetch(uploadTarget.uploadUrl, {
        method: 'PUT',
        body: manualTransferProofFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Unable to upload your receipt screenshot right now.');
      }

      const result = await onConfirmManualTransfer(manualOrder.orderReference, {
        transferProof: {
          fileName: manualTransferProofFile.name,
          contentType: manualTransferProofFile.type,
          sizeBytes: manualTransferProofFile.size,
          objectKey: uploadTarget.objectKey,
        },
      });
      clearCartItems();
      setManualTransferFeedback(result.message || 'Order submitted successfully. Transfer proof received for review.');
      setSuccessfulOrder({
        orderReference: result.orderReference || manualOrder.orderReference,
        createdAt: result.createdAt || manualOrder.createdAt,
        itemName: cartItemSummary,
        totalAmount: manualOrder.totalAmount,
        buyer: { firstName, lastName },
        emailSent: result.emailSent,
        variant: 'manual-review',
      });
      setPaymentModalOpen(false);
      setShowSuccessPage(true);
      setStatus('');
    } catch (err) {
      setManualTransferError(err.message || 'Unable to confirm transfer right now. Please try again.');
    } finally {
      setConfirmingManualTransfer(false);
    }
  }

  async function handleManualTransferProofChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setManualTransferProofFile(null);
      setManualTransferProofName('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setManualTransferError('Upload an image screenshot for the Interac transfer proof.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setManualTransferError('Transfer proof image must be 5MB or smaller.');
      event.target.value = '';
      return;
    }

    setManualTransferError('');
    setManualTransferProofFile(file);
    setManualTransferProofName(file.name);
  }

  async function handleSaveDetails() {
    setDetailsStatus('');
    setPaymentError('');

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      setDetailsStatus('Enter title, first name, last name, and email before saving your details.');
      return;
    }

    try {
      setSavingDetails(true);

      if (newBuyerMode && emailConflictBuyer && emailConflictBuyer.email?.toLowerCase() === trimmedEmail.toLowerCase()) {
        setDetailsStatus('A buyer with this email already exists. Use the saved buyer below or edit the existing details instead.');
        return;
      }

      const result = await saveCustomerDetails({
        title,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail.toLowerCase(),
        phone: trimmedPhone || undefined,
        address: trimmedAddress || undefined,
        city: trimmedCity || undefined,
        province: trimmedProvince || undefined,
        postalCode: trimmedPostalCode || undefined,
      });

      setFirstName(trimmedFirstName);
      setLastName(trimmedLastName);
      setEmail(trimmedEmail.toLowerCase());
      setPhone(trimmedPhone);
      setAddress(trimmedAddress);
      setCity(trimmedCity);
      setProvince(trimmedProvince);
      setPostalCode(trimmedPostalCode);
      setRetrievedCustomerEmail(trimmedEmail.toLowerCase());
      setNewBuyerMode(false);
      setEmailConflictBuyer(null);
      setShowBuyerDetails(false);
      setDetailsStatus(result.message || (isExistingBuyerFlow ? 'Buyer details updated.' : 'Buyer details saved.'));
    } catch (err) {
      setDetailsStatus(err.message || 'Unable to save customer details. Please try again.');
    } finally {
      setSavingDetails(false);
    }
  }

  return (
    <>
      {showSuccessPage && successfulOrder ? (
        <PaymentSuccessModal
          onClose={() => {
            setShowSuccessPage(false);
            resetToFreshOrderForm();
          }}
          orderReference={successfulOrder.orderReference}
          createdAt={successfulOrder.createdAt}
          itemName={successfulOrder.itemName}
          totalAmount={successfulOrder.totalAmount}
          buyer={successfulOrder.buyer}
          emailSent={successfulOrder.emailSent}
          demoMode={successfulOrder.demoMode}
          variant={successfulOrder.variant}
        />
      ) : null}

      {hasCreatedOrder && paymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="absolute inset-0" onClick={() => !paymentProcessing && setPaymentModalOpen(false)} aria-hidden="true" />
          <section className="relative z-10 w-full max-w-xl rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_30px_120px_rgba(15,23,42,0.24)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-emerald-950">
                  Payment for order <span className="font-semibold text-slate-900">{formatOrderReferenceDisplay(createdOrder.orderReference, createdOrder.createdAt, { firstName, lastName })}</span>.
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPaymentModalOpen(false)}
                disabled={paymentProcessing}
                aria-label="Close payment menu"
              >
                ×
              </button>
            </div>

            {!manualOrder ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-2">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`rounded-xl border px-3.5 py-3 ${paymentMethod === option.value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'} ${paymentProcessing ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={paymentMethod === option.value}
                          onChange={(event) => setPaymentMethod(event.target.value)}
                          className="mt-1 h-4 w-4 accent-emerald-700"
                          disabled={paymentProcessing}
                        />
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">{option.label}</p>
                          <p className="text-sm leading-6 text-slate-600">{option.note}</p>
                          {option.value === 'INTERAC_E_TRANSFER' ? (
                            <p className="text-sm leading-6 text-slate-700">
                              Processing fee: <span className="font-semibold text-slate-900">CAD 0.00</span>. Total charge: <span className="font-semibold text-slate-900">CAD {((createdOrder?.totalAmount || cartSummary.totalAmount) / 100).toFixed(2)}</span>.
                            </p>
                          ) : null}
                          {option.value === 'STRIPE_CARD' ? (
                            <p className="text-sm leading-6 text-slate-700">
                              Processing fee: <span className="font-semibold text-slate-900">CAD {(stripeProcessingFeePreview / 100).toFixed(2)}</span>. Total charge: <span className="font-semibold text-slate-900">CAD {(stripeTotalPreview / 100).toFixed(2)}</span>.
                            </p>
                          ) : null}
                          {option.value === 'STRIPE_CARD' && !stripeConfigured ? (
                            <p className="text-sm leading-6 text-amber-700">Stripe demo mode is active until `VITE_STRIPE_PUBLISHABLE_KEY` is added.</p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {isStripePayment && stripeConfigured ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <CardElement options={CARD_STYLE} />
                  </div>
                ) : null}

                <button
                  type="button"
                  className={`${ui.buttonPrimary} w-fit min-w-[220px] ${paymentProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
                  onClick={handleContinueToPayment}
                  disabled={paymentProcessing}
                >
                  {paymentProcessing ? 'Processing...' : paymentMethod === 'INTERAC_E_TRANSFER' ? 'Continue with Interac' : 'Continue with Stripe'}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-emerald-950">Payment</h3>
                  <p className="text-sm leading-6 text-slate-700">Interac e-Transfer</p>
                  <p className="text-sm leading-6 text-slate-700">
                    Send Interac e-Transfer to: <span className="font-semibold text-slate-900">{manualTransferEmail}</span> and receive confirmation within 6 hours.
                  </p>
                  <p className="text-sm leading-6 text-slate-700">
                    Use your Order ID <span className="font-semibold text-slate-900">{formatOrderReferenceDisplay(manualOrder.orderReference, manualOrder.createdAt, { firstName, lastName })}</span> for this transfer as narration.
                  </p>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${isManualTransferCountdownExpired ? 'border-amber-200 bg-amber-50 text-amber-800' : manualTransferRemainingSeconds <= 120 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  {isManualTransferCountdownActive
                    ? `Please complete your bank transfer and confirm within ${formatCountdown(manualTransferRemainingSeconds)}.`
                    : 'The 10-minute prompt window has ended, but you can still confirm once your transfer is sent.'}
                </div>
                <div className={ui.fieldWrap}>
                  <label className={ui.label}>Upload transfer screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    className={ui.input}
                    onChange={handleManualTransferProofChange}
                  />
                  {manualTransferProofName ? (
                    <p className="pt-1 text-xs leading-5 text-slate-500">Selected proof: {manualTransferProofName}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${ui.buttonPrimary} w-fit min-w-[220px] ${confirmingManualTransfer ? 'cursor-not-allowed opacity-60' : ''}`}
                  onClick={handleConfirmManualTransfer}
                  disabled={confirmingManualTransfer || !manualTransferProofFile}
                >
                  {confirmingManualTransfer ? 'Uploading receipt...' : 'I have transferred the money'}
                </button>
                {manualTransferFeedback ? <p className={ui.note}>{manualTransferFeedback}</p> : null}
                {manualTransferError ? <p className={ui.error}>{manualTransferError}</p> : null}
              </div>
            )}

            {paymentError ? <p className={`${ui.error} mt-4`}>{paymentError}</p> : null}
          </section>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-[1160px] gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Your Cart</h1>
          <p className="text-sm leading-6 text-slate-600">
            New buyers need to provide their details before creating an order.
          </p>
        </div>

        <section className={`${ui.section} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-emerald-950">Returning Buyer?</h2>
            <button
              type="button"
              className={ui.buttonGhost}
              onClick={() => {
                resetBuyerFormForNewEntry();
              }}
            >
              New Buyer
            </button>
          </div>
          <CustomerSearch
            onSelect={(customer) => {
              setTitle(customer.title || 'Mr');
              setFirstName(customer.firstName || '');
              setLastName(customer.lastName || '');
              setEmail(customer.email || '');
              setPhone(customer.phone || '');
              setAddress(customer.address || '');
              setCity(customer.city || '');
              setProvince(customer.province || '');
              setPostalCode(customer.postalCode || '');
              setRetrievedCustomerEmail(customer.email || '');
              setNewBuyerMode(false);
              setEmailConflictBuyer(null);
              setShowBuyerDetails(false);
            }}
          />
          {isExistingBuyerFlow ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-950">
                  {title} {firstName} {lastName}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {email} · {phone || 'No phone'}
                </p>
              </div>
              <button type="button" className={ui.buttonGhost} onClick={() => setShowBuyerDetails(true)}>
                Edit details
              </button>
            </div>
          ) : null}
          {newBuyerMode && emailConflictBuyer ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  Existing buyer found for {emailConflictBuyer.email}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  {emailConflictBuyer.title || 'Mr'} {emailConflictBuyer.firstName || ''} {emailConflictBuyer.lastName || ''}
                  {emailConflictBuyer.phone ? ` · ${emailConflictBuyer.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                className={ui.buttonGhost}
                onClick={() => {
                  setTitle(emailConflictBuyer.title || 'Mr');
                  setFirstName(emailConflictBuyer.firstName || '');
                  setLastName(emailConflictBuyer.lastName || '');
                  setEmail(emailConflictBuyer.email || '');
                  setPhone(emailConflictBuyer.phone || '');
                  setAddress(emailConflictBuyer.address || '');
                  setCity(emailConflictBuyer.city || '');
                  setProvince(emailConflictBuyer.province || '');
                  setPostalCode(emailConflictBuyer.postalCode || '');
                  setRetrievedCustomerEmail(emailConflictBuyer.email || '');
                  setNewBuyerMode(false);
                  setEmailConflictBuyer(null);
                  setShowBuyerDetails(false);
                  setDetailsStatus('');
                }}
              >
                Use saved buyer
              </button>
            </div>
          ) : null}
        </section>

        {showBuyerDetails ? (
          <section className={`${ui.section} space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-emerald-950">Buyer details</h2>
              <button type="button" className={ui.buttonGhost} onClick={handleSaveDetails} disabled={savingDetails}>
                {savingDetails ? 'Saving...' : saveDetailsLabel}
              </button>
            </div>
            {!isExistingBuyerFlow ? <p className="text-sm leading-6 text-slate-600">For new buyers click Save to store your details</p> : null}
            {isExistingBuyerFlow ? <p className="text-sm leading-6 text-slate-600">Name and email are locked for existing buyers. You can update phone and address details only.</p> : null}
            <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Title</label>
                <select className={ui.select} value={title} onChange={(event) => setTitle(event.target.value)} disabled={nameAndEmailLocked}>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                </select>
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>First name</label>
                <input className={ui.input} required value={firstName} onChange={(event) => setFirstName(event.target.value)} disabled={nameAndEmailLocked} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Last name</label>
                <input className={ui.input} required value={lastName} onChange={(event) => setLastName(event.target.value)} disabled={nameAndEmailLocked} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Email</label>
                <input className={ui.input} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={nameAndEmailLocked} />
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Phone</label>
                <input className={ui.input} autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
            </div>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Address</label>
              <input
                className={ui.input}
                required
                autoComplete="street-address"
                placeholder="Start typing and choose your address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
              {addressLookupStatus ? <p className="pt-1 text-xs leading-5 text-slate-500">{addressLookupStatus}</p> : null}
              {addressSuggestions.length > 0 ? (
                <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {addressSuggestions.map((suggestion) => (
                    <li key={suggestion.id} className="border-b border-slate-200 last:border-b-0">
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        onClick={() => {
                          const resolved = parseMapboxContext(suggestion.context, suggestion);
                          const selectedAddress = resolved.address || suggestion.place_name || '';
                          selectedAddressRef.current = selectedAddress.trim();
                          setAddress(selectedAddress);
                          if (resolved.province) {
                            setProvince(resolved.province);
                          }
                          if (resolved.city) {
                            setCity(resolved.city);
                          }
                          if (resolved.postalCode) {
                            setPostalCode(resolved.postalCode.toUpperCase());
                          }
                          setAddressSuggestions([]);
                          setAddressLookupStatus('');
                        }}
                      >
                        <span className="block font-medium text-slate-900">{suggestion.place_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Province</label>
                <input
                  className={ui.input}
                  required
                  autoComplete="address-level1"
                  placeholder="Province"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  list="province-options"
                />
                <datalist id="province-options">
                  {PROVINCE_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>City</label>
                <input
                  className={ui.input}
                  required
                  autoComplete="address-level2"
                  placeholder="City"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  list={province ? `city-options-${province.replace(/\s+/g, '-').toLowerCase()}` : undefined}
                />
                {province ? (
                  <datalist id={`city-options-${province.replace(/\s+/g, '-').toLowerCase()}`}>
                    {(PROVINCE_CITY_OPTIONS[province] || []).map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                ) : null}
              </div>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Postal code</label>
                <input
                  className={ui.input}
                  required
                  autoComplete="postal-code"
                  placeholder="A1A 1A1"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value.toUpperCase())}
                />
              </div>
            </div>
            {detailsStatus ? <p className={detailsStatus.toLowerCase().includes('unable') ? ui.error : ui.note}>{detailsStatus}</p> : null}
          </section>
        ) : null}

        <section className={`${ui.section} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-emerald-950">Cart items</h2>
            <p className="text-sm font-medium text-slate-500">
              {cartSummary.totalQuantity} item{cartSummary.totalQuantity === 1 ? '' : 's'}
            </p>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            If these items do not arrive at the same time, separate delivery applies for any outstanding item.
          </p>
          {loading ? <p className={ui.note}>Loading your cart...</p> : null}
          {loadError ? <p className={ui.error}>{loadError}</p> : null}
          {!loading && !loadError && cartLines.length === 0 ? <p className={ui.note}>Your cart is empty. Go back to active products and add quantities first.</p> : null}
          {cartLines.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Pickup Option</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={`rounded-xl border px-3 py-2.5 ${fulfillmentMethod === 'PICKUP' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'} ${hasCreatedOrder ? 'opacity-80' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="cart-fulfillment-method"
                      value="PICKUP"
                      checked={fulfillmentMethod === 'PICKUP'}
                      onChange={() => setFulfillmentMethod('PICKUP')}
                      className="h-4 w-4 accent-emerald-700"
                      disabled={hasCreatedOrder}
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Pick up</p>
                      <p className="text-xs leading-5 text-slate-500">Apply pickup to all items in this cart.</p>
                    </div>
                  </div>
                </label>
                <label className={`rounded-xl border px-3 py-2.5 ${fulfillmentMethod === 'DELIVERY' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'} ${!cartAllowsDelivery || hasCreatedOrder ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="cart-fulfillment-method"
                      value="DELIVERY"
                      checked={fulfillmentMethod === 'DELIVERY'}
                      onChange={() => setFulfillmentMethod('DELIVERY')}
                      className="h-4 w-4 accent-emerald-700"
                      disabled={!cartAllowsDelivery || hasCreatedOrder}
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Delivery</p>
                      <p className="text-xs leading-5 text-slate-500">
                        {cartAllowsDelivery ? 'Apply delivery to all items in this cart.' : 'Delivery is unavailable until every cart item supports delivery.'}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ) : null}
          <div className="space-y-3">
            {cartLines.map((line) => {
              const lineTotal = line.quantity * line.pricePerUnit;

              return (
                <article key={line.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.9fr)]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-base font-bold text-emerald-950">{line.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          CAD {(line.pricePerUnit / 100).toFixed(2)} / unit
                        </span>
                      </div>
                      {line.description ? <p className="text-sm leading-6 text-slate-600">Description: {line.description}</p> : null}
                      {line.pickupInstructions ? <p className="text-sm leading-6 text-slate-600">Location: {line.pickupInstructions}</p> : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr] xl:grid-cols-1">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <span className="text-sm font-semibold text-slate-700">Quantity</span>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-lg font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => updateCartLineQuantity(line, line.quantity - 1)}
                            disabled={hasCreatedOrder}
                          >
                            -
                          </button>
                          <span className="min-w-[2ch] text-center text-base font-bold text-emerald-950">{line.quantity}</span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-lg font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => updateCartLineQuantity(line, line.quantity + 1)}
                            disabled={hasCreatedOrder}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                        <span className="text-sm font-semibold text-emerald-900">Line total</span>
                        <span className="text-base font-bold text-emerald-950">CAD {(lineTotal / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {!hasCreatedOrder ? (
          <button
            type="submit"
            className={`${ui.buttonPrimary} w-fit min-w-[180px] ${loading || cartLines.length === 0 || !buyerDetailsReady ? 'cursor-not-allowed opacity-60' : ''}`}
            disabled={loading || cartLines.length === 0 || !buyerDetailsReady}
          >
            Create order
          </button>
        ) : null}

        {hasCreatedOrder ? (
          <section className={`${ui.section} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-emerald-950">Payment method</h2>
              <p className="text-sm leading-6 text-slate-600">
                {manualOrder
                  ? 'Your payment steps are ready. Open the payment menu to upload proof or confirm your transfer.'
                  : 'Your order is ready. Open the payment menu to choose Interac or Stripe. Please note that E-transfer is preferred. Credit card payments are available through Stripe. Kindly note that a small processing fee applies to card transactions.'}
              </p>
            </div>
            <button type="button" className={ui.buttonPrimary} onClick={() => setPaymentModalOpen(true)}>
              {manualOrder ? 'Open payment' : 'Choose payment'}
            </button>
          </section>
        ) : null}

        {status ? <p className={ui.note}>{status}</p> : null}
        {paymentError ? <p className={ui.error}>{paymentError}</p> : null}
      </section>

      <aside className={`${ui.card} ${ui.glass} space-y-4 self-start`}>
        <h2 className="text-xl font-bold tracking-tight text-emerald-950">Order summary</h2>
        {cartLines.length === 0 ? (
          <p className="text-sm leading-6 text-slate-600">Add products from the landing page to build your cart.</p>
        ) : (
          <div className="space-y-3">
            {cartLines.map((line) => (
              <div key={line.id} className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{line.name}</p>
                {line.description ? <p className="text-sm leading-6 text-slate-600">Description: {line.description}</p> : null}
                <p className="text-sm leading-6 text-slate-600">Quantity: {line.quantity}</p>
                <p className="text-sm leading-6 text-slate-600">Amount: CAD {((line.quantity * line.pricePerUnit) / 100).toFixed(2)}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-sm leading-6 text-slate-600">
                Pickup Option: <span className="font-semibold text-slate-900">{fulfillmentMethod === 'DELIVERY' ? 'Delivery' : 'Pick up'}</span>
              </p>
            </div>
            {cartSummary.deliveryGroups.length > 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-950">Shared delivery charges</p>
                {cartSummary.deliveryGroups.map((group) => (
                  <p key={`${group.item.id}-${group.quantity}`} className="text-sm leading-6 text-slate-700">
                    {group.quantity} delivery item{group.quantity === 1 ? '' : 's'} matched one delivery rate: CAD {(calculateDeliveryFeeForGroup(group.item, group.quantity) / 100).toFixed(2)}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
              <p className="flex items-center justify-between gap-3">
                <span>Subtotal</span>
                <span className="font-semibold">CAD {(cartSummary.subtotal / 100).toFixed(2)}</span>
              </p>
              <p className="mt-2 flex items-center justify-between gap-3">
                <span>Delivery</span>
                <span className="font-semibold">CAD {(cartSummary.groupedDeliveryFee / 100).toFixed(2)}</span>
              </p>
              <p className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-base font-bold text-emerald-950">
                <span>Total</span>
                <span>CAD {(cartSummary.totalAmount / 100).toFixed(2)}</span>
              </p>
            </div>
            {createdOrder ? (
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
                <p>
                  Order reference: <span className="font-semibold text-slate-900">{formatOrderReferenceDisplay(createdOrder.orderReference, createdOrder.createdAt, { firstName, lastName })}</span>
                </p>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </form>
    </>
  );
}
