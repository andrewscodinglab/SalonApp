import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating payment link with data:', body);

    const { amount, serviceName, bookingId, stylistId, clientId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Ensure we have a valid base URL with scheme
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const redirectUrl = `${baseUrl}/confirmation?booking_id=${bookingId}`;

    // Create a price object first
    const price = await stripe.prices.create({
      currency: 'usd',
      product_data: {
        name: serviceName,
      },
      unit_amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
    });

    // Create a payment link using the price ID
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: redirectUrl,
        },
      },
      metadata: {
        bookingId,
        stylistId,
        clientId,
      },
    });

    console.log('Created payment link:', paymentLink.id);

    return NextResponse.json({ url: paymentLink.url });
  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating payment link' },
      { status: 500 }
    );
  }
} 