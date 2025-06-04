import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-03-14',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceIds, clientId, stylistId, amount, date, time, duration } = body;

    if (!serviceIds || !clientId || !stylistId || !amount || !date || !time || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the appointment first
    const appointmentRef = await addDoc(collection(db, 'appointments'), {
      serviceIds,
      clientId,
      stylistId,
      date,
      time,
      duration,
      status: 'Pending Payment',
      paymentStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create the Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // cents
      currency: 'usd',
      capture_method: 'manual',
      metadata: {
        appointmentId: appointmentRef.id,
        clientId,
        stylistId,
        serviceIds: JSON.stringify(serviceIds)
      }
    });

    // Store the paymentIntentId in the appointment
    await updateDoc(appointmentRef, {
      paymentIntentId: paymentIntent.id
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      appointmentId: appointmentRef.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating payment intent' },
      { status: 500 }
    );
  }
} 