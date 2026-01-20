import { loadStripe } from '@stripe/stripe-js';

const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!publicKey) {
  console.error('❌ VITE_STRIPE_PUBLIC_KEY is not defined in environment variables!');
}

export const stripePromise = loadStripe(publicKey || 'pk_test_placeholder');
