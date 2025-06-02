# Salon Booking System

A modern salon booking system with Stripe payment integration.

## Prerequisites

- Docker installed on your machine
- A Stripe account (for payment processing)
- A Firebase account (for database)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### 2. Stripe Webhook Setup

1. Install Stripe CLI from [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Start webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
4. Copy the webhook signing secret provided by the CLI and add it to your `.env.local` file as `STRIPE_WEBHOOK_SECRET`

### 3. Running with Docker

1. Build the Docker image:
   ```bash
   docker build -t salon-booking .
   ```

2. Run the container:
   ```bash
   docker run -p 3001:3001 \
     --env-file .env.local \
     salon-booking
   ```

3. Access the application at `http://localhost:3001`

### 4. Testing the Booking Flow

1. Visit `http://localhost:3001/book/test-stylist-1`
2. Select a service and time
3. Complete the booking form
4. For test payments, use:
   - Card number: 4242 4242 4242 4242
   - Any future expiration date
   - Any CVC
   - Any ZIP code

## Development

### Running Locally (without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3001`

### Testing Stripe Integration

1. Make sure the Stripe CLI is running with webhook forwarding
2. Create a test booking
3. Use test card details for payment
4. Check the webhook logs in the Stripe CLI terminal
5. Verify the booking status updates in the confirmation page

## Troubleshooting

### Common Issues

1. **Webhook not receiving events:**
   - Ensure Stripe CLI is running with webhook forwarding
   - Verify the webhook secret in `.env.local` matches the one from Stripe CLI
   - Check the webhook logs in Stripe CLI terminal

2. **Payment not processing:**
   - Verify Stripe API keys are correct in `.env.local`
   - Check browser console for any errors
   - Ensure you're using test card numbers in test mode

3. **Docker container not starting:**
   - Check if port 3001 is available
   - Verify all environment variables are set
   - Check Docker logs: `docker logs <container_id>`

## Support

For any issues or questions, please contact the development team.
