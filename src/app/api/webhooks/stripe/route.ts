import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function updateBookingStatus(bookingId: string, status: string, paymentStatus: string, stripeSessionId?: string, paymentIntentId?: string) {
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

  if (paymentIntentId) {
    updateData.paymentIntentId = paymentIntentId;
  }

  await updateDoc(bookingRef, updateData);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) {
        throw new Error('No booking ID found in session metadata');
      }

      await updateBookingStatus(
        bookingId,
        'Scheduled',
        'Paid',
        session.id,
        session.payment_intent as string
      );

      return NextResponse.json({ received: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (!bookingId) {
        // If no bookingId in metadata, try to find the appointment by clientId
        const clientId = paymentIntent.metadata?.firestoreClientId;
        if (!clientId) {
          throw new Error('No client ID found in payment intent metadata');
        }

        // Find the appointment with pending payment status for this client
        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef,
          where('clientId', '==', clientId),
          where('status', '==', 'Pending Payment')
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          throw new Error('No pending appointment found for client');
        }

        const appointmentDoc = snapshot.docs[0];
        await updateDoc(appointmentDoc.ref, {
          status: 'Scheduled',
          paymentStatus: 'Paid',
          paymentIntentId: paymentIntent.id,
          updatedAt: new Date()
        });
      } else {
        await updateBookingStatus(
          bookingId,
          'Scheduled',
          'Paid',
          undefined,
          paymentIntent.id
        );
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 400 }
    );
  }
} 