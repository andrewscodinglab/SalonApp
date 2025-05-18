import Link from 'next/link';
import { getAllStylists } from '@/lib/stylistService';

export default async function Home() {
  try {
    const stylists = await getAllStylists();

    return (
      <main className="page-container">
        <h1 className="text-page-title mb-12">SalonPro</h1>
        <h2 className="text-page-title mb-8">Choose Your Stylist</h2>
        
        <div className="grid gap-6">
          {stylists.map((stylist) => (
            <Link
              key={stylist.id}
              href={`/book/${stylist.id}`}
              className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {stylist.profileImageUrl && (
                  <img
                    src={stylist.profileImageUrl}
                    alt={stylist.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold mb-1">{stylist.name}</h3>
                  {stylist.salonName && (
                    <p className="text-gray-600 text-sm mb-2">{stylist.salonName}</p>
                  )}
                  <p className="text-gray-500 text-sm">
                    Booking Link: /book/{stylist.id}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {stylists.length === 0 && (
          <p className="text-center text-gray-500">
            No stylists found. Please check back later.
          </p>
        )}
      </main>
    );
  } catch (error) {
    console.error('Error fetching stylists:', error);
    return (
      <main className="page-container">
        <h1 className="text-page-title mb-12">SalonPro</h1>
        <p className="text-center text-red-500">
          Error loading stylists. Please try again later.
        </p>
      </main>
    );
  }
}
