import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-03-14',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function updateBookingStatus(bookingId: string, status: string, paymentStatus: string, stripeSessionId?: string) {
  const bookingRef = doc(db, 'appointments', bookingId);
  const bookingSnap = await getDoc(bookingRef);

  if (!bookingSnap.exists()) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const updateData: any = {
    status,
    paymentStatus,
    updatedAt: new Date(),
  };

  if (stripeSessionId) {
    updateData.stripeSessionId = stripeSessionId;
  }

  await updateDoc(bookingRef, updateData);
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing stripe signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          await updateBookingStatus(bookingId, 'Confirmed', 'Authorized', session.id);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          await updateBookingStatus(bookingId, 'Cancelled', 'Failed', session.id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          await updateBookingStatus(bookingId, 'Confirmed', 'Paid');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          await updateBookingStatus(bookingId, 'Cancelled', 'Failed');
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 