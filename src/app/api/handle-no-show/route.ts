import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-03-14',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId, paymentIntentId, noShowFeePercentage = 50 } = body;

    if (!appointmentId && !paymentIntentId) {
      return NextResponse.json({ error: 'Either appointmentId or paymentIntentId is required' }, { status: 400 });
    }

    let finalPaymentIntentId = paymentIntentId;

    // If only appointmentId is provided, retrieve the payment intent ID from the appointment
    if (!finalPaymentIntentId && appointmentId) {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const appointmentSnap = await getDoc(appointmentRef);
      
      if (!appointmentSnap.exists()) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      const appointmentData = appointmentSnap.data();
      finalPaymentIntentId = appointmentData.paymentIntentId;

      if (!finalPaymentIntentId) {
        return NextResponse.json({ error: 'No payment intent found for this appointment' }, { status: 404 });
      }
    }

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(finalPaymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment Intent not found' }, { status: 404 });
    }

    // Calculate the no-show fee (percentage of the original amount)
    const originalAmount = paymentIntent.amount;
    const noShowAmount = Math.round((originalAmount * noShowFeePercentage) / 100);

    // Capture the no-show fee
    const capturedPayment = await stripe.paymentIntents.capture(finalPaymentIntentId, {
      amount_to_capture: noShowAmount,
    });

    // Update the appointment status if appointmentId was provided
    if (appointmentId) {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'No Show',
        paymentStatus: 'Partial',
        noShowFeeCaptured: true,
        noShowFeeAmount: noShowAmount / 100, // Convert back to dollars
        lastUpdated: new Date()
      });
    }

    return NextResponse.json({ 
      success: true, 
      paymentIntent: capturedPayment,
      capturedAmount: noShowAmount / 100, // Convert back to dollars
      originalAmount: originalAmount / 100
    });
  } catch (error) {
    console.error('Error handling no-show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error handling no-show' },
      { status: 500 }
    );
  }
} 