'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { Stylist, Service } from '@/types/stylist';
import { createAppointment } from '@/lib/stylistService';
import type { Appointment } from '@/types/appointment';
import { findClientByEmailAndPhone, createClient, addClientNote } from '@/lib/clientService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import ConsultationForm from '@/components/ConsultationForm';
import DateTimeSelector from '@/components/DateTimeSelector';

interface BookingFormProps {
  stylist: Stylist;
}

const bookingSchema = z.object({
  clientName: z.string().min(2, 'Name must be at least 2 characters'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  serviceId: z.string().min(1, 'Please select a service'),
  dateTime: z.string().refine((date) => {
    try {
      const parsedDate = new Date(date);
      return parsedDate > new Date();
    } catch {
      return false;
    }
  }, 'Please select a valid future date and time'),
  notes: z.string(),
});

type FormData = z.infer<typeof bookingSchema>;

export default function BookingForm({ stylist }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [consultationFormCompleted, setConsultationFormCompleted] = useState(false);
  const [clientConsultationData, setClientConsultationData] = useState<Record<string, any> | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      notes: '',
    },
  });

  const watchServiceId = watch('serviceId');

  // Update selected service when serviceId changes
  useEffect(() => {
    if (watchServiceId && stylist.services) {
      const service = stylist.services.find(s => s.id === watchServiceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [watchServiceId, stylist.services]);

  const checkConsultationFormStatus = async (email: string, clientId: string) => {
    if (!stylist.consultationForm) return true;
    
    try {
      const consultationRef = collection(db, `stylists/${stylist.id}/clientNotes/${clientId}/consultationForms`);
      const consultationSnapshot = await getDocs(consultationRef);
      
      if (!consultationSnapshot.empty) {
        const formData = consultationSnapshot.docs[0].data();
        setClientConsultationData(formData.responses);
        setConsultationFormCompleted(true);
        return true;
      }

      // Check if we already have consultation data in state
      if (clientConsultationData) {
        setConsultationFormCompleted(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking consultation form status:', error);
      return false;
    }
  };

  const handleConsultationFormSubmit = async (formData: Record<string, any>) => {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', watch('clientEmail')));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const clientDoc = querySnapshot.docs[0];
        const consultationFormsRef = collection(db, `stylists/${stylist.id}/clientNotes/${clientDoc.id}/consultationForms`);
        
        // Create metadata about the questions
        const questionMetadata = stylist.consultationForm?.questions.reduce((acc, question) => {
          const metadata: Record<string, any> = {
            type: question.type,
            required: question.required
          };
          
          // Only add options if they exist
          if (question.options && question.options.length > 0) {
            metadata.options = question.options;
          }
          
          acc[question.text] = metadata;
          return acc;
        }, {} as Record<string, any>) || {};

        const consultationFormData = {
          responses: formData,
          questions: questionMetadata,
          formName: stylist.consultationForm?.name,
          submittedAt: Timestamp.now(),
          stylistId: stylist.id,
          clientId: clientDoc.id,
          clientEmail: watch('clientEmail'),
          clientName: watch('clientName'),
          clientPhone: watch('clientPhone')
        };

        await addDoc(consultationFormsRef, consultationFormData);
        
        setClientConsultationData(formData);
        setConsultationFormCompleted(true);
        setShowConsultationForm(false);
      }
    } catch (error) {
      console.error('Error saving consultation form:', error);
      setSubmitError('Failed to save consultation form. Please try again.');
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setAvailabilityError(null);

    try {
      if (!selectedService) {
        throw new Error('Please select a service');
      }

      // Check if client exists first
      const existingClient = await findClientByEmailAndPhone(data.clientEmail, data.clientPhone);
      
      // Get client ID - either existing or new
      const clientId = existingClient ? existingClient.id : await createClient({
        email: data.clientEmail,
        phone: data.clientPhone,
        name: data.clientName
      });

      // Check consultation form status first
      if (stylist.consultationForm && !consultationFormCompleted) {
        const hasCompletedForm = await checkConsultationFormStatus(data.clientEmail, clientId);
        if (!hasCompletedForm) {
          setShowConsultationForm(true);
          setIsSubmitting(false);
          return;
        }
      }

      const appointmentData: Omit<Appointment, 'id' | 'createdAt'> = {
        clientId,
        clientName: data.clientName,
        dateTime: new Date(data.dateTime),
        duration: selectedService.duration,
        notes: data.notes || '',
        price: `$${selectedService.price.toFixed(2)}`,
        serviceIds: [selectedService.id],
        serviceName: selectedService.name,
        stylistId: stylist.id,
        status: 'Scheduled'
      };

      const appointmentId = await createAppointment(appointmentData);

      if (appointmentId) {
        // Add client to stylist's notes
        await setDoc(
          doc(db, `stylists/${stylist.id}/clientNotes/${clientId}`),
          {
            createdAt: Timestamp.now(),
            notes: data.notes || `New booking for ${selectedService.name}`,
          }
        );

        setSubmitSuccess(true);
        trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
          stylistId: stylist.id,
          serviceId: selectedService.id,
          appointmentId
        });
      } else {
        throw new Error('Failed to create appointment. Please try again.');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while booking. Please try again.';
      
      // Check if it's an availability error
      if (errorMessage.includes('Time slot') || errorMessage.includes('available')) {
        setAvailabilityError(errorMessage);
      } else {
        setSubmitError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showConsultationForm && stylist.consultationForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <ConsultationForm
          form={stylist.consultationForm}
          onSubmit={handleConsultationFormSubmit}
          onBack={() => setShowConsultationForm(false)}
        />
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <>
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
          <p className="mb-6">
            Thank you for booking with {stylist.name}. We'll send you a confirmation
            email shortly.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => setShowCreateAccount(true)}
              className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
            >
              Create Account to Manage Bookings
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full text-[#D4AF37] hover:text-[#C5A028] font-medium underline"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {stylist.consultationForm && clientConsultationData && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <p className="text-green-700">
            ✓ Consultation form completed
          </p>
        </div>
      )}
      
      {availabilityError && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700">
            {availabilityError}
          </p>
          <p className="text-sm text-red-600 mt-2">
            Please select a different time slot or contact the stylist directly for special arrangements.
          </p>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book with {stylist.name}</h1>
        {stylist.salonName && (
          <p className="text-gray-600">{stylist.salonName}</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="clientName"
            {...register('clientName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
            placeholder="Enter your name"
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="clientEmail"
            {...register('clientEmail')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
            placeholder="your@email.com"
          />
          {errors.clientEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.clientEmail.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="clientPhone"
            {...register('clientPhone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
            placeholder="Your phone number"
          />
          {errors.clientPhone && (
            <p className="mt-1 text-sm text-red-600">{errors.clientPhone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            id="serviceId"
            {...register('serviceId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold bg-white"
          >
            <option value="">Select a service</option>
            {stylist.services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - ${service.price} ({service.duration} min)
              </option>
            ))}
          </select>
          {errors.serviceId && (
            <p className="mt-1 text-sm text-red-600">{errors.serviceId.message}</p>
          )}
        </div>

        <div>
          <DateTimeSelector
            stylistId={stylist.id}
            selectedService={selectedService ? {
              duration: selectedService.duration
            } : undefined}
            value={watch('dateTime')}
            onChange={(dateTime) => {
              setValue('dateTime', dateTime, {
                shouldValidate: true,
                shouldDirty: true
              });
            }}
          />
          {errors.dateTime && (
            <p className="mt-1 text-sm text-red-600">{errors.dateTime.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
            rows={3}
            placeholder="Any special requests or notes"
          />
        </div>

        {selectedService && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">Booking Summary</h3>
            <p>Service: {selectedService.name}</p>
            <p>Duration: {selectedService.duration} minutes</p>
            <p>Price: ${selectedService.price}</p>
          </div>
        )}

        {submitError && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !selectedService}
          className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
} 