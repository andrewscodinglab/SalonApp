import { getStylistById, getStylistServices } from '@/lib/stylistService';
import BookingForm from '@/components/BookingForm';
import { notFound } from 'next/navigation';
import { Stylist } from '@/types/stylist';
import { MapPin, Phone, Mail } from 'lucide-react';

type PageProps = {
  params: {
    stylistId: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Helper function to ensure data is serializable
function serializeData<T extends Record<string, any>>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default async function StylistBookingPage({ params }: PageProps) {
  const stylistId = await params?.stylistId;
  
  if (!stylistId) {
    throw new Error('Stylist ID is required');
  }

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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center text-center">
              {/* Logo and Business Name */}
              <div className="flex flex-col items-center mb-6">
                {stylistWithServices.profileImageUrl && (
                  <img
                    src={stylistWithServices.profileImageUrl}
                    alt={stylistWithServices.name}
                    className="w-20 h-20 rounded-full object-cover mb-4"
                  />
                )}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {stylistWithServices.name}
                </h1>
                {stylistWithServices.salonName && (
                  <p className="text-xl text-gray-600">{stylistWithServices.salonName}</p>
                )}
              </div>
              
              {/* Business Info */}
              <div className="flex items-center justify-center gap-8 text-gray-600 flex-wrap">
                {stylistWithServices.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{stylistWithServices.address}</span>
                  </div>
                )}
                {stylistWithServices.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    <span>{stylistWithServices.phone}</span>
                  </div>
                )}
                {stylistWithServices.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    <span>{stylistWithServices.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BookingForm stylist={stylistWithServices} />
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error loading stylist data:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">
            Unable to load stylist information. Please try again later.
          </p>
        </div>
      </div>
    );
  }
} 