import { collection, doc, setDoc, Timestamp, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

export interface ClientNote {
  createdAt: Timestamp;
  notes: string;
  clientId: string;
  stylistId: string;
  appointmentId: string;
}

export interface Client {
  id: string;
  createdAt: string;
  email: string;
  name: string;
  phone: string;
  updatedAt: string;
  userId: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  stylistId: string;
  date: Timestamp;
  service: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export async function findClientByEmailAndPhone(email: string, phone: string): Promise<Client | null> {
  try {
    const clientsRef = collection(db, 'clients');
    const q = query(
      clientsRef,
      where('email', '==', email),
      where('phone', '==', phone)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Client;
    }

    return null;
  } catch (error) {
    console.error('Error finding client:', error);
    throw error;
  }
}

export async function createClient(data: { 
  email: string; 
  phone: string; 
  name: string; 
}): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();

  const clientData: Client = {
    id,
    userId: id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(doc(db, 'clients', id), clientData);
  return id;
}

export async function createAppointment(
  clientData: { email: string; phone: string; name: string },
  appointmentData: Omit<Appointment, 'id' | 'clientId'>
): Promise<{ client: Client; appointment: Appointment }> {
  try {
    // First check if client exists
    let client = await findClientByEmailAndPhone(clientData.email, clientData.phone);
    
    // If client doesn't exist, create new client
    if (!client) {
      client = await createClient(clientData);
    }

    // At this point, client is guaranteed to exist and not be null
    const appointmentId = uuidv4();
    const appointmentRef = doc(collection(db, 'appointments'), appointmentId);
    
    const appointment: Appointment = {
      ...appointmentData,
      id: appointmentId,
      clientId: client.id,
    };

    await setDoc(appointmentRef, appointment);

    // Check if client exists in stylist's notes
    const stylistClientNoteRef = doc(db, `stylists/${appointmentData.stylistId}/clientNotes/${client.id}`);
    const stylistClientNote = await getDoc(stylistClientNoteRef);

    // If client doesn't exist in stylist's notes, create new note
    if (!stylistClientNote.exists() && appointmentData.notes) {
      const noteData: ClientNote = {
        createdAt: Timestamp.now(),
        notes: appointmentData.notes,
        clientId: client.id,
        stylistId: appointmentData.stylistId,
        appointmentId
      };

      await setDoc(stylistClientNoteRef, noteData);
    }

    return { client, appointment };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function addClientNote(
  stylistId: string,
  clientId: string,
  notes: string,
  appointmentId: string
): Promise<void> {
  try {
    const noteRef = doc(collection(db, `stylists/${stylistId}/clientNotes`), clientId);
    
    const noteData: ClientNote = {
      createdAt: Timestamp.now(),
      notes,
      clientId,
      stylistId,
      appointmentId
    };

    await setDoc(noteRef, noteData);
  } catch (error) {
    console.error('Error adding client note:', error);
    throw error;
  }
}

export async function findOrCreateClient(data: {
  email: string;
  phone: string;
  name: string;
}): Promise<string> {
  try {
    // First try to find existing client
    const clientsRef = collection(db, 'clients');
    const q = query(
      clientsRef,
      where('email', '==', data.email),
      where('phone', '==', data.phone)
    );

    const querySnapshot = await getDocs(q);
    
    // If client exists, return their ID
    if (!querySnapshot.empty) {
      const existingClient = querySnapshot.docs[0].data() as Client;
      return existingClient.id;
    }

    // If no existing client, create new one
    const newId = uuidv4();
    const now = new Date().toISOString();
    
    const clientData: Client = {
      id: newId,
      userId: newId, // Using same ID for both fields as per example
      email: data.email,
      name: data.name,
      phone: data.phone,
      createdAt: now,
      updatedAt: now
    };

    const newClientRef = doc(clientsRef, newId);
    await setDoc(newClientRef, clientData);
    
    return newId;
  } catch (error) {
    console.error('Error in findOrCreateClient:', error);
    throw error;
  }
} 