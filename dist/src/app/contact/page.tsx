import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FCFAF6] flex flex-col items-center justify-center py-16 px-4">
      {/* Logo Header */}
      <Link href="/" className="mb-8 block">
        <img src="/SalonProLogo.png" alt="SalonPro Logo" className="h-12 md:h-16 w-auto mx-auto" />
      </Link>
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 border border-[#F2EAD3]">
        <h1 className="text-3xl font-bold text-[#A88C4A] mb-2 text-center">Contact Us</h1>
        <p className="text-[#7C6B3F] mb-6 text-center">We'd love to hear from you! Fill out the form below or reach us directly.</p>
        <form className="flex flex-col gap-4 mb-6">
          <input type="text" placeholder="Your Name" className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275]" />
          <input type="email" placeholder="Your Email" className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275]" />
          <textarea placeholder="Your Message" rows={4} className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275] resize-none" />
          <button type="submit" className="bg-[#E2C275] text-[#7C6B3F] px-6 py-3 rounded-lg font-semibold hover:bg-[#CBB06A] transition-all mt-2">Send Message</button>
        </form>
        <div className="text-center text-[#7C6B3F] text-sm">
          <div className="mb-1">Email: <a href="mailto:hello@salonpro.com" className="text-[#A88C4A] underline">hello@salonpro.com</a></div>
          <div className="mb-1">Phone: <a href="tel:+1234567890" className="text-[#A88C4A] underline">(123) 456-7890</a></div>
          <div>123 SalonPro Ave, Suite 100, Beauty City, USA</div>
        </div>
      </div>
    </main>
  );
} 