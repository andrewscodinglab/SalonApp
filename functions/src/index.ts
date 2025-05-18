/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import * as admin from "firebase-admin";

// Export the email and SMS reminders functions
export * from './emailReminders';
export * from './smsReminders';

// Define configuration variables
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Initialize Firebase Admin SDK (if not already done)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Initialize Stripe using the secret key from Firebase config
let stripe: Stripe | null = null;

const initializeStripe = () => {
  try {
    logger.info("Initializing Stripe...");
    
    const secretKey = stripeSecretKey.value();
    if (!secretKey) {
      logger.error("Stripe secret key not found in configuration");
      return null;
    }

    // Validate the secret key format
    if (!secretKey.startsWith('sk_')) {
      logger.error("Invalid Stripe secret key format", {
        keyPrefix: secretKey.substring(0, 4)
      });
      return null;
    }

    logger.info("Initializing Stripe with valid secret key");
    
    const stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });

    return stripeInstance;
  } catch (error) {
    const err = error as Error;
    logger.error("Error initializing Stripe SDK:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return null;
  }
};

// Initialize stripe lazily when needed
const getStripe = () => {
  if (!stripe) {
    stripe = initializeStripe();
    if (!stripe) {
      logger.error("Failed to initialize Stripe in getStripe()");
      throw new HttpsError(
        'failed-precondition',
        'Stripe is not properly configured. Please check server configuration.'
      );
    }
  }
  return stripe;
};

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// --- Create Payment Intent Function ---
// This function will be called by the app to prepare a payment

interface CreatePaymentIntentData {
  serviceIds: string[]; // Array of service IDs (can be empty for quick charge)
  clientId: string; // ID of the client making the booking
  stylistId: string; // ID of the stylist performing the service
  amount: number; // TOTAL Amount in cents (base + tip), sent from the client
  currency?: string; // Optional: currency code (defaults to 'usd')
  tipAmount?: number; // Optional: Tip amount in cents for metadata
}

export const createPaymentIntent = onCall<CreatePaymentIntentData>({
  secrets: [stripeSecretKey]
}, async (request): Promise<{ clientSecret?: string; error?: string }> => {
    // Ensure Stripe was initialized
    const stripeInstance = getStripe();
    if (!stripeInstance) {
      logger.error("Stripe SDK not initialized. Cannot create PaymentIntent.");
      return { error: "Server configuration error, Stripe is not available." };
    }

    // Destructure data from the request
    const {serviceIds,
      clientId,
      stylistId,
      amount,
      currency = "usd",
      tipAmount} = request.data;
    logger.info(
      "Received createPaymentIntent request",
      {serviceIds, clientId, stylistId, amount, currency, tipAmount},
    );

    // Validate required fields
    if (!clientId || !stylistId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required data: clientId and stylistId.",
      );
    }

    // Validate amount (must be a positive integer)
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new HttpsError(
        "invalid-argument",
        "Amount must be a positive integer representing cents.",
      );
    }

    // Validate serviceIds (must be an array, can be empty)
    if (!Array.isArray(serviceIds)) {
      throw new HttpsError(
        "invalid-argument",
        "serviceIds must be an array.",
      );
    }

    try {
      // --- Get Stylist's Stripe Account ID ---
      const stylistDocRef = db.collection("stylists").doc(stylistId);
      const stylistDoc = await stylistDocRef.get();

      if (!stylistDoc.exists) {
        logger.error("Stylist document not found for ID:", stylistId);
        return {error: "Stylist configuration error. Cannot process payment."};
      }
      const stripeAccountId = stylistDoc.data()?.stripeAccountId;
      if (!stripeAccountId) {
        logger.error("Stylist is missing Stripe Account ID:", stylistId);
        return {error: "Stylist has not connected their Stripe account."};
      }
      logger.info("Found stylist Stripe Account ID:", stripeAccountId);

      // Log destination details before creating intent
      logger.info(`Attempting destination charge for stylistId: ${stylistId} -> stripeAccountId: ${stripeAccountId}`);

      // Use the amount and currency provided in the request
      const logAmountMsg = "Attempting to create PaymentIntent for " +
                         `${amount} ${currency.toUpperCase()}`;
      logger.info(logAmountMsg);

      // --- Create Payment Intent ---
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: amount,
        currency: currency,
        automatic_payment_methods: {enabled: true},
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          firestoreClientId: clientId,
          serviceIds: JSON.stringify(serviceIds || []),
          ...(tipAmount && tipAmount > 0 && {firestoreTipAmount: tipAmount.toString()}),
        },
      });

      // Check if client_secret exists before returning
      if (!paymentIntent.client_secret) {
        logger.error(
          "Failed to retrieve client_secret from Stripe Intent:",
          paymentIntent.id,
        );
        return {error: "Failed to initialize payment. Missing client secret."};
      }

      logger.info(
        "PaymentIntent created successfully:",
        {id: paymentIntent.id},
      );

      return {clientSecret: paymentIntent.client_secret};
    } catch (error: unknown) {
      logger.error("Error creating PaymentIntent:", error);
      if (error instanceof Stripe.errors.StripeError) {
        return {error: `Stripe Error: ${error.message}`};
      } else {
        return {error: "An unexpected server error occurred."};
      }
    }
});

// Generate a connection token for Stripe Terminal
export const fetchStripeTerminalConnectionToken = onCall({
  secrets: [stripeSecretKey]
}, async (request) => {
  logger.info('Fetching Stripe Terminal connection token...', {
    auth: !!request.auth,
    uid: request.auth?.uid
  });

  // Ensure user is authenticated
    if (!request.auth) {
    logger.warn('Unauthenticated request to fetch connection token');
      throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
      );
    }

  try {
    // Get Stripe instance with detailed logging
    logger.info('Getting Stripe instance...');
    
    const stripeInstance = getStripe();
    if (!stripeInstance) {
      logger.error('Failed to initialize Stripe instance');
      throw new HttpsError(
        'failed-precondition',
        'Stripe is not properly configured. Please check server configuration.'
      );
    }

    logger.info('Creating connection token...');
    const connectionToken = await stripeInstance.terminal.connectionTokens.create();
    
    if (!connectionToken?.secret) {
      logger.error('No secret in connection token response', {
        connectionToken: JSON.stringify(connectionToken)
      });
      throw new HttpsError(
        'internal',
        'Invalid connection token received from Stripe'
      );
    }

    logger.info('Connection token created successfully');
    return {
      secret: connectionToken.secret,
    };
    } catch (error) {
    const err = error as Error;
    logger.error('Error in fetchStripeTerminalConnectionToken:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      isStripeError: error instanceof Stripe.errors.StripeError
    });
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new HttpsError(
        'internal',
        `Stripe Error: ${error.message}`
      );
    }

    // If it's already an HttpsError, rethrow it
    if (error instanceof HttpsError) {
      throw error;
    }
    
        throw new HttpsError(
      'internal',
      'Unable to create connection token. Please try again later.'
          );
        }
});

// TODO:
// 1. Implement Firestore interaction to fetch service prices.
// 2. Implement calculateTotalAmount function.
// 3. Add authentication checks.
// 4. Consider creating/using Stripe Customers.
// 5. Add a webhook handler function (highly recommended).
// 6. Define actual refreshUrl and returnUrl for Stripe Connect.
// 7. Add these URLs to Stripe Connect settings in the dashboard.
// 8. Implement frontend handling for these return/refresh URLs.
// 9. Adjust Firestore 'stylists' collection name/path if needed.
