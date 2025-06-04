import { NextResponse } from 'next/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-03-14',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the booking ID from metadata
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'No booking ID found in session metadata' }, { status: 400 });
    }

    return NextResponse.json({ bookingId });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error verifying session' },
      { status: 500 }
    );
  }
} 