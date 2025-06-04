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
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import ConsultationForm from '@/components/ConsultationForm';
import DateTimeSelector from '@/components/DateTimeSelector';
import { Clock, DollarSign, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

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
  const router = useRouter();

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
      // First check if client exists
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', watch('clientEmail')));
      const querySnapshot = await getDocs(q);
      
      let clientId;
      
      if (querySnapshot.empty) {
        // Create new client if they don't exist
        clientId = await createClient({
          email: watch('clientEmail'),
          phone: watch('clientPhone'),
          name: watch('clientName')
        });
      } else {
        clientId = querySnapshot.docs[0].id;
      }

      const consultationFormsRef = collection(db, `stylists/${stylist.id}/clientNotes/${clientId}/consultationForms`);
      
      const questionMetadata = stylist.consultationForm?.questions.reduce((acc, question) => {
        const metadata: Record<string, any> = {
          type: question.type,
          required: question.required
        };
        
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
        clientId: clientId,
        clientEmail: watch('clientEmail'),
        clientName: watch('clientName'),
        clientPhone: watch('clientPhone')
      };

      await addDoc(consultationFormsRef, consultationFormData);
      
      setClientConsultationData(formData);
      setConsultationFormCompleted(true);
      setShowConsultationForm(false);
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

      // Create payment intent and appointment
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: [selectedService.id],
          clientId,
          stylistId: stylist.id,
          amount: selectedService.price,
          date: new Date(data.dateTime).toISOString(),
          time: format(new Date(data.dateTime), 'HH:mm'),
          duration: selectedService.duration
        })
      });
      const { clientSecret, appointmentId, error } = await response.json();
      if (error) throw new Error(error);
      if (!clientSecret || !appointmentId) throw new Error('Failed to create payment intent.');

      // Add client to stylist's notes
      await setDoc(
        doc(db, `stylists/${stylist.id}/clientNotes/${clientId}`),
        {
          createdAt: Timestamp.now(),
          notes: data.notes || `New booking for ${selectedService.name}`,
        }
      );

      // Redirect to /pay page with appointmentId and clientSecret
      router.push(`/pay?serviceIds=${selectedService.id}&clientId=${clientId}&stylistId=${stylist.id}&amount=${selectedService.price}`);

      trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
        stylistId: stylist.id,
        serviceId: selectedService.id,
        appointmentId
      });
    } catch (error) {
      console.error('Booking failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while booking. Please try again.';
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
      <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-sm">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
          <p className="mb-6 text-gray-600">
            Thank you for booking with {stylist.name}. We'll send you a confirmation
            email shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Service Selection */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Select a Service</h2>
          <div className="grid grid-cols-2 gap-4">
            {stylist.services?.map((service) => (
              <div
                key={service.id}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                  watchServiceId === service.id
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                    : 'border-gray-200 hover:border-[#D4AF37]/50 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setValue('serviceId', service.id, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <span className="text-lg font-bold text-[#D4AF37]">${service.price}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {errors.serviceId && (
            <p className="mt-4 text-sm text-red-600">{errors.serviceId.message}</p>
          )}
          
          {/* Hidden service select for form handling */}
          <select
            {...register('serviceId')}
            className="hidden"
          >
            <option value="">Select a service</option>
            {stylist.services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Column - Date/Time and Contact Info */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Select Date & Time</h2>
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

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Your Information</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="clientName"
                  {...register('clientName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="Your phone number"
                />
                {errors.clientPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientPhone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  rows={3}
                  placeholder="Any special requests or notes"
                />
              </div>

              {selectedService && (
                <div className="p-6 bg-gray-50 rounded-lg mt-6">
                  <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <div className="space-y-1">
                        <span className="text-gray-600">Service</span>
                        <p className="font-medium">{selectedService.name}</p>
                      </div>
                      <span className="text-lg font-bold text-[#D4AF37]">${selectedService.price}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Duration</span>
                      </div>
                      <span className="font-medium">{selectedService.duration} minutes</span>
                    </div>
                    {watch('dateTime') && (
                      <>
                        <div className="flex justify-between py-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Date</span>
                          </div>
                          <span className="font-medium">
                            {format(new Date(watch('dateTime')), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Time</span>
                          </div>
                          <span className="font-medium">
                            {format(new Date(watch('dateTime')), 'h:mm a')}
                          </span>
                        </div>
                      </>
                    )}
                    {stylist.consultationForm && (
                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                        <span className="text-gray-600">Consultation Status</span>
                        <span className={`font-medium flex items-center gap-1 ${consultationFormCompleted ? 'text-[#D4AF37]' : 'text-amber-600'}`}>
                          {consultationFormCompleted ? (
                            <>
                              <span>✓</span>
                              <span>Completed</span>
                            </>
                          ) : (
                            'Required'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
                  {submitError}
                </div>
              )}

              {stylist.consultationForm && !consultationFormCompleted ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowConsultationForm(true)}
                    className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
                  >
                    Fill Out Consultation Form
                  </button>
                  <button
                    type="submit"
                    disabled
                    className="w-full bg-gray-200 text-gray-500 font-medium py-3 px-4 rounded-md shadow-sm cursor-not-allowed"
                  >
                    Book Appointment
                    <span className="block text-sm font-normal">
                      Please complete consultation form first
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedService}
                  className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>Booking...</span>
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 