const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK with explicit credentials
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps || !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addTestStylistAndService() {
  // Generate a random stylist ID
  const stylistId = uuidv4();

  // Add stylist
  const stylistData = {
    name: 'Test Stylist',
    email: 'stylist@example.com',
    salonName: 'Test Salon',
    profileImageUrl: 'https://via.placeholder.com/150',
    address: '123 Test St, Test City',
    phone: '+1234567890',
    stripeAccountId: 'acct_test_1234567890', // Replace with a real or test Stripe account ID if needed
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('stylists').doc(stylistId).set(stylistData);
  console.log(`Added stylist with ID: ${stylistId}`);

  // Add a service for this stylist
  const serviceData = {
    stylistId,
    name: 'Haircut',
    price: 5, // $0.05 in cents
    duration: 60, // 60 minutes
    description: 'A great haircut!'
  };
  const serviceRef = await db.collection('services').add(serviceData);
  console.log(`Added service with ID: ${serviceRef.id} for stylist: ${stylistId}`);

  console.log(`Booking page: http://localhost:3001/book/${stylistId}`);
}

addTestStylistAndService().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
}); 