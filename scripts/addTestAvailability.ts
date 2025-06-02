import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin SDK with explicit credentials
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addTestAvailability(stylistId: string) {
  const defaultSchedule = {
    exceptions: [],
    lastUpdated: new Date().toISOString(),
    weeklySchedule: {
      monday: { start: '09:00', end: '17:00', isAvailable: true },
      tuesday: { start: '09:00', end: '17:00', isAvailable: true },
      wednesday: { start: '09:00', end: '17:00', isAvailable: true },
      thursday: { start: '09:00', end: '17:00', isAvailable: true },
      friday: { start: '09:00', end: '17:00', isAvailable: true },
      saturday: { start: '10:00', end: '15:00', isAvailable: true },
      sunday: { start: '10:00', end: '15:00', isAvailable: true }
    }
  };

  try {
    await db.collection('stylists').doc(stylistId)
      .collection('settings').doc('availability')
      .set(defaultSchedule);
    
    console.log(`Added availability settings for stylist: ${stylistId}`);
  } catch (error) {
    console.error('Error adding availability:', error);
  }
}

// Get stylistId from command line argument
const stylistId = process.argv[2];
if (!stylistId) {
  console.error('Please provide a stylist ID as an argument');
  process.exit(1);
}

addTestAvailability(stylistId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 