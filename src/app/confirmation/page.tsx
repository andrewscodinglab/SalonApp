"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle } from "lucide-react";

interface Appointment {
  serviceName: string;
  date: string;
  time: string;
  price: number;
  status: string;
  paymentStatus?: string;
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      const appointmentId = searchParams.get("appointmentId");
      if (!appointmentId) return;

      try {
        const appointmentDoc = await getDoc(doc(db, "appointments", appointmentId));
        if (appointmentDoc.exists()) {
          setAppointment(appointmentDoc.data() as Appointment);
        }
      } catch (error) {
        console.error("Error fetching appointment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <p className="text-red-600">Appointment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your appointment has been confirmed.
        </p>
        <div className="text-left bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold mb-2">Appointment Details</h2>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span>{" "}
            {appointment.date}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Time:</span>{" "}
            {appointment.time}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Service:</span>{" "}
            {appointment.serviceName}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Amount Paid:</span>{" "}
            ${appointment.price}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Status:</span>{" "}
            {appointment.status}
          </p>
          {appointment.paymentStatus && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Payment Status:</span>{" "}
              {appointment.paymentStatus}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500">
          A confirmation email has been sent to your email address.
        </p>
      </div>
    </div>
  );
} 