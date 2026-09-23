import { useMemo, useState } from 'react';
import { createCustomerFeedbackNote } from '../api/customers';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

export default function CustomerFeedbackPage({ onBackHome }) {
  const initialEmail = useMemo(() => new URLSearchParams(window.location.search).get('email') || '', []);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const wordCount = note.trim() ? note.trim().split(/\s+/).filter(Boolean).length : 0;
  const isOverWordLimit = wordCount > 150;

  async function handleSubmit(event) {
    event.preventDefault();
    if (isOverWordLimit) {
      setError('Note must not be more than 150 words.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createCustomerFeedbackNote({
        email: initialEmail,
        note,
      });
      setSent(true);
      setNote('');
    } catch (err) {
      setError(err.message || 'Unable to submit your note. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleNoteChange(event) {
    const nextValue = event.target.value;
    const words = nextValue.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 150) {
      setNote(nextValue);
      setError('');
      return;
    }

    setNote(words.slice(0, 150).join(' '));
    setError('You cannot type more than 150 words.');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col justify-center px-4 py-10">
      <section className={`${ui.card} space-y-6`}>
        <div className="flex items-center justify-between gap-4">
          <BrandLogo className="h-14 w-auto" />
          <button type="button" className={ui.buttonGhost} onClick={onBackHome}>
            Home
          </button>
        </div>

        <div className="space-y-2 pt-2">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Send us a note or feedback</h1>
        </div>

        {error ? <p className={ui.error}>{error}</p> : null}

        {sent ? (
          <div className="space-y-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-lg font-bold text-emerald-950">Your note has been successfully sent to EazziBulkBuy Team.</p>
            <button type="button" className={ui.buttonPrimary} onClick={onBackHome}>
              Close
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className={ui.fieldWrap}>
              <label className={ui.label}>Email address</label>
              <input
                className={`${ui.input} bg-slate-50 text-slate-700`}
                type="email"
                value={initialEmail}
                placeholder="Email address"
                readOnly
                required
              />
            </div>

            <div className={ui.fieldWrap}>
              <div className="flex items-center justify-between gap-3">
                <label className={ui.label}>Note</label>
                <span className={`text-sm font-semibold ${isOverWordLimit ? 'text-red-600' : 'text-slate-500'}`}>
                  {wordCount}/150 words
                </span>
              </div>
              <textarea
                className={ui.textarea}
                rows={7}
                value={note}
                onChange={handleNoteChange}
                placeholder="Write your note or feedback here - not more than 150 words."
                required
              />
            </div>

            <button type="submit" className={ui.buttonPrimary} disabled={loading || !initialEmail.trim() || !note.trim() || isOverWordLimit}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
