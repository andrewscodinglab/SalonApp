"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Gather params for /checkout
    const serviceIds = searchParams.get("serviceIds");
    const clientId = searchParams.get("clientId");
    const stylistId = searchParams.get("stylistId");
    const amount = searchParams.get("amount");
    if (serviceIds && clientId && stylistId && amount) {
      router.replace(`/checkout?services=${serviceIds}&clientId=${clientId}&stylistId=${stylistId}&amount=${amount}`);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <p>Redirecting to secure payment...</p>
      </div>
    </div>
  );
} 