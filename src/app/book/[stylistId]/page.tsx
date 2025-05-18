import { getStylistById, getStylistServices } from '@/lib/stylistService';
import BookingForm from '@/components/BookingForm';
import { notFound } from 'next/navigation';
import { Stylist } from '@/types/stylist';

interface PageProps {
  params: {
    stylistId: string;
  };
}

// Helper function to ensure data is serializable
function serializeData<T extends Record<string, any>>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default async function StylistBookingPage({ params }: PageProps) {
  const stylistId = params.stylistId;
  
  try {
    const [stylist, services] = await Promise.all([
      getStylistById(stylistId),
      getStylistServices(stylistId)
    ]);
    
    if (!stylist) {
      notFound();
    }

    if (!services || services.length === 0) {
      throw new Error('No services found for this stylist');
    }
    
    // Combine stylist data with their services and ensure it's serializable
    const stylistWithServices: Stylist = serializeData({
      ...stylist,
      services
    });

    return (
      <main className="page-container">
        <BookingForm stylist={stylistWithServices} />
      </main>
    );
  } catch (error) {
    console.error('Error loading stylist data:', error);
    return (
      <main className="page-container">
        <h1 className="text-page-title mb-12">Error</h1>
        <p className="text-center text-red-500">
          Unable to load stylist information. Please try again later.
        </p>
      </main>
    );
  }
} 