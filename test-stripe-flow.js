import fetch from 'node-fetch';

async function testStripeFlow() {
  try {
    // 1. Create a checkout session
    console.log('1. Creating checkout session...');
    const sessionResponse = await fetch('http://localhost:3001/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceIds: ['service1'],
        clientId: 'testClient123',
        stylistId: 'testStylist123',
        amount: 100
      })
    });
    const sessionData = await sessionResponse.json();
    console.log('Checkout session created:', sessionData);

    if (!sessionData.sessionId) {
      throw new Error('Failed to create checkout session');
    }

    // 2. Instructions for testing
    console.log('\n2. Testing Instructions:');
    console.log('----------------------');
    console.log('1. Open this URL in your browser:');
    console.log(`   http://localhost:3001/checkout?services=service1&clientId=testClient123&stylistId=testStylist123&amount=100`);
    console.log('\n2. Use these test card details:');
    console.log('   Card number: 4242 4242 4242 4242');
    console.log('   Expiry: Any future date (e.g., 12/25)');
    console.log('   CVC: Any 3 digits (e.g., 123)');
    console.log('   ZIP: Any 5 digits (e.g., 12345)');
    console.log('\n3. After completing the payment, check your server logs for the payment intent ID');
    console.log('4. Use that payment intent ID to test the capture and no-show endpoints');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStripeFlow(); 