import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

type Props = {
  clientSecret: string;
  error?: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  onError: (msg: string) => void;
};

function StripePaymentForm({ onSuccess, onError }: { onSuccess: Props['onSuccess']; onError: Props['onError'] }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = React.useState(false);

  const submit = async () => {
    if (!stripe || !elements) return;
    setPaying(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed');
      setPaying(false);
      return;
    }

    await onSuccess();
  };

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement />
      <div className="capsule-wrap w-full">
        <button
          onClick={submit}
          disabled={paying}
          className="capsule-btn capsule-btn-sm w-full"
          style={{ color: paying ? '#4b5563' : '#9ca3af', cursor: paying ? 'wait' : 'pointer' }}
        >
          {paying ? '◈ Processing…' : 'Pay €9.99 →'}
        </button>
      </div>
    </div>
  );
}

const StripeCheckoutModal: React.FC<Props> = ({ clientSecret, error, onClose, onSuccess, onError }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 flex flex-col gap-5"
        style={{
          background: 'rgba(5,5,8,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(232,121,249,0.3)',
          boxShadow: '0 0 60px rgba(232,121,249,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black tracking-wide text-center text-white">Upgrade to Premium</h3>
        <p className="text-sm text-gray-400 text-center">Unlimited generations · HD downloads · SVG export</p>
        <p className="text-[11px] text-gray-500 text-center -mt-2">Secure Stripe checkout · one-time payment</p>

        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
          <StripePaymentForm onSuccess={onSuccess} onError={onError} />
        </Elements>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-600 hover:text-gray-400 text-lg">✕</button>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
