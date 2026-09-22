import { useMemo, useState } from 'react';
import { createCustomerFeedbackNote } from '../api/customers';
import { ui } from '../ui/classes';
import BrandLogo from './BrandLogo';

export default function CustomerFeedbackPage({ onBackHome }) {
  const initialEmail = useMemo(() => new URLSearchParams(window.location.search).get('email') || '', []);
  const [email, setEmail] = useState(initialEmail);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    setError('');
    try {
      const result = await createCustomerFeedbackNote({
        email,
        note,
      });
      setStatus(result.message || 'Your note has been submitted.');
      setNote('');
    } catch (err) {
      setError(err.message || 'Unable to submit your note. Please try again.');
    } finally {
      setLoading(false);
    }
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

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950">Send us a note</h1>
        </div>

        {status ? <p className={ui.success}>{status}</p> : null}
        {error ? <p className={ui.error}>{error}</p> : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className={ui.fieldWrap}>
            <label className={ui.label}>Email address</label>
            <input
              className={ui.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className={ui.fieldWrap}>
            <label className={ui.label}>Note</label>
            <textarea
              className={ui.textarea}
              rows={7}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Write your note or feedback"
              required
            />
          </div>

          <button type="submit" className={ui.buttonPrimary} disabled={loading || !email.trim() || !note.trim()}>
            {loading ? 'Submitting...' : 'Submit note'}
          </button>
        </form>
      </section>
    </div>
  );
}
