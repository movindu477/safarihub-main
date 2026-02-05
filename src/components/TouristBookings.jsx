import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Star, CheckCircle, AlertCircle, X as CloseIcon, ChevronLeft, Download } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import { createNotification } from '../App';
import logo2 from '../assets/logo2.png';

// Helper function to format dates with month as text
const formatDate = (date) => {
  if (!date) return 'N/A';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function TouristBookings({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'pending', 'accepted', 'completed', 'declined', 'reviewed'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch user's bookings
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Real-time listener for bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort: Pending first, then by newest (createdAt)
      bookingsData.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;

        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, navigate]);

  // Handle review submission
  const handleReviewSubmit = async () => {
    if (!selectedBooking || !user) return;

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }

    setSubmittingReview(true);

    try {
      // Add review to reviews collection
      await addDoc(collection(db, 'reviews'), {
        providerId: selectedBooking.providerId,
        customerId: user.uid,
        customerName: selectedBooking.customerName || 'Anonymous',
        bookingId: selectedBooking.id,
        rating: reviewData.rating,
        comment: reviewData.comment.trim(),
        createdAt: serverTimestamp()
      });

      // Update booking status to 'reviewed'
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        status: 'reviewed',
        reviewedAt: serverTimestamp()
      });

      // Send notification to provider
      await createNotification(
        selectedBooking.providerId,
        'review',
        `${selectedBooking.customerName || 'A customer'} left a ${reviewData.rating}-star review for your service`,
        `/admin?tab=profile`
      );

      // Close modal and reset
      setShowReviewModal(false);
      setReviewData({ rating: 5, comment: '' });
      setSelectedBooking(null);
      setShowBookingDetails(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle download receipt as PDF
  const handleDownloadReceipt = (booking, e) => {
    e.stopPropagation(); // Prevent opening booking details

    // Create receipt HTML
    const receiptWindow = window.open('', '', 'width=800,height=600');

    // Calculate total days
    const daysCount = booking.datesWithTypes?.length || 1;

    // Format dates
    const formatReceiptDate = (date) => {
      if (!date) return 'N/A';
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Receipt - ${booking.id}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { margin: 0; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #ffffff;
            color: #000000;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #10b981;
            font-size: 32px;
            margin-bottom: 5px;
          }
          .header p {
            color: #6b7280;
            font-size: 14px;
          }
          .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 6px;
          }
          .info-block h3 {
            color: #10b981;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .info-block p {
            color: #374151;
            font-size: 14px;
            line-height: 1.6;
          }
          .booking-details {
            margin: 30px 0;
          }
          .section-title {
            color: #10b981;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .detail-item {
            padding: 12px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .detail-label {
            color: #6b7280;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .detail-value {
            color: #111827;
            font-size: 14px;
            font-weight: 500;
          }
          .dates-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .dates-table th {
            background: #10b981;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
          }
          .dates-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          .dates-table tr:nth-child(even) {
            background: #f9fafb;
          }
          .pricing-section {
            margin-top: 30px;
            padding: 20px;
            background: #f0fdf4;
            border: 2px dashed #10b981;
            border-radius: 6px;
          }
          .price-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .price-row.total {
            border-top: 2px solid #10b981;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 700;
            color: #10b981;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-confirmed { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-accepted { background: #d1fae5; color: #065f46; }
          .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .print-btn:hover {
            background: #059669;
          }
          @media print {
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Download / Print PDF</button>
        
        <div class="receipt-container">
          <div class="header">
            <div style="display: flex; justify-content: center; margin-bottom: 10px;">
              <img src="${window.location.origin}${logo2}" alt="SafariHub Logo" style="height: 60px; object-fit: contain;" />
            </div>
            <p>Booking Receipt & Confirmation</p>
          </div>

          <div class="receipt-info">
            <div class="info-block">
              <h3>Receipt Information</h3>
              <p><strong>Receipt #:</strong> ${booking.id.substring(0, 8).toUpperCase()}</p>
              <p><strong>Booking Date:</strong> ${formatReceiptDate(booking.createdAt?.toDate?.() || booking.createdAt)}</p>
              <p><strong>Status:</strong> <span class="status-badge status-${booking.paymentStatus === 'paid' ? 'confirmed' : booking.status}">${booking.paymentStatus === 'paid' ? 'CONFIRMED' : booking.status?.toUpperCase()}</span></p>
            </div>
            <div class="info-block">
              <h3>Customer Details</h3>
              <p><strong>${booking.customerName || 'Guest'}</strong></p>
              <p>${booking.customerEmail || 'N/A'}</p>
              <p>${booking.customerPhone || 'N/A'}</p>
            </div>
          </div>

          <div class="booking-details">
            <h2 class="section-title">Service Details</h2>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Service Provider</div>
                <div class="detail-value">${booking.providerName || 'N/A'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Service Type</div>
                <div class="detail-value">${booking.serviceType || 'N/A'}</div>
              </div>
              ${(booking.vehicleType || booking.selectedVehicleType) ? `
              <div class="detail-item">
                <div class="detail-label">Vehicle Type</div>
                <div class="detail-value">${booking.vehicleType || booking.selectedVehicleType}</div>
              </div>
              ` : ''}
              ${booking.packageName ? `
              <div class="detail-item">
                <div class="detail-label">Package</div>
                <div class="detail-value">${booking.packageName}</div>
              </div>
              ` : ''}
            </div>

            ${booking.datesWithTypes && booking.datesWithTypes.length > 0 ? `
              <h2 class="section-title">Booking Dates</h2>
              <table class="dates-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th style="text-align: right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${booking.datesWithTypes.map(item => {
      const date = item.date ? new Date(item.date) : null;
      const type = item.type || 'full-day';
      const time = item.time || (booking.safariType?.toLowerCase().includes('evening') ? 'evening' : 'morning');
      const typeLabel = type === 'half-day'
        ? `Half Day (${time.charAt(0).toUpperCase() + time.slice(1)})`
        : 'Full Day';
      const datePrice = booking.totalPrice / booking.datesWithTypes.length;
      return date ? `
                      <tr>
                        <td>${formatReceiptDate(date)}</td>
                        <td>${typeLabel}</td>
                        <td style="text-align: right">LKR ${Math.round(datePrice).toLocaleString()}</td>
                      </tr>
                    ` : '';
    }).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>

          <div class="pricing-section">
            <div class="price-row">
              <span>Number of Days:</span>
              <span><strong>${daysCount}</strong></span>
            </div>
            ${booking.pricePerDay ? `
              <div class="price-row">
                <span>Price per Day:</span>
                <span>LKR ${booking.pricePerDay.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="price-row total">
              <span>Total Amount:</span>
              <span>LKR ${(booking.totalPrice || 0).toLocaleString()}</span>
            </div>
            ${booking.paymentStatus === 'paid' ? `
              <div class="price-row" style="color: #059669; margin-top: 10px;">
                <span>Payment Status:</span>
                <span><strong>✓ PAID</strong></span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>SafariHub</strong> - Your Gateway to Sri Lankan Adventures</p>
            <p>Contact: support@safarihub.lk | +94 XX XXX XXXX</p>
            <p style="margin-top: 10px;">Thank you for choosing SafariHub!</p>
            <p style="margin-top: 5px; font-size: 10px;">This is an electronically generated receipt and is valid without signature.</p>
          </div>
        </div>

        <script>
          // Auto-print dialog after page loads
          window.onload = function() {
            setTimeout(function() {
              // window.print(); // Uncomment to auto-open print dialog
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const statusColors = {
    pending: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    accepted: 'bg-green-900/50 text-green-300 border-green-700',
    confirmed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    declined: 'bg-red-900/50 text-red-300 border-red-700',
    completed: 'bg-blue-900/50 text-blue-300 border-blue-700',
    reviewed: 'bg-purple-900/50 text-purple-300 border-purple-700',
    cancelled: 'bg-gray-700/50 text-gray-300 border-gray-600'
  };

  // Filter bookings based on selected filter
  const filteredBookings = bookings.filter(booking => {
    if (bookingFilter === 'all') return true;
    if (bookingFilter === 'pending') return booking.status === 'pending';
    if (bookingFilter === 'accepted') {
      return booking.status === 'accepted' && booking.paymentStatus !== 'paid';
    }
    if (bookingFilter === 'confirmed') {
      return (booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus === 'paid';
    }
    return booking.status === bookingFilter;
  });

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />

      <div className="flex-1 pt-32 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-6 w-6 text-gray-300" />
            </button>
            <h1 className="text-3xl font-bold text-white">My Bookings</h1>
          </div>

          {/* Filter Buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setBookingFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setBookingFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Pending ({bookings.filter(b => b.status === 'pending').length})
            </button>
            <button
              onClick={() => setBookingFilter('accepted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'accepted'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Accepted ({bookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'paid').length})
            </button>
            <button
              onClick={() => setBookingFilter('confirmed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'confirmed'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Paid ({bookings.filter(b => (b.status === 'accepted' || b.status === 'confirmed') && b.paymentStatus === 'paid').length})
            </button>
            <button
              onClick={() => setBookingFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Completed ({bookings.filter(b => b.status === 'completed').length})
            </button>
            <button
              onClick={() => setBookingFilter('reviewed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'reviewed'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Reviewed ({bookings.filter(b => b.status === 'reviewed').length})
            </button>
            <button
              onClick={() => setBookingFilter('declined')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bookingFilter === 'declined'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              Declined ({bookings.filter(b => b.status === 'declined').length})
            </button>
          </div>

          {/* Bookings List */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No bookings yet</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  Start Exploring
                </button>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found</p>
                {bookingFilter !== 'all' && (
                  <button
                    onClick={() => setBookingFilter('all')}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                  >
                    View All Bookings
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const bookingDate = booking.createdAt?.toDate?.() || booking.createdAt || new Date();
                  const formattedDate = formatDate(bookingDate);

                  // Check if booking date has passed (for review button)
                  const getLatestBookingDate = () => {
                    if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
                      const dates = booking.datesWithTypes.map(d => new Date(d.date));
                      return new Date(Math.max(...dates));
                    } else if (booking.selectedDates) {
                      const dates = Array.isArray(booking.selectedDates)
                        ? booking.selectedDates.map(d => new Date(d))
                        : [new Date(booking.selectedDates)];
                      return new Date(Math.max(...dates));
                    }
                    return null;
                  };

                  const latestDate = getLatestBookingDate();
                  let hasBookingPassed = false;

                  if (latestDate) {
                    const latestDateMidnight = new Date(latestDate);
                    latestDateMidnight.setHours(0, 0, 0, 0);

                    const nowMidnight = new Date();
                    nowMidnight.setHours(0, 0, 0, 0);

                    hasBookingPassed = nowMidnight > latestDateMidnight;
                  }

                  return (
                    <div
                      key={booking.id}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingDetails(true);
                      }}
                      className="rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-700 bg-gray-700/50 border-gray-600"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-white">
                              {booking.providerName || booking.serviceType || 'Service Provider'}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${booking.paymentStatus === 'paid'
                              ? statusColors.confirmed
                              : statusColors[booking.status] || statusColors.pending
                              }`}>
                              {booking.paymentStatus === 'paid' ? 'PAID' : (booking.status?.toUpperCase() || 'PENDING')}
                            </span>
                            {booking.paymentStatus === 'paid' && (
                              <button
                                onClick={(e) => handleDownloadReceipt(booking, e)}
                                className="p-1.5 hover:bg-gray-600 rounded-full transition-colors group"
                                title="Download Slip"
                              >
                                <Download className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-300">
                            <p><span className="font-medium">Service Type:</span> {booking.serviceType || 'N/A'}</p>
                            {(booking.selectedVehicleType || booking.vehicleType) && (
                              <p><span className="font-medium">Vehicle Type:</span> {booking.selectedVehicleType || booking.vehicleType}</p>
                            )}
                            {booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0 ? (
                              <div>
                                <p className="font-medium mb-1">Dates:</p>
                                <div className="space-y-1">
                                  {booking.datesWithTypes.map((item, index) => {
                                    const date = item.date ? new Date(item.date) : null;
                                    const type = item.type || 'full-day';
                                    const time = item.time || (booking.safariType?.toLowerCase().includes('evening') ? 'evening' : 'morning');
                                    const typeLabel = type === 'half-day'
                                      ? `Half Day (${time.charAt(0).toUpperCase() + time.slice(1)})`
                                      : 'Full Day';
                                    const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';

                                    // Calculate price for this day
                                    let dayPrice = null;
                                    if (booking.totalPrice && booking.datesWithTypes?.length > 0) {
                                      dayPrice = booking.totalPrice / booking.datesWithTypes.length;
                                    } else {
                                      const isFullDay = type === 'full' || type === 'full-day';
                                      dayPrice = isFullDay
                                        ? booking.priceFullDay || booking.pricePerDay
                                        : booking.priceHalfDay || (booking.pricePerDay * 0.6);
                                    }

                                    if (!date) return null;
                                    return (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-300">{date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-medium ${typeColor}`}>
                                            {typeLabel} {dayPrice ? `- LKR ${Math.round(dayPrice).toLocaleString()}` : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : booking.selectedDates ? (
                              <p><span className="font-medium">Dates:</span> {
                                Array.isArray(booking.selectedDates)
                                  ? booking.selectedDates.map(d => formatDate(new Date(d))).join(', ')
                                  : formatDate(new Date(booking.selectedDates))
                              }</p>
                            ) : booking.datesString ? (
                              <p><span className="font-medium">Dates:</span> {booking.datesString}</p>
                            ) : null}
                            {booking.destination && (
                              <p><span className="font-medium">Destination:</span> {booking.destination}</p>
                            )}
                            {booking.totalPrice && (
                              <p className="border-t border-gray-700 pt-2 mt-2">
                                <span className="font-medium">Total Price:</span>{' '}
                                <span className="font-bold text-base">LKR {booking.totalPrice.toLocaleString()}</span>
                              </p>
                            )}
                            <p><span className="font-medium">Booked on:</span> {formattedDate}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Pay Now Button */}
                          {booking.status === 'accepted' && booking.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => navigate(`/payment/${booking.id}`)}
                              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all transform hover:scale-105 shadow-lg text-sm font-bold"
                            >
                              <CheckCircle className="h-4 w-4" />
                              PAY NOW
                            </button>
                          )}

                          {/* Download Receipt Button - Show for accepted, confirmed, completed, and reviewed bookings */}
                          {(booking.status === 'accepted' || booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'reviewed' || booking.paymentStatus === 'paid') && (
                            <button
                              onClick={(e) => handleDownloadReceipt(booking, e)}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <Download className="h-4 w-4" />
                              Download Slip
                            </button>
                          )}

                          {/* Review Button */}
                          {booking.status === 'completed' && hasBookingPassed && (
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowReviewModal(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <Star className="h-4 w-4" />
                              Leave a Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Leave a Review</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewData({ rating: 5, comment: '' });
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <CloseIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-2">
                Service Provider: <span className="font-semibold text-white">{selectedBooking.providerName || 'Service Provider'}</span>
              </p>
              <p className="text-gray-400 text-xs">
                {selectedBooking.serviceType} • {selectedBooking.destination}
              </p>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Rating *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${star <= reviewData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600'
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                placeholder="Share your experience with this service provider..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewData({ rating: 5, comment: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
