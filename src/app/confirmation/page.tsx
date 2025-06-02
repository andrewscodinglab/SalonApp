'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Booking {
  serviceName: string;
  dateTime: { toDate: () => Date };
  price: number;
  status: string;
  paymentStatus?: string;
  stylistId: string;
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bookingId = searchParams.get('booking_id');
    const sessionId = searchParams.get('session_id');

    if (!bookingId && !sessionId) {
      router.push('/');
      return;
    }

    const fetchBooking = async () => {
      try {
        if (bookingId) {
          // Handle payment link flow
          const bookingRef = doc(db, 'appointments', bookingId);
          const bookingSnap = await getDoc(bookingRef);

          if (!bookingSnap.exists()) {
            throw new Error('Booking not found');
          }

          setBooking(bookingSnap.data() as Booking);
        } else if (sessionId) {
          // Handle checkout session flow
          const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to verify session');
          }

          const bookingRef = doc(db, 'appointments', data.bookingId);
          const bookingSnap = await getDoc(bookingRef);

          if (!bookingSnap.exists()) {
            throw new Error('Booking not found');
          }

          setBooking(bookingSnap.data() as Booking);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading booking details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Error</h2>
              <p className="mt-2 text-gray-600">{error}</p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#D4AF37] hover:bg-[#C5A028] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            {booking.status === 'Confirmed' || booking.paymentStatus === 'Paid' ? (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Booking Confirmed!
                </h2>
                <p className="mt-2 text-gray-600">
                  Thank you for your booking. We've sent a confirmation email with all the details.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Payment Pending
                </h2>
                <p className="mt-2 text-gray-600">
                  Your booking is pending payment confirmation. We'll notify you once it's confirmed.
                </p>
              </>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Service</dt>
                <dd className="text-sm text-gray-900">{booking.serviceName}</dd>
              </div>
              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(booking.dateTime.toDate()).toLocaleString()}
                </dd>
              </div>
              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Amount</dt>
                <dd className="text-sm text-gray-900">${booking.price}</dd>
              </div>
              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">{booking.status}</dd>
              </div>
              {booking.paymentStatus && (
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                  <dd className="text-sm text-gray-900">{booking.paymentStatus}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#D4AF37] hover:bg-[#C5A028] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
            >
              Return to Home
            </Link>
            {booking.status !== 'Confirmed' && booking.paymentStatus !== 'Paid' && (
              <Link
                href={`/book/${booking.stylistId}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
              >
                Try Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 