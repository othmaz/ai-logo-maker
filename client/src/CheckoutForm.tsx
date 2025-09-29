import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';

interface CheckoutFormProps {
  amount?: string;
}

const CheckoutForm = ({ amount = '€9.99' }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Price Display */}
      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-cyan-400 retro-mono mb-2">
          ONE TIME PAYMENT, UNLIMITED DOWNLOADS
        </div>
        <div className="text-white retro-body text-sm">
          &gt; PREMIUM UPGRADE - UNLIMITED GENERATIONS
        </div>
      </div>

      <PaymentElement />
      <button disabled={isProcessing || !stripe || !elements} id="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 mt-6 retro-mono">
        <span id="button-text">
          {isProcessing ? "PROCESSING..." : `PAY ${amount}`}
        </span>
      </button>
      {errorMessage && <div id="payment-message" className="text-red-500 mt-4">{errorMessage}</div>}
    </form>
  );
};

export default CheckoutForm;
