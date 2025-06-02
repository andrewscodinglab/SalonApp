import React from 'react';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <main className="min-h-screen bg-[#FCFAF6] flex flex-col items-center py-16 px-4">
      {/* Logo Header */}
      <Link href="/" className="mb-8 block">
        <img src="/SalonProLogo.png" alt="SalonPro Logo" className="h-12 md:h-16 w-auto mx-auto" />
      </Link>
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 border border-[#F2EAD3]">
        <h1 className="text-3xl font-bold text-[#A88C4A] mb-2 text-center">Learn More About SalonPro</h1>
        <p className="text-[#7C6B3F] mb-6 text-center">Discover how SalonPro can help you manage and grow your salon business with ease.</p>
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#A88C4A] mb-1">All-in-One Booking</h2>
          <p className="text-[#7C6B3F]">Easily manage appointments, clients, and services from one intuitive platform. SalonPro streamlines your workflow so you can focus on what matters most—your clients.</p>
        </section>
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#A88C4A] mb-1">Client Management</h2>
          <p className="text-[#7C6B3F]">Keep track of client preferences, history, and contact details. Build lasting relationships and deliver personalized experiences every time.</p>
        </section>
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-[#A88C4A] mb-1">Automated Reminders</h2>
          <p className="text-[#7C6B3F]">Reduce no-shows and keep your schedule full with automated appointment reminders sent directly to your clients.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-[#A88C4A] mb-1">Secure Payments</h2>
          <p className="text-[#7C6B3F]">Accept payments quickly and securely, making checkout a breeze for both you and your clients.</p>
        </section>
        <div className="text-center">
          <a href="/" className="inline-block bg-[#E2C275] text-[#7C6B3F] px-8 py-3 rounded-full font-semibold text-lg shadow hover:bg-[#CBB06A] transition-all">Get Started with SalonPro</a>
        </div>
      </div>
    </main>
  );
} 