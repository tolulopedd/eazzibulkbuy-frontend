import { useEffect, useMemo, useState } from 'react';
import { ui } from '../ui/classes';
import { AdminPagination, AdminStatusBadge, AdminTableEmpty } from './AdminTablePrimitives';

const SALES_ITEM_OPTIONS = ['Tomatoes', 'Red Habanero', 'Orange Habanero Pepper', 'Chocolate Habanero', 'Green Bell Pepper', 'Crimson Pepper', 'Cayenne Pepper', 'Scorpion Pepper', 'Shepherd Pepper', 'Yam', 'Onion', 'Red Bell Pepper', 'Sweet potatoes', 'Ghost Pepper'];

function formatCurrency(cents) {
  return `CAD ${((cents || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatLabel(value) {
  if (!value) return 'Unknown';
  if (value === 'PENDING_PAYMENT') return 'Incomplete Order';
  if (value === 'PENDING_REVIEW') return 'Pending Review';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStatusTone(status) {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING_REVIEW') return 'warning';
  if (status === 'PENDING_PAYMENT') return 'danger';
  return 'neutral';
}

function parseDollarInputToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

function sanitizeCurrencyInput(value) {
  const sanitized = String(value || '').replace(/[^0-9.]/g, '');
  const [whole = '', ...fractionParts] = sanitized.split('.');
  const fraction = fractionParts.join('').slice(0, 2);
  if (!sanitized.includes('.')) {
    return whole;
  }
  return `${whole}.${fraction}`;
}

function MoneyInput({ value, onChange, placeholder = '0.00' }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
        CAD
      </span>
      <input
        className={`${ui.input} pl-[3.9rem]`}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function getEffectiveDeliveryUnits(salesItem, quantity) {
  if (salesItem?.saleType !== 'BUNDLE_DISCOUNTED_SALE') {
    return quantity;
  }

  const bundleItems = Array.isArray(salesItem?.bundleItemsJson) ? salesItem.bundleItemsJson : [];
  const unitsPerBundle = bundleItems.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0);
  return quantity * Math.max(1, unitsPerBundle);
}

function calculateDeliveryFee(lines, fulfillmentMethod, salesItemsById) {
  if (fulfillmentMethod !== 'DELIVERY') {
    return 0;
  }

  const groupedQuantities = new Map();

  for (const line of lines) {
    if (line.sourceType !== 'SALES_EVENT') {
      return 0;
    }

    const salesItem = salesItemsById.get(line.salesItemId);
    if (!salesItem?.deliveryEnabled) {
      return 0;
    }

    const groupKey = [
      salesItem.deliveryBaseRangeMax || 0,
      salesItem.deliveryBasePrice || 0,
      salesItem.deliveryAdditionalUnitPrice || 0,
    ].join(':');

    const current = groupedQuantities.get(groupKey) || { quantity: 0, salesItem };
    groupedQuantities.set(groupKey, {
      quantity: current.quantity + getEffectiveDeliveryUnits(salesItem, Math.max(1, Number(line.quantity) || 1)),
      salesItem,
    });
  }

  let totalFee = 0;
  for (const group of groupedQuantities.values()) {
    const baseRangeMax = Math.max(1, group.salesItem.deliveryBaseRangeMax || 10);
    const basePrice = group.salesItem.deliveryBasePrice || 0;
    const additionalUnitPrice = group.salesItem.deliveryAdditionalUnitPrice || 0;
    totalFee += group.quantity <= baseRangeMax
      ? basePrice
      : basePrice + (group.quantity - baseRangeMax) * additionalUnitPrice;
  }

  return totalFee;
}

function createSalesEventLine() {
  return {
    id: crypto.randomUUID(),
    sourceType: 'SALES_EVENT',
    salesItemId: '',
    customName: '',
    customDescription: '',
    customLocation: 'Winnipeg Manitoba',
    quantity: '1',
    discountedUnitPrice: '',
  };
}

function createCustomLine() {
  return {
    id: crypto.randomUUID(),
    sourceType: 'CUSTOM',
    salesItemId: '',
    customName: '',
    customDescription: '',
    customLocation: 'Winnipeg Manitoba',
    quantity: '1',
    discountedUnitPrice: '',
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/;

export default function AdminDiscountOrdersPanel({
  onLoadCustomers,
  onCreateCustomer,
  onLoadSalesItems,
  onLoadDiscountOrders,
  onCreateDiscountOrder,
  onCreateDiscountOrderUploadUrl,
}) {
  const [form, setForm] = useState({
    customerId: '',
    fulfillmentMethod: 'PICKUP',
    discountReason: '',
    items: [createSalesEventLine()],
  });
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    title: 'Mr',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: 'Manitoba',
    postalCode: '',
  });
  const [salesItems, setSalesItems] = useState([]);
  const [discountOrders, setDiscountOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptName, setReceiptName] = useState('');

  const normalizedCustomerEmail = customerEmail.trim().toLowerCase();
  const selectedCustomer = useMemo(
    () => customerResults.find((customer) => customer.id === form.customerId) || null,
    [customerResults, form.customerId],
  );
  const salesItemsById = useMemo(
    () => new Map(salesItems.map((item) => [item.id, item])),
    [salesItems],
  );
  const hasCustomItems = useMemo(
    () => form.items.some((item) => item.sourceType === 'CUSTOM'),
    [form.items],
  );
  const customerFormReady = Boolean(
    customerForm.firstName.trim().length >= 2 &&
    customerForm.lastName.trim().length >= 2 &&
    EMAIL_REGEX.test(customerForm.email.trim().toLowerCase()) &&
    /^\d{10}$/.test(customerForm.phone.trim()) &&
    customerForm.address.trim().length >= 5 &&
    customerForm.city.trim().length >= 2 &&
    customerForm.province.trim().length >= 2 &&
    POSTAL_CODE_REGEX.test(customerForm.postalCode.trim().toUpperCase())
  );

  const normalizedItems = useMemo(() => form.items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const discountedUnitPriceCents = parseDollarInputToCents(item.discountedUnitPrice);
    const salesItem = item.sourceType === 'SALES_EVENT' ? salesItemsById.get(item.salesItemId) : null;
    const currentUnitPrice = salesItem?.pricePerUnit || 0;
    const valid = item.sourceType === 'SALES_EVENT'
      ? Boolean(salesItem && discountedUnitPriceCents > 0 && discountedUnitPriceCents < currentUnitPrice)
      : Boolean(item.customName.trim().length >= 2 && discountedUnitPriceCents > 0);

    return {
      ...item,
      quantity,
      discountedUnitPriceCents,
      currentUnitPrice,
      salesItem,
      valid,
      lineTotal: discountedUnitPriceCents * quantity,
    };
  }), [form.items, salesItemsById]);

  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFeeCents = calculateDeliveryFee(normalizedItems, form.fulfillmentMethod, salesItemsById);
  const totalCents = subtotalCents + deliveryFeeCents;
  const formReady = Boolean(
    form.customerId &&
    normalizedItems.length &&
    normalizedItems.every((item) => item.valid) &&
    receiptFile &&
    form.discountReason.trim().length >= 3 &&
    (form.fulfillmentMethod === 'PICKUP' || !hasCustomItems)
  );

  useEffect(() => {
    let mounted = true;

    async function loadBootstrap() {
      try {
        setLoadingSales(true);
        const response = await onLoadSalesItems({
          status: 'ACTIVE',
          sortBy: 'closingDate',
          sortOrder: 'asc',
          page: 1,
          limit: 100,
        });
        const items = Array.isArray(response) ? response : response.items || [];
        const liveItems = items.filter((item) => item.status === 'ACTIVE' && new Date(item.closingDate) > new Date());
        if (mounted) {
          setSalesItems(liveItems);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load active sales events.');
        }
      } finally {
        if (mounted) {
          setLoadingSales(false);
        }
      }
    }

    loadBootstrap();
    return () => {
      mounted = false;
    };
  }, [onLoadSalesItems]);

  useEffect(() => {
    loadDiscountOrders();
  }, []);

  useEffect(() => {
    if (!EMAIL_REGEX.test(normalizedCustomerEmail)) {
      setCustomerResults((current) => current.filter((entry) => entry.id === form.customerId));
      setShowCustomerForm(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoadingCustomers(true);
        const response = await onLoadCustomers({
          q: normalizedCustomerEmail,
          page: 1,
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        if (active) {
          const items = response.items || [];
          setCustomerResults(items);
          const exactMatch = items.find((item) => item.email?.toLowerCase() === normalizedCustomerEmail);

          if (exactMatch) {
            setForm((current) => ({ ...current, customerId: exactMatch.id }));
            setShowCustomerForm(false);
            setCustomerForm((current) => ({ ...current, email: exactMatch.email || normalizedCustomerEmail }));
          } else {
            setForm((current) => ({ ...current, customerId: '' }));
            setShowCustomerForm(true);
            setCustomerForm((current) => ({ ...current, email: normalizedCustomerEmail }));
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load customers right now.');
        }
      } finally {
        if (active) {
          setLoadingCustomers(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalizedCustomerEmail, form.customerId, onLoadCustomers]);

  async function loadDiscountOrders(page = 1) {
    try {
      setLoadingOrders(true);
      const response = await onLoadDiscountOrders({ page, limit: 20, sortOrder: 'desc' });
      setDiscountOrders(response.items || []);
      setMeta({
        page: response.page || page,
        totalPages: response.totalPages || 1,
        total: response.total || 0,
        limit: response.limit || 20,
      });
    } catch (err) {
      setError(err.message || 'Unable to load discount orders.');
    } finally {
      setLoadingOrders(false);
    }
  }

  function resetForm() {
    setForm({
      customerId: '',
      fulfillmentMethod: 'PICKUP',
      discountReason: '',
      items: [createSalesEventLine()],
    });
    setCustomerEmail('');
    setCustomerResults([]);
    setShowCustomerForm(false);
    setCustomerForm({
      title: 'Mr',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: 'Manitoba',
      postalCode: '',
    });
    setReceiptFile(null);
    setReceiptName('');
  }

  async function handleCreateCustomer() {
    if (!customerFormReady) {
      return;
    }

    setCreatingCustomer(true);
    setError('');
    setStatus('');
    try {
      const result = await onCreateCustomer({
        title: customerForm.title,
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim(),
        email: customerForm.email.trim().toLowerCase(),
        phone: customerForm.phone.trim(),
        address: customerForm.address.trim(),
        city: customerForm.city.trim(),
        province: customerForm.province.trim(),
        postalCode: customerForm.postalCode.trim().toUpperCase(),
      });

      const createdCustomer = result.customer;
      setCustomerResults([createdCustomer]);
      setCustomerEmail(createdCustomer.email || customerForm.email.trim().toLowerCase());
      setForm((current) => ({ ...current, customerId: createdCustomer.id }));
      setShowCustomerForm(false);
      setStatus(result.message || 'Customer created successfully.');
    } catch (err) {
      setError(err.message || 'Unable to create customer right now.');
    } finally {
      setCreatingCustomer(false);
    }
  }

  function updateLine(lineId, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== lineId) {
          return item;
        }

        if (field === 'sourceType') {
          return value === 'CUSTOM' ? { ...createCustomLine(), id: lineId } : { ...createSalesEventLine(), id: lineId };
        }

        if (field === 'salesItemId') {
          const selected = salesItemsById.get(value);
          return {
            ...item,
            salesItemId: value,
            discountedUnitPrice: selected ? Math.max(0.01, (selected.pricePerUnit - 100) / 100).toFixed(2) : '',
          };
        }

        if (field === 'discountedUnitPrice') {
          return {
            ...item,
            discountedUnitPrice: sanitizeCurrencyInput(value),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    }));
  }

  function addSalesEventLine() {
    setForm((current) => ({ ...current, items: [...current.items, createSalesEventLine()] }));
  }

  function addCustomLine() {
    setForm((current) => ({
      ...current,
      fulfillmentMethod: 'PICKUP',
      items: [...current.items, createCustomLine()],
    }));
  }

  function removeLine(lineId) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? [createSalesEventLine()] : current.items.filter((item) => item.id !== lineId),
    }));
  }

  async function handleCreateDiscountOrder(event) {
    event.preventDefault();
    if (!formReady) {
      if (!receiptFile) {
        setError('Upload the Interac receipt before creating this discount order.');
      }
      return;
    }

    setCreating(true);
    setStatus('');
    setError('');

    try {
      let transferProof;

      if (receiptFile) {
        const uploadTarget = await onCreateDiscountOrderUploadUrl({
          fileName: receiptFile.name,
          contentType: receiptFile.type,
          sizeBytes: receiptFile.size,
        });

        const uploadResponse = await fetch(uploadTarget.uploadUrl, {
          method: 'PUT',
          body: receiptFile,
        });

        if (!uploadResponse.ok) {
          throw new Error('Unable to upload the Interac receipt right now.');
        }

        transferProof = {
          fileName: receiptFile.name,
          contentType: receiptFile.type,
          sizeBytes: receiptFile.size,
          objectKey: uploadTarget.objectKey,
        };
      }

      const created = await onCreateDiscountOrder({
        customerId: form.customerId,
        fulfillmentMethod: form.fulfillmentMethod,
        discountReason: form.discountReason.trim(),
        transferProof,
        items: normalizedItems.map((item) => ({
          sourceType: item.sourceType,
          salesItemId: item.sourceType === 'SALES_EVENT' ? item.salesItemId : undefined,
          customName: item.sourceType === 'CUSTOM' ? item.customName.trim() : undefined,
          customDescription: item.sourceType === 'CUSTOM' ? item.customDescription.trim() : undefined,
          customLocation: item.sourceType === 'CUSTOM' ? item.customLocation.trim() : undefined,
          quantity: item.quantity,
          discountedUnitPrice: item.discountedUnitPriceCents,
        })),
      });

      setStatus(created.message || 'Discount order created and sent to pending review.');

      resetForm();
      await loadDiscountOrders(1);
    } catch (err) {
      setError(err.message || 'Unable to create discount order right now.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-5">
      <section className={`${ui.card} space-y-5`}>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Discount Orders</h1>
          <p className={ui.note}>Create a special-rate order for buyer(s)</p>
        </div>

        <form className="space-y-4" onSubmit={handleCreateDiscountOrder}>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={`${ui.section} space-y-4`}>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Customer email</label>
                <input
                  className={ui.input}
                  type="email"
                  value={customerEmail}
                  onChange={(event) => {
                    setCustomerEmail(event.target.value);
                    setForm((current) => ({ ...current, customerId: '' }));
                    setStatus('');
                    setError('');
                  }}
                  placeholder="Enter customer email"
                />
                {loadingCustomers ? <p className={ui.note}>Loading customers...</p> : null}
                {customerResults.length && !form.customerId ? (
                  <div className="overflow-hidden rounded-2xl border border-[#e4e6dc] bg-white">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="flex w-full items-center justify-between border-b border-[#eef0e8] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[#fbfbf8]"
                        onClick={() => {
                          setForm((current) => ({ ...current, customerId: customer.id }));
                          setCustomerEmail(customer.email || '');
                          setShowCustomerForm(false);
                        }}
                      >
                        <span>
                          <span className="block font-semibold text-[#171a16]">{customer.name}</span>
                          <span className="block text-[#6f756b]">{customer.email}</span>
                        </span>
                        <span className="text-xs font-semibold text-[#139978]">Select</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={`${ui.metricCard} min-h-[96px]`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected customer</p>
                <p className="text-sm font-semibold text-slate-900">{selectedCustomer?.name || 'No customer selected'}</p>
                <p className="text-sm text-slate-600">{selectedCustomer?.email || 'Enter an existing customer email or create a new customer below.'}</p>
              </div>

              {showCustomerForm ? (
                <div className={`${ui.section} space-y-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold tracking-tight text-emerald-950">Create customer</h2>
                    <button
                      type="button"
                      className={ui.buttonPrimary}
                      disabled={!customerFormReady || creatingCustomer}
                      onClick={handleCreateCustomer}
                    >
                      {creatingCustomer ? 'Saving...' : customerFormReady ? 'Save customer' : 'Fill details & save'}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Title</label>
                      <select className={ui.select} value={customerForm.title} onChange={(event) => setCustomerForm((current) => ({ ...current, title: event.target.value }))}>
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Miss">Miss</option>
                      </select>
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>First name</label>
                      <input className={ui.input} value={customerForm.firstName} onChange={(event) => setCustomerForm((current) => ({ ...current, firstName: event.target.value }))} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Last name</label>
                      <input className={ui.input} value={customerForm.lastName} onChange={(event) => setCustomerForm((current) => ({ ...current, lastName: event.target.value }))} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Email</label>
                      <input className={ui.input} type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Phone</label>
                      <input className={ui.input} inputMode="numeric" maxLength={10} value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                    </div>
                  </div>

                  <div className={ui.fieldWrap}>
                    <label className={ui.label}>Address</label>
                    <input className={ui.input} value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>City</label>
                      <input className={ui.input} value={customerForm.city} onChange={(event) => setCustomerForm((current) => ({ ...current, city: event.target.value }))} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Province</label>
                      <input className={ui.input} value={customerForm.province} onChange={(event) => setCustomerForm((current) => ({ ...current, province: event.target.value }))} />
                    </div>
                    <div className={ui.fieldWrap}>
                      <label className={ui.label}>Postal code</label>
                      <input className={ui.input} value={customerForm.postalCode} onChange={(event) => setCustomerForm((current) => ({ ...current, postalCode: event.target.value.toUpperCase() }))} />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button type="button" className={ui.buttonPrimary} onClick={addSalesEventLine}>Add sales event item</button>
                <button type="button" className={ui.buttonGhost} onClick={addCustomLine}>Add custom item</button>
              </div>

              <div className="space-y-4">
                {normalizedItems.map((item, index) => {
                  const selectedSalesItem = item.sourceType === 'SALES_EVENT' ? salesItemsById.get(item.salesItemId) : null;
                  const lineDiscount = item.sourceType === 'SALES_EVENT' && item.discountedUnitPriceCents > 0
                    ? Math.max(0, item.currentUnitPrice - item.discountedUnitPriceCents)
                    : 0;

                  return (
                    <div key={item.id} className="rounded-[26px] border border-[#dfe6d7] bg-[#fcfdf9] p-4 shadow-[0_14px_32px_rgba(18,52,45,0.06)]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">Item {index + 1}</p>
                          <p className="text-xs text-slate-500">{item.sourceType === 'SALES_EVENT' ? 'Discount from an active sales event' : 'Create a discounted custom item'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select className={ui.select} value={item.sourceType} onChange={(event) => updateLine(item.id, 'sourceType', event.target.value)}>
                            <option value="SALES_EVENT">Sales event</option>
                            <option value="CUSTOM">Custom item</option>
                          </select>
                          <button type="button" className={ui.buttonGhost} onClick={() => removeLine(item.id)} disabled={form.items.length === 1}>Remove</button>
                        </div>
                      </div>

                      {item.sourceType === 'SALES_EVENT' ? (
                        <div className="space-y-4">
                          <div className={ui.fieldWrap}>
                            <label className={ui.label}>Sales event item</label>
                            <select
                              className={ui.select}
                              value={item.salesItemId}
                              onChange={(event) => updateLine(item.id, 'salesItemId', event.target.value)}
                              disabled={loadingSales}
                            >
                              <option value="">Select sales event item</option>
                              {salesItems.map((salesItem) => (
                                <option key={salesItem.id} value={salesItem.id}>
                                  {salesItem.batchNumber} · {salesItem.name} · {formatCurrency(salesItem.pricePerUnit)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Current unit price</label>
                              <input className={ui.input} disabled value={selectedSalesItem ? formatCurrency(selectedSalesItem.pricePerUnit) : ''} />
                            </div>
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Discounted unit price</label>
                              <MoneyInput
                                value={item.discountedUnitPrice}
                                onChange={(event) => updateLine(item.id, 'discountedUnitPrice', event.target.value)}
                              />
                            </div>
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Quantity</label>
                              <input className={ui.input} type="number" min="1" value={item.quantity} onChange={(event) => updateLine(item.id, 'quantity', event.target.value)} />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className={ui.metricCard}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discount</p>
                              <p className="text-base font-semibold text-slate-900">{formatCurrency(lineDiscount)}</p>
                            </div>
                            <div className={ui.metricCard}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location</p>
                              <p className="text-sm font-semibold text-slate-900">{selectedSalesItem?.pickupInstructions || '—'}</p>
                            </div>
                            <div className={ui.metricCard}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line total</p>
                              <p className="text-base font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Item name</label>
                              <select className={ui.select} value={item.customName} onChange={(event) => updateLine(item.id, 'customName', event.target.value)}>
                                <option value="">Select item name</option>
                                {SALES_ITEM_OPTIONS.map((itemName) => (
                                  <option key={`${item.id}-${itemName}`} value={itemName}>
                                    {itemName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Location</label>
                              <input className={ui.input} value={item.customLocation} onChange={(event) => updateLine(item.id, 'customLocation', event.target.value)} placeholder="Winnipeg Manitoba" />
                            </div>
                          </div>

                          <div className={ui.fieldWrap}>
                            <label className={ui.label}>Description</label>
                            <textarea className={ui.textarea} rows={2} value={item.customDescription} onChange={(event) => updateLine(item.id, 'customDescription', event.target.value)} placeholder="Describe the custom item" />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Discounted unit price</label>
                              <MoneyInput
                                value={item.discountedUnitPrice}
                                onChange={(event) => updateLine(item.id, 'discountedUnitPrice', event.target.value)}
                              />
                            </div>
                            <div className={ui.fieldWrap}>
                              <label className={ui.label}>Quantity</label>
                              <input className={ui.input} type="number" min="1" value={item.quantity} onChange={(event) => updateLine(item.id, 'quantity', event.target.value)} />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className={ui.metricCard}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pickup only</p>
                              <p className="text-sm font-semibold text-slate-900">Custom discount items currently use pickup.</p>
                            </div>
                            <div className={ui.metricCard}>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line total</p>
                              <p className="text-base font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${ui.section} space-y-4`}>
              <div className={ui.fieldWrap}>
                <label className={ui.label}>Pickup option</label>
                <select
                  className={ui.select}
                  value={form.fulfillmentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, fulfillmentMethod: event.target.value }))}
                >
                  <option value="PICKUP">Pick up</option>
                  <option value="DELIVERY" disabled={hasCustomItems || normalizedItems.some((item) => item.sourceType === 'SALES_EVENT' && item.salesItem && !item.salesItem.deliveryEnabled)}>
                    Delivery
                  </option>
                </select>
                {hasCustomItems ? <p className={ui.note}>Custom items currently support pickup only.</p> : null}
              </div>

              <div className={ui.fieldWrap}>
                <label className={ui.label}>Reason for discount</label>
                <textarea
                  className={ui.textarea}
                  rows={3}
                  value={form.discountReason}
                  onChange={(event) => setForm((current) => ({ ...current, discountReason: event.target.value }))}
                  placeholder="Reason for the special rate"
                />
              </div>

              <div className={ui.fieldWrap}>
                <label className={ui.label}>Upload Interac receipt</label>
                <input
                  className={ui.input}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setReceiptFile(file || null);
                    setReceiptName(file?.name || '');
                  }}
                />
                {receiptName ? <p className={ui.note}>Selected receipt: {receiptName}</p> : <p className={ui.note}>Receipt proof is required before you can create this discount order.</p>}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className={ui.metricCard}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Items</p>
                  <p className="text-base font-semibold text-slate-900">{normalizedItems.length}</p>
                </div>
                <div className={ui.metricCard}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery fee</p>
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(deliveryFeeCents)}</p>
                </div>
                <div className={ui.metricCard}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order total</p>
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(totalCents)}</p>
                </div>
              </div>

              <div className={`${ui.metricCard} space-y-3`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order summary</p>
                <div className="space-y-2 text-sm text-slate-700">
                  {normalizedItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border-b border-[#e8ece4] pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-900">{item.sourceType === 'SALES_EVENT' ? (item.salesItem?.name || 'Select sales event item') : (item.customName || 'Custom item')}</p>
                        <p className="text-xs text-slate-500">
                          {item.sourceType === 'SALES_EVENT'
                            ? `${item.salesItem?.batchNumber || '—'} · Qty ${item.quantity}`
                            : `Custom item · Qty ${item.quantity}`}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {status ? <p className={ui.success}>{status}</p> : null}
          {error ? <p className={ui.error}>{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={ui.buttonGhost} onClick={resetForm} disabled={creating}>
              Clear
            </button>
            <button type="submit" className={ui.buttonPrimary} disabled={!formReady || creating}>
              {creating ? 'Creating...' : 'Save'}
            </button>
          </div>
        </form>
      </section>

      <section className={ui.tableWrap}>
        <div className="border-b border-[#ebece4] px-4 py-4">
          <h2 className="text-lg font-bold tracking-tight text-emerald-950">Recent Discount Orders</h2>
        </div>
        {loadingOrders ? (
          <div className="px-4 py-8 text-sm text-[#767c72]">Loading discount orders...</div>
        ) : !discountOrders.length ? (
          <AdminTableEmpty message="No discount orders created yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className={ui.table}>
                <thead className={ui.tableHeadRow}>
                  <tr>
                    <th className={ui.tableHeaderCell}>Order</th>
                    <th className={ui.tableHeaderCell}>Buyer</th>
                    <th className={ui.tableHeaderCell}>Items</th>
                    <th className={ui.tableHeaderCell}>Reason</th>
                    <th className={ui.tableHeaderCell}>Amount</th>
                    <th className={ui.tableHeaderCell}>Status</th>
                    <th className={ui.tableHeaderCell}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {discountOrders.map((order) => (
                    <tr key={order.id} className={ui.tableRow}>
                      <td className={ui.tableCell}>
                        <p className="font-semibold text-[#171a16]">{order.displayOrderReference}</p>
                        <p className="text-xs text-[#767c72]">{order.cartItems?.map((item) => item.batchNumber).filter(Boolean).join(', ') || '—'}</p>
                      </td>
                      <td className={ui.tableCell}>
                        <p className="font-semibold text-[#171a16]">{order.user?.name || 'Unknown buyer'}</p>
                        <p className="text-xs text-[#767c72]">{order.user?.email || '—'}</p>
                      </td>
                      <td className={ui.tableCell}>
                        <p className="font-semibold text-[#171a16]">
                          {order.cartItems?.map((item) => `${item.name} x${item.quantity}`).join(' + ') || '—'}
                        </p>
                        <p className="text-xs text-[#767c72]">{formatLabel(order.fulfillmentMethod)}</p>
                      </td>
                      <td className={ui.tableCell}>
                        <p className="font-medium text-[#171a16]">{order.discountMeta?.discountReason || '—'}</p>
                      </td>
                      <td className={ui.tableCell}>
                        <p className="font-semibold text-[#171a16]">{formatCurrency(order.totalAmount)}</p>
                        <p className="text-xs text-[#767c72]">Subtotal {formatCurrency(order.subtotal || 0)}</p>
                      </td>
                      <td className={ui.tableCell}>
                        <AdminStatusBadge value={formatLabel(order.paymentStatus)} tone={getStatusTone(order.paymentStatus)} />
                      </td>
                      <td className={ui.tableCell}>{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPrev={() => loadDiscountOrders(meta.page - 1)}
              onNext={() => loadDiscountOrders(meta.page + 1)}
            />
          </>
        )}
      </section>
    </section>
  );
}
