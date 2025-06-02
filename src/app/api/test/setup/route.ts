import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export async function GET() {
  try {
    // Create a test stylist
    const stylistId = 'test-stylist-1';
    const stylistRef = doc(db, 'stylists', stylistId);
    
    await setDoc(stylistRef, {
      name: 'Test Stylist',
      salonName: 'Test Salon',
      email: 'test@example.com',
      phone: '123-456-7890',
      address: '123 Test St, Test City, TS 12345',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create services for the stylist
    const servicesRef = collection(db, 'services');
    const services = [
      {
        stylistId,
        name: 'Haircut',
        description: 'Basic haircut service',
        duration: 30,
        price: 50,
      },
      {
        stylistId,
        name: 'Hair Color',
        description: 'Full hair coloring service',
        duration: 120,
        price: 150,
      },
      {
        stylistId,
        name: 'Styling',
        description: 'Hair styling service',
        duration: 45,
        price: 75,
      },
    ];

    for (const service of services) {
      await addDoc(servicesRef, {
        ...service,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create availability settings
    const availabilityRef = doc(db, 'stylists', stylistId, 'settings', 'availability');
    await setDoc(availabilityRef, {
      weeklySchedule: {
        monday: {
          enabled: true,
          slots: [
            { start: '9:00', startPeriod: 'AM', end: '5:00', endPeriod: 'PM' }
          ]
        },
        tuesday: {
          enabled: true,
          slots: [
            { start: '9:00', startPeriod: 'AM', end: '5:00', endPeriod: 'PM' }
          ]
        },
        wednesday: {
          enabled: true,
          slots: [
            { start: '9:00', startPeriod: 'AM', end: '5:00', endPeriod: 'PM' }
          ]
        },
        thursday: {
          enabled: true,
          slots: [
            { start: '9:00', startPeriod: 'AM', end: '5:00', endPeriod: 'PM' }
          ]
        },
        friday: {
          enabled: true,
          slots: [
            { start: '9:00', startPeriod: 'AM', end: '5:00', endPeriod: 'PM' }
          ]
        },
        saturday: {
          enabled: false,
          slots: []
        },
        sunday: {
          enabled: false,
          slots: []
        }
      },
      exceptions: [],
      lastUpdated: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      stylistId,
      message: 'Test stylist and services created successfully' 
    });
  } catch (error) {
    console.error('Error setting up test data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error setting up test data' },
      { status: 500 }
    );
  }
} 