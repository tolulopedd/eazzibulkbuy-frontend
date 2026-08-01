import { useEffect, useRef, useState } from 'react';
import { searchCustomers } from '../api/customers';
import { ui } from '../ui/classes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerSearch({ value = '', onChange, onFound, onNotFound }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onFoundRef = useRef(onFound);
  const onNotFoundRef = useRef(onNotFound);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  useEffect(() => {
    onNotFoundRef.current = onNotFound;
  }, [onNotFound]);

  useEffect(() => {
    const trimmed = value.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmed)) {
      setLoading(false);
      setError('');
      onNotFoundRef.current?.(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const data = await searchCustomers(trimmed);
        const exactMatch = data.find((customer) => customer.email?.toLowerCase() === trimmed) || null;

        if (!active) {
          return;
        }

        if (exactMatch) {
          onFoundRef.current?.(exactMatch);
        } else {
          onNotFoundRef.current?.(trimmed);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to check buyer email right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="space-y-2.5">
      <div className={ui.fieldWrap}>
        <label className={ui.label}>Buyer&apos;s email</label>
        <input
          className={ui.input}
          type="email"
          autoComplete="email"
          value={value}
          onChange={(event) => {
            onChange?.(event.target.value);
            setError('');
          }}
          placeholder="Enter buyer email"
        />
      </div>

      {loading ? <p className={ui.note}>Checking buyer...</p> : null}
      {error ? <p className={ui.error}>{error}</p> : null}
    </div>
  );
}
