import fetch from 'node-fetch';

async function testNoShowFlow() {
  try {
    // 1. Create a new booking
    console.log('1. Creating new booking...');
    const bookingResponse = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceIds: ['service1'],
        clientId: 'testClient123',
        stylistId: 'testStylist123',
        date: new Date().toISOString(),
        time: '14:00',
        duration: 60
      })
    });
    const bookingData = await bookingResponse.json();
    console.log('Booking created:', bookingData);

    if (!bookingData.bookingId) {
      throw new Error('Failed to create booking');
    }

    // 2. Create a checkout session for the booking
    console.log('\n2. Creating checkout session...');
    const sessionResponse = await fetch('http://localhost:3001/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceIds: ['service1'],
        clientId: 'testClient123',
        stylistId: 'testStylist123',
        amount: 100,
        bookingId: bookingData.bookingId
      })
    });
    const sessionData = await sessionResponse.json();
    console.log('Checkout session created:', sessionData);

    if (!sessionData.sessionId) {
      throw new Error('Failed to create checkout session');
    }

    // 3. Instructions for testing
    console.log('\n3. Testing Instructions:');
    console.log('----------------------');
    console.log('1. Open this URL in your browser:');
    console.log(`   http://localhost:3001/checkout?session_id=${sessionData.sessionId}`);
    console.log('\n2. Use these test card details:');
    console.log('   Card number: 4242 4242 4242 4242');
    console.log('   Expiry: Any future date (e.g., 12/25)');
    console.log('   CVC: Any 3 digits (e.g., 123)');
    console.log('   ZIP: Any 5 digits (e.g., 12345)');
    console.log('\n3. After completing the payment, wait for the webhook to process');
    console.log('4. Then test the no-show handling with this command:');
    console.log(`   curl -X POST http://localhost:3001/api/handle-no-show \\`);
    console.log(`   -H "Content-Type: application/json" \\`);
    console.log(`   -d '{"appointmentId": "${bookingData.bookingId}", "noShowFeePercentage": 50}'`);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNoShowFlow(); 