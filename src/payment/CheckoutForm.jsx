import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function CheckoutForm({ booking, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Create PaymentIntent
      // Use proxy in development, or full URL if VITE_API_URL is set
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.totalPrice || 0, // LKR
          bookingId: booking.id
        })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to create payment intent';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use the status text
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let clientSecret;
      try {
        const data = await res.json();
        clientSecret = data.clientSecret;
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!clientSecret) {
        throw new Error('Payment intent creation failed. No client secret received.');
      }

      // 2️⃣ Confirm card payment
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // ✅ Payment success - update booking status via backend
          try {
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const markPaidRes = await fetch(`${apiUrl}/bookings/${booking.id}/mark-paid`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!markPaidRes.ok) {
              // If backend update fails, try Firestore directly as fallback
              console.warn('Backend booking update failed, using Firestore fallback');
              await updateDoc(doc(db, 'bookings', booking.id), {
                paymentStatus: 'paid',
                paidAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }

            setSuccess(true);
            setLoading(false);

            // Call success callback if provided
            if (onPaymentSuccess) {
              setTimeout(() => {
                onPaymentSuccess();
              }, 2000);
            }
          } catch (updateError) {
            console.error('Error updating booking:', updateError);
            // Even if update fails, payment was successful
            setError('Payment succeeded but failed to update booking. Please contact support.');
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-green-700">Your booking has been confirmed and paid.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Card Details
        </label>
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ${!stripe || loading
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
          } flex items-center justify-center space-x-2`}
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <span>Pay LKR {(booking.totalPrice || 0).toLocaleString()}</span>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        🔒 Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}
