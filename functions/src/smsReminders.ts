import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { format, addDays, isWithinInterval } from 'date-fns';

interface StylistSettings {
  notifications?: {
    smsReminders?: {
      enabled: boolean;
      daysBeforeAppointment: number;
      reminderTime: string;
    };
  };
}

interface StylistProfile {
  firstName: string;
}

interface Client {
  phoneNumber: string;
}

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

interface SMSMessage {
  flowId: string;
  id: string;
  mobile: string;
  vars: {
    [key: string]: string;
  };
}

function generateMessageId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const sendSMSReminders = onSchedule('0 * * * *', async (event: ScheduledEvent): Promise<void> => {
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
      if (!settings?.notifications?.smsReminders?.enabled) continue;

      // Get stylist profile for name
      const stylistProfile = stylistDoc.data() as StylistProfile;
      const stylistName = stylistProfile.firstName.toLowerCase();

      const { daysBeforeAppointment, reminderTime } = settings.notifications.smsReminders;
      
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
        if (!client?.phoneNumber) continue;

        // Format phone number to E.164 format (remove any non-digit characters and add +1)
        const formattedPhone = '1' + client.phoneNumber.replace(/\D/g, '');
        
        // Check if reminder has already been sent
        const reminderDoc = await appointmentDoc.ref
          .collection('reminders')
          .doc('sms')
          .get();
        
        if (reminderDoc.exists) continue;

        // Format appointment time and date
        const appointmentTime = format(appointment.dateTime.toDate(), 'h:mm a');
        const appointmentDate = format(appointment.dateTime.toDate(), 'MM/dd/yy');

        // Create SMS message document
        const smsMessage: SMSMessage = {
          flowId: "6828bf7bd6fc0550b23a2a93",
          id: generateMessageId(),
          mobile: formattedPhone,
          vars: {
            '##date##': appointmentDate,
            '##stylist##': stylistName,
            '##time##': appointmentTime,
          }
        };

        // Add message to messages collection
        await db.collection('messages').add(smsMessage);

        // Mark reminder as sent
        await appointmentDoc.ref
          .collection('reminders')
          .doc('sms')
          .set({
            sentAt: now,
            type: 'sms',
            daysBeforeAppointment,
          });
      }
    }
  } catch (error) {
    console.error('Error sending SMS reminders:', error);
  }
}); 