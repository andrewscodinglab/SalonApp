import { collection, getDocs, doc, getDoc, query, where, orderBy, addDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { Stylist, Service, Availability, ConsultationForm } from '@/types/stylist';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';

// Helper function to serialize Firestore data
function serializeData(data: any) {
  const newData = { ...data };
  Object.keys(newData).forEach(key => {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate().toISOString();
    }
  });
  return newData;
}

export async function getAllStylists(): Promise<Stylist[]> {
  try {
    // We can't list all stylists due to security rules
    // Instead, we should have a separate public collection or API endpoint for this
    throw new Error('Listing all stylists is not allowed by security rules');
  } catch (error) {
    console.error('Error fetching stylists:', error);
    return [];
  }
}

export async function getStylistById(id: string): Promise<Stylist | null> {
  try {
    const stylistRef = doc(db, 'stylists', id);
    const stylistDoc = await getDoc(stylistRef);
    
    if (!stylistDoc.exists()) {
      return null;
    }

    // Get stylist's services
    const servicesQuery = query(
      collection(db, 'services'),
      where('stylistId', '==', id)
    );
    const servicesSnapshot = await getDocs(servicesQuery);
    const services = servicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...serializeData(doc.data())
    })) as Service[];

    // Get consultation form if it exists
    const consultationFormRef = doc(db, 'stylists', id, 'settings', 'consultationForm');
    const consultationFormDoc = await getDoc(consultationFormRef);
    let consultationForm: ConsultationForm | undefined;
    
    if (consultationFormDoc.exists()) {
      const formData = consultationFormDoc.data();
      consultationForm = {
        id: formData.id || consultationFormDoc.id,
        name: formData.name,
        isDefault: formData.isDefault,
        questions: formData.questions,
        createdAt: formData.createdAt?.toDate() || new Date(),
        updatedAt: formData.updatedAt?.toDate() || new Date()
      };
    }

    // Combine and serialize all data
    const stylistData = serializeData(stylistDoc.data());
    return {
      id: stylistDoc.id,
      ...stylistData,
      services,
      consultationForm
    } as Stylist;
  } catch (error) {
    console.error('Error fetching stylist:', error);
    return null;
  }
}

export async function getStylistServices(stylistId: string): Promise<Service[]> {
  try {
    const servicesQuery = query(
      collection(db, 'services'),
      where('stylistId', '==', stylistId)
    );
    const snapshot = await getDocs(servicesQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...serializeData(doc.data())
    })) as Service[];
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

export async function getStylistAvailability(
  stylistId: string,
  date: Date
): Promise<Availability[]> {
  // Get base availability for the day of week
  const availabilityRef = collection(db, 'stylists', stylistId, 'availability');
  const dayOfWeek = date.getDay();
  
  const q = query(availabilityRef, where('dayOfWeek', '==', dayOfWeek));
  const snapshot = await getDocs(q);
  
  const availability = snapshot.docs.map(doc => doc.data()) as Availability[];
  
  // Get any breaks or modifications for the specific date
  const breaksRef = collection(db, 'stylists', stylistId, 'breaks');
  const dateString = date.toISOString().split('T')[0];
  const breaksQuery = query(breaksRef, where('date', '==', dateString));
  const breaksSnapshot = await getDocs(breaksQuery);
  
  const breaks = breaksSnapshot.docs.map(doc => doc.data());
  
  // Filter out any times that are marked as breaks
  // You would implement more sophisticated availability logic here
  // considering appointments, breaks, and base availability
  
  return availability;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: Date;
  dateTime: Date;
  duration: number;
  notes: string;
  price: string;
  serviceIds: string[];
  serviceName: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending Payment';
  stylistId: string;
}

export async function getStylistAppointments(
  stylistId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  try {
    const appointmentsRef = collection(db, 'stylists', stylistId, 'appointments');
    const q = query(
      appointmentsRef,
      where('date', '>=', startDate.toISOString().split('T')[0]),
      where('date', '<=', endDate.toISOString().split('T')[0]),
      orderBy('date'),
      orderBy('time')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

export async function createAppointment(
  appointmentData: Omit<Appointment, 'id' | 'createdAt'>
): Promise<string | null> {
  try {
    console.log('Creating appointment with data:', appointmentData);
    
    // Validate required fields
    const requiredFields = ['clientId', 'clientName', 'dateTime', 'duration', 'price', 'serviceIds', 'serviceName', 'stylistId'];
    const missingFields = requiredFields.filter(field => !appointmentData[field as keyof typeof appointmentData]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Run this in a transaction to prevent race conditions
    const result = await runTransaction(db, async (transaction) => {
      const appointmentsRef = collection(db, 'appointments');
      
      // Simple date handling - just use the date as is
      const startTime = new Date(appointmentData.dateTime);
      const endTime = new Date(startTime.getTime() + (appointmentData.duration * 60000));

      // Get the start and end of the day
      const dayStart = new Date(startTime);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(startTime);
      dayEnd.setHours(23, 59, 59, 999);

      // Query appointments for this stylist on this specific day
      const conflictQuery = query(
        appointmentsRef,
        where('stylistId', '==', appointmentData.stylistId),
        where('status', '==', 'Scheduled'),
        where('dateTime', '>=', Timestamp.fromDate(dayStart)),
        where('dateTime', '<=', Timestamp.fromDate(dayEnd))
      );

      const conflictingAppointments = await getDocs(conflictQuery);
      
      // Check each appointment for overlap
      for (const doc of conflictingAppointments.docs) {
        const existingAppt = doc.data();
        if (existingAppt.status !== 'Scheduled') continue;

        const existingStart = existingAppt.dateTime.toDate();
        const existingEnd = new Date(existingStart.getTime() + (existingAppt.duration * 60000));

        // Check for any overlap
        const hasOverlap = (
          (startTime >= existingStart && startTime < existingEnd) || // New appointment starts during existing
          (endTime > existingStart && endTime <= existingEnd) || // New appointment ends during existing
          (startTime <= existingStart && endTime >= existingEnd) // New appointment encompasses existing
        );

        if (hasOverlap) {
          throw new Error('DOUBLE_BOOKING_ERROR: This time slot is already booked.');
        }
      }

      // If we get here, no conflicts were found - create the appointment
      const newAppointmentRef = doc(appointmentsRef);
      const appointmentToCreate = {
        ...appointmentData,
        createdAt: Timestamp.now(),
        dateTime: Timestamp.fromDate(startTime),
        status: 'Scheduled',
        notes: appointmentData.notes || '',
        lastUpdated: Timestamp.now(),
        paymentStatus: 'Pending',
        confirmationStatus: 'Pending'
      };

      transaction.set(newAppointmentRef, appointmentToCreate);
      return newAppointmentRef.id;
    });

    console.log('Successfully created appointment with ID:', result);
    return result;

  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error instanceof Error) {
      if (error.message.includes('DOUBLE_BOOKING_ERROR')) {
        throw new Error('This time slot is already booked. Please select a different time.');
      }
      console.error('Error details:', error.message);
    }
    return null;
  }
}

interface TimeSlot {
  start: string;
  startPeriod: string;
  end: string;
  endPeriod: string;
  id: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface StylistAvailability {
  exceptions: any[];
  lastUpdated: string;
  weeklySchedule: WeeklySchedule;
}

export async function getStylistSchedule(stylistId: string): Promise<StylistAvailability | null> {
  try {
    const availabilityRef = doc(db, 'stylists', stylistId, 'settings', 'availability');
    const availabilityDoc = await getDoc(availabilityRef);
    
    if (!availabilityDoc.exists()) {
      console.error('No availability settings found for stylist:', stylistId);
      return null;
    }

    const data = availabilityDoc.data();
    console.log('Raw availability data:', data); // Debug log

    // Ensure the data has the expected structure
    if (!data.weeklySchedule) {
      console.error('Invalid availability data structure:', data);
      return null;
    }

    // Convert any Timestamp objects to strings
    const serializedData = serializeData(data);
    console.log('Serialized availability data:', serializedData); // Debug log

    return {
      exceptions: serializedData.exceptions || [],
      lastUpdated: serializedData.lastUpdated,
      weeklySchedule: serializedData.weeklySchedule
    };
  } catch (error) {
    console.error('Error fetching stylist schedule:', error);
    return null;
  }
}

function convertTo24Hour(time: string, period: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  return hour24 * 60 + minutes;
}

export async function checkStylistAvailabilityForTimeSlot(
  stylistId: string,
  startDateTime: Date,
  duration: number
): Promise<{ available: boolean; conflictReason?: string }> {
  try {
    // Get stylist's schedule
    const schedule = await getStylistSchedule(stylistId);
    if (!schedule) {
      return {
        available: false,
        conflictReason: 'Stylist schedule not found'
      };
    }

    // Get the day of the week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[startDateTime.getDay()];
    const daySchedule = schedule.weeklySchedule[dayName as keyof WeeklySchedule];

    // Check if the day is enabled
    if (!daySchedule.enabled) {
      return {
        available: false,
        conflictReason: 'Stylist is not available on this day'
      };
    }

    // Convert appointment time to minutes since midnight
    const appointmentStartHour = startDateTime.getHours();
    const appointmentStartMinutes = appointmentStartHour * 60 + startDateTime.getMinutes();
    const appointmentEndMinutes = appointmentStartMinutes + duration;

    // Check if the appointment fits in any of the available slots
    let slotFound = false;
    for (const slot of daySchedule.slots) {
      const slotStartMinutes = convertTo24Hour(slot.start, slot.startPeriod);
      const slotEndMinutes = convertTo24Hour(slot.end, slot.endPeriod);

      if (appointmentStartMinutes >= slotStartMinutes && 
          appointmentEndMinutes <= slotEndMinutes) {
        slotFound = true;
        break;
      }
    }

    if (!slotFound) {
      return {
        available: false,
        conflictReason: 'Appointment time is outside of working hours'
      };
    }

    // Check for existing appointments
    const appointmentDate = new Date(startDateTime);
    appointmentDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(appointmentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('stylistId', '==', stylistId),
      where('dateTime', '>=', Timestamp.fromDate(appointmentDate)),
      where('dateTime', '<', Timestamp.fromDate(nextDay))
    );
    
    const appointmentsSnapshot = await getDocs(q);
    const existingAppointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[];

    // Check for overlapping appointments
    for (const existing of existingAppointments) {
      if (existing.status === 'Cancelled') continue;

      const existingStart = existing.dateTime instanceof Timestamp 
        ? existing.dateTime.toDate() 
        : new Date(existing.dateTime);
      const existingEnd = new Date(existingStart.getTime() + existing.duration * 60000);

      const newStart = startDateTime;
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        return {
          available: false,
          conflictReason: 'Time slot conflicts with an existing appointment'
        };
      }
    }

    // Check exceptions if any
    if (schedule.exceptions && schedule.exceptions.length > 0) {
      const appointmentDateStr = startDateTime.toISOString().split('T')[0];
      const exception = schedule.exceptions.find(e => e.date === appointmentDateStr);
      
      if (exception) {
        return {
          available: false,
          conflictReason: 'Stylist has marked this day as unavailable'
        };
      }
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking stylist availability:', error);
    throw error;
  }
} 