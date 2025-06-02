"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  let desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = {enumerable: true, get: function() {
      return m[k];
    }};
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
}));
const __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", {enumerable: true, value: v});
}) : function(o, v) {
  o["default"] = v;
});
const __importStar = (this && this.__importStar) || (function() {
  let ownKeys = function(o) {
    ownKeys = Object.getOwnPropertyNames || function(o) {
      const ar = [];
      for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
      return ar;
    };
    return ownKeys(o);
  };
  return function(mod) {
    if (mod && mod.__esModule) return mod;
    const result = {};
    if (mod != null) for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
  };
})();
const __exportStar = (this && this.__exportStar) || function(m, exports) {
  for (const p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
const __importDefault = (this && this.__importDefault) || function(mod) {
  return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
exports.fetchStripeTerminalConnectionToken = exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const stripe_1 = __importDefault(require("stripe"));
const admin = __importStar(require("firebase-admin"));
// Export the email and SMS reminders functions
__exportStar(require("./emailReminders"), exports);
__exportStar(require("./smsReminders"), exports);
// Define configuration variables
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Initialize Firebase Admin SDK (if not already done)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();
// Initialize Stripe using the secret key from Firebase config
let stripe = null;
const initializeStripe = () => {
  try {
    logger.info("Initializing Stripe...");
    const secretKey = stripeSecretKey.value();
    if (!secretKey) {
      logger.error("Stripe secret key not found in configuration");
      return null;
    }
    // Validate the secret key format
    if (!secretKey.startsWith("sk_")) {
      logger.error("Invalid Stripe secret key format", {
        keyPrefix: secretKey.substring(0, 4),
      });
      return null;
    }
    logger.info("Initializing Stripe with valid secret key");
    const stripeInstance = new stripe_1.default(secretKey, {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });
    return stripeInstance;
  } catch (error) {
    const err = error;
    logger.error("Error initializing Stripe SDK:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
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
      throw new https_1.HttpsError("failed-precondition", "Stripe is not properly configured. Please check server configuration.");
    }
  }
  return stripe;
};
exports.createPaymentIntent = (0, https_1.onCall)({
  secrets: [stripeSecretKey],
}, async (request) => {
  let _a;
  // Ensure Stripe was initialized
  const stripeInstance = getStripe();
  if (!stripeInstance) {
    logger.error("Stripe SDK not initialized. Cannot create PaymentIntent.");
    return {error: "Server configuration error, Stripe is not available."};
  }
  // Destructure data from the request
  const {serviceIds, clientId, stylistId, amount, currency = "usd", tipAmount} = request.data;
  logger.info("Received createPaymentIntent request", {serviceIds, clientId, stylistId, amount, currency, tipAmount});
  // Validate required fields
  if (!clientId || !stylistId) {
    throw new https_1.HttpsError("invalid-argument", "Missing required data: clientId and stylistId.");
  }
  // Validate amount (must be a positive integer)
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new https_1.HttpsError("invalid-argument", "Amount must be a positive integer representing cents.");
  }
  // Validate serviceIds (must be an array, can be empty)
  if (!Array.isArray(serviceIds)) {
    throw new https_1.HttpsError("invalid-argument", "serviceIds must be an array.");
  }
  try {
    // --- Get Stylist's Stripe Account ID ---
    const stylistDocRef = db.collection("stylists").doc(stylistId);
    const stylistDoc = await stylistDocRef.get();
    if (!stylistDoc.exists) {
      logger.error("Stylist document not found for ID:", stylistId);
      return {error: "Stylist configuration error. Cannot process payment."};
    }
    const stripeAccountId = (_a = stylistDoc.data()) === null || _a === void 0 ? void 0 : _a.stripeAccountId;
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
      metadata: Object.assign({firestoreClientId: clientId, serviceIds: JSON.stringify(serviceIds || [])}, (tipAmount && tipAmount > 0 && {firestoreTipAmount: tipAmount.toString()})),
    });
    // Check if client_secret exists before returning
    if (!paymentIntent.client_secret) {
      logger.error("Failed to retrieve client_secret from Stripe Intent:", paymentIntent.id);
      return {error: "Failed to initialize payment. Missing client secret."};
    }
    logger.info("PaymentIntent created successfully:", {id: paymentIntent.id});
    return {clientSecret: paymentIntent.client_secret};
  } catch (error) {
    logger.error("Error creating PaymentIntent:", error);
    if (error instanceof stripe_1.default.errors.StripeError) {
      return {error: `Stripe Error: ${error.message}`};
    } else {
      return {error: "An unexpected server error occurred."};
    }
  }
});
// Generate a connection token for Stripe Terminal
exports.fetchStripeTerminalConnectionToken = (0, https_1.onCall)({
  secrets: [stripeSecretKey],
}, async (request) => {
  let _a;
  logger.info("Fetching Stripe Terminal connection token...", {
    auth: !!request.auth,
    uid: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
  });
  // Ensure user is authenticated
  if (!request.auth) {
    logger.warn("Unauthenticated request to fetch connection token");
    throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  try {
    // Get Stripe instance with detailed logging
    logger.info("Getting Stripe instance...");
    const stripeInstance = getStripe();
    if (!stripeInstance) {
      logger.error("Failed to initialize Stripe instance");
      throw new https_1.HttpsError("failed-precondition", "Stripe is not properly configured. Please check server configuration.");
    }
    logger.info("Creating connection token...");
    const connectionToken = await stripeInstance.terminal.connectionTokens.create();
    if (!(connectionToken === null || connectionToken === void 0 ? void 0 : connectionToken.secret)) {
      logger.error("No secret in connection token response", {
        connectionToken: JSON.stringify(connectionToken),
      });
      throw new https_1.HttpsError("internal", "Invalid connection token received from Stripe");
    }
    logger.info("Connection token created successfully");
    return {
      secret: connectionToken.secret,
    };
  } catch (error) {
    const err = error;
    logger.error("Error in fetchStripeTerminalConnectionToken:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      isStripeError: error instanceof stripe_1.default.errors.StripeError,
    });
    if (error instanceof stripe_1.default.errors.StripeError) {
      throw new https_1.HttpsError("internal", `Stripe Error: ${error.message}`);
    }
    // If it's already an HttpsError, rethrow it
    if (error instanceof https_1.HttpsError) {
      throw error;
    }
    throw new https_1.HttpsError("internal", "Unable to create connection token. Please try again later.");
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
// # sourceMappingURL=index.js.map
