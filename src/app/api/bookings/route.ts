import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceIds, clientId, stylistId, date, time, duration } = body;

    // Validate required fields
    if (!serviceIds || !clientId || !stylistId || !date || !time || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the booking document
    const bookingRef = await addDoc(collection(db, 'appointments'), {
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

    return NextResponse.json({ 
      bookingId: bookingRef.id,
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating booking' },
      { status: 500 }
    );
  }
} 