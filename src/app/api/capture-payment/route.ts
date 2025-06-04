import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-03-14',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentIntentId, amount } = body;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 });
    }

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment Intent not found' }, { status: 404 });
    }

    // If amount is provided, use it to capture a partial amount
    const captureAmount = amount ? Math.round(amount * 100) : undefined;

    // Capture the payment
    const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: captureAmount,
    });

    return NextResponse.json({ 
      success: true, 
      paymentIntent: capturedPayment 
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error capturing payment' },
      { status: 500 }
    );
  }
} 