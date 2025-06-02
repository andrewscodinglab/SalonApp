"use strict";
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
Object.defineProperty(exports, "__esModule", {value: true});
exports.sendEmailReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
exports.sendEmailReminders = (0, scheduler_1.onSchedule)("0 * * * *", async (event) => {
  let _a; let _b;
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  try {
    // Get all stylists
    const stylistsSnapshot = await db.collection("stylists").get();
    for (const stylistDoc of stylistsSnapshot.docs) {
      // Get stylist settings
      const settingsDoc = await stylistDoc.ref
          .collection("settings")
          .doc("general")
          .get();
      if (!settingsDoc.exists) {
        continue;
      }
      const settings = settingsDoc.data();
      if (!((_b = (_a = settings === null || settings === void 0 ? void 0 : settings.notifications) === null || _a === void 0 ? void 0 : _a.emailReminders) === null || _b === void 0 ? void 0 : _b.enabled)) {
        continue;
      }
      const {daysBeforeAppointment, reminderTime} = settings.notifications.emailReminders;
      // Parse reminder time
      const [hours, minutes] = reminderTime.split(":").map(Number);
      // Only proceed if we're within the reminder time window (±30 minutes)
      if (!(0, date_fns_1.isWithinInterval)(new Date(), {
        start: new Date().setHours(hours, minutes - 30),
        end: new Date().setHours(hours, minutes + 30),
      })) {
        continue;
      }
      // Calculate the target date for reminders
      const targetDate = (0, date_fns_1.addDays)(new Date(), daysBeforeAppointment);
      // Get appointments for the target date
      const appointmentsSnapshot = await stylistDoc.ref
          .collection("appointments")
          .where("status", "==", "confirmed")
          .where("date", ">=", admin.firestore.Timestamp.fromDate(new Date(targetDate.setHours(0, 0, 0, 0))))
          .where("date", "<=", admin.firestore.Timestamp.fromDate(new Date(targetDate.setHours(23, 59, 59, 999))))
          .get();
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data();
        // Get client data
        const clientDoc = await db
            .collection("clients")
            .doc(appointment.clientId)
            .get();
        if (!clientDoc.exists) {
          continue;
        }
        const client = clientDoc.data();
        // Check if reminder has already been sent
        const reminderDoc = await appointmentDoc.ref
            .collection("reminders")
            .doc("email")
            .get();
        if (reminderDoc.exists) {
          continue;
        }
        // Format appointment time
        const appointmentTime = (0, date_fns_1.format)(appointment.date.toDate(), "h:mm a");
        const appointmentDate = (0, date_fns_1.format)(appointment.date.toDate(), "EEEE, MMMM d, yyyy");
        // Calculate total duration and cost
        const totalDuration = appointment.services.reduce((sum, service) => sum + service.duration, 0);
        const totalCost = appointment.services.reduce((sum, service) => sum + service.price, 0);
        // Send email
        await admin.firestore().collection("mail").add({
          to: client.email,
          message: {
            subject: `Appointment Reminder: Your appointment on ${appointmentDate}`,
            html: `
              <h2>Appointment Reminder</h2>
              <p>Hello ${client.firstName},</p>
              <p>This is a reminder about your upcoming appointment:</p>
              <ul>
                <li><strong>Date:</strong> ${appointmentDate}</li>
                <li><strong>Time:</strong> ${appointmentTime}</li>
                <li><strong>Duration:</strong> ${totalDuration} minutes</li>
                <li><strong>Services:</strong></li>
                ${appointment.services.map((service) => `
                  <li>${service.name} - $${service.price}</li>
                `).join("")}
                <li><strong>Total Cost:</strong> $${totalCost}</li>
              </ul>
              <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
              <p>We look forward to seeing you!</p>
            `,
          },
        });
        // Mark reminder as sent
        await appointmentDoc.ref
            .collection("reminders")
            .doc("email")
            .set({
              sentAt: now,
              type: "email",
              daysBeforeAppointment,
            });
      }
    }
  } catch (error) {
    console.error("Error sending email reminders:", error);
  }
});
// # sourceMappingURL=emailReminders.js.map
