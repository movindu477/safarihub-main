import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CreditCard, Plus, Trash2, Edit2, Check, X, Shield, Lock, ChevronLeft, AlertCircle } from 'lucide-react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Navbar from './home/Navbar';
import Footer from './home/Footer';

export default function PaymentWallet({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchPaymentMethods();
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching payment methods for user:', user.uid);
      
      let apiUrl = import.meta.env.VITE_API_URL || '/api';
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl + '/api';
      }
      
      console.log('📡 API URL:', `${apiUrl}/payment-methods/${user.uid}`);
      
      const response = await fetch(`${apiUrl}/payment-methods/${user.uid}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      console.log('✅ Payment methods received:', data);
      console.log('   Number of cards:', data.paymentMethods?.length || 0);
      
      setPaymentMethods(data.paymentMethods || []);
      setDefaultPaymentMethod(data.defaultPaymentMethod);
    } catch (err) {
      console.error('❌ Error fetching payment methods:', err);
      setError('Failed to load payment methods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Create payment method
      const cardElement = elements.getElement(CardElement);
      const { error: createError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (createError) {
        throw new Error(createError.message);
      }

      // Save to backend
      let apiUrl = import.meta.env.VITE_API_URL || '/api';
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl + '/api';
      }
      const response = await fetch(`${apiUrl}/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          paymentMethodId: paymentMethod.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save payment method');
      }

      setSuccess('Payment method added successfully!');
      setShowAddCard(false);
      cardElement.clear();
      
      // Refresh payment methods list
      await fetchPaymentMethods();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding card:', err);
      setError(err.message || 'Failed to add payment method. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCard = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setDeletingId(paymentMethodId);
    setError(null);
    setSuccess(null);

    try {
      let apiUrl = import.meta.env.VITE_API_URL || '/api';
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl + '/api';
      }
      const response = await fetch(`${apiUrl}/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment method');
      }

      setSuccess('Payment method removed successfully!');
      
      // Refresh payment methods list
      await fetchPaymentMethods();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting card:', err);
      setError(err.message || 'Failed to remove payment method. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let apiUrl = import.meta.env.VITE_API_URL || '/api';
      if (!apiUrl.endsWith('/api')) {
        apiUrl = apiUrl + '/api';
      }
      const response = await fetch(`${apiUrl}/payment-methods/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default payment method');
      }

      setSuccess('Default payment method updated!');
      setDefaultPaymentMethod(paymentMethodId);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error setting default:', err);
      setError(err.message || 'Failed to update default payment method. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getCardBrandIcon = (brand) => {
    const brandColors = {
      visa: 'text-blue-600',
      mastercard: 'text-red-600',
      amex: 'text-blue-800',
      discover: 'text-orange-600',
      default: 'text-gray-600'
    };
    return brandColors[brand?.toLowerCase()] || brandColors.default;
  };

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
    hidePostalCode: false,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onShowAuth={onShowAuth}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 mt-16 sm:mt-20">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            Back
          </button>
          
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <span>Payment Wallet</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Manage your saved payment methods securely
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 sm:flex-shrink-0">
              {!showAddCard && (
                <>
                  <button
                    onClick={fetchPaymentMethods}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm sm:text-base"
                    title="Refresh cards"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="hidden xs:inline sm:inline">Add Card</span>
                    <span className="xs:hidden sm:hidden">Add</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
          <div className="flex items-start">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">
                Your payment information is secure
              </h3>
              <p className="text-xs sm:text-sm text-blue-800">
                All card details are encrypted and securely stored by Stripe. We never store your full card number.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg animate-fadeIn">
            <div className="flex items-center">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg animate-fadeIn">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-red-800 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Add New Card Form */}
        {showAddCard && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200 animate-slideDown">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Card</h2>
              <button
                onClick={() => setShowAddCard(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Card Information
                </label>
                <div className="p-3 sm:p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>

              {/* Mobile: Stack buttons vertically, Desktop: Side by side */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={!stripe || processing}
                  className={`flex-1 py-3 px-4 sm:px-6 rounded-lg font-semibold text-white transition-all text-sm sm:text-base ${
                    processing || !stripe
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
                  }`}
                >
                  {processing ? 'Adding...' : 'Add Payment Method'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="px-4 sm:px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Payment Methods List */}
        {!loading && (
          <div className="space-y-3 sm:space-y-4">
            {paymentMethods.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 sm:p-12 text-center border border-gray-200">
                <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Payment Methods</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
                  Add a payment method to make bookings faster and easier
                </p>
                {!showAddCard && (
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 text-sm sm:text-base"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Your First Card
                  </button>
                )}
              </div>
            ) : (
              paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 transition-all hover:shadow-xl ${
                    defaultPaymentMethod === method.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Mobile: Stack vertically, Desktop: Side by side */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Card Info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`p-2 sm:p-3 bg-gray-100 rounded-lg flex-shrink-0 ${getCardBrandIcon(method.card.brand)}`}>
                        <CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-base sm:text-lg font-bold text-gray-900 uppercase">
                            {method.card.brand}
                          </span>
                          {defaultPaymentMethod === method.id && (
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-sm sm:text-base text-gray-600">
                          •••• •••• •••• {method.card.last4}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          Expires {method.card.exp_month}/{method.card.exp_year}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-2 sm:flex-shrink-0">
                      {defaultPaymentMethod !== method.id && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          disabled={processing}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Set as Default</span>
                          <span className="sm:hidden">Set Default</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteCard(method.id)}
                        disabled={deletingId === method.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="Remove card"
                      >
                        {deletingId === method.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Security Info */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0 mt-0.5 sm:mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">
                How we protect your information
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                <li className="flex items-start">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    All payment data is encrypted with industry-standard SSL/TLS protocols
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    Card details are securely stored by Stripe, a PCI-DSS Level 1 certified provider
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    We never have access to your full card number or CVV
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    You can remove your payment methods at any time
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
