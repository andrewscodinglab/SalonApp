import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { format, addDays, isWithinInterval } from 'date-fns';

interface Appointment {
  clientId: string;
  stylistId: string;
  dateTime: admin.firestore.Timestamp;
  duration: number;
  serviceIds: string[];
  serviceName: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  price: string;
}

interface StylistSettings {
  notifications?: {
    emailReminders?: {
      enabled: boolean;
      daysBeforeAppointment: number;
      reminderTime: string;
    };
  };
}

interface Client {
  email: string;
  firstName: string;
}

export const sendEmailReminders = onSchedule('0 * * * *', async (event: ScheduledEvent): Promise<void> => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    // Get all stylists
    const stylistsSnapshot = await db.collection('stylists').get();
    
    for (const stylistDoc of stylistsSnapshot.docs) {
      // Get stylist settings
      const settingsDoc = await stylistDoc.ref
        .collection('settings')
        .doc('general')
        .get();
      
      if (!settingsDoc.exists) continue;
      
      const settings = settingsDoc.data() as StylistSettings;
      if (!settings?.notifications?.emailReminders?.enabled) continue;

      const { daysBeforeAppointment, reminderTime } = settings.notifications.emailReminders;
      
      // Parse reminder time
      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      // Only proceed if we're within the reminder time window (±30 minutes)
      if (!isWithinInterval(new Date(), {
        start: new Date().setHours(hours, minutes - 30),
        end: new Date().setHours(hours, minutes + 30)
      })) continue;

      // Calculate the target date for reminders
      const targetDate = addDays(new Date(), daysBeforeAppointment);
      
      // Get appointments for the target date and stylist from root appointments collection
      const appointmentsSnapshot = await db.collection('appointments')
        .where('stylistId', '==', stylistDoc.id)
        .where('status', '==', 'Scheduled')
        .where('dateTime', '>=', admin.firestore.Timestamp.fromDate(
          new Date(targetDate.setHours(0, 0, 0, 0))
        ))
        .where('dateTime', '<=', admin.firestore.Timestamp.fromDate(
          new Date(targetDate.setHours(23, 59, 59, 999))
        ))
        .get();

      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointment = appointmentDoc.data() as Appointment;
        
        // Get client data
        const clientDoc = await db
          .collection('clients')
          .doc(appointment.clientId)
          .get();
        
        if (!clientDoc.exists) continue;
        
        const client = clientDoc.data() as Client;
        
        // Check if reminder has already been sent
        const reminderDoc = await appointmentDoc.ref
          .collection('reminders')
          .doc('email')
          .get();
        
        if (reminderDoc.exists) continue;

        // Format appointment time
        const appointmentTime = format(appointment.dateTime.toDate(), 'h:mm a');
        const appointmentDate = format(appointment.dateTime.toDate(), 'EEEE, MMMM d, yyyy');
        
        // Send email
        await admin.firestore().collection('mail').add({
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
                <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
                <li><strong>Service:</strong> ${appointment.serviceName}</li>
                <li><strong>Price:</strong> ${appointment.price}</li>
              </ul>
              <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
              <p>We look forward to seeing you!</p>
            `,
          },
        });

        // Mark reminder as sent
        await appointmentDoc.ref
          .collection('reminders')
          .doc('email')
          .set({
            sentAt: now,
            type: 'email',
            daysBeforeAppointment,
          });
      }
    }
  } catch (error) {
    console.error('Error sending email reminders:', error);
  }
}); 