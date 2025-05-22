"use client";
import Link from 'next/link';
import { getAllStylists } from '@/lib/stylistService';
import { Calendar, Users, Clock, Sparkles, Download, Star, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';

const screenshots = [
  '/ss1.png',
  '/ss2.png',
  '/ss3.png',
  '/ss4.png',
  '/ss5.png',
];

export default async function Home() {
  // Contact form state (client-side only)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // Contact form submit handler
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactSuccess('');
    setContactError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContactSuccess('Thank you! Your message has been sent.');
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setContactError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setContactError('Something went wrong. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  try {
    const stylists = await getAllStylists();

    return (
      <main className="min-h-screen bg-[#FCFAF6]">
        {/* Hero Section - Inspired by Signature Salon, Clean and Centered */}
        <section className="bg-gradient-to-b from-[#F7F3E8] to-[#FCFAF6] py-12 md:py-20">
          <div className="container mx-auto px-4 flex flex-col items-center text-center">
            {/* Logo at the top */}
            <div className="mb-4 flex flex-col items-center">
              <img src="/SalonProLogo.png" alt="SalonPro Logo" className="h-14 md:h-20 w-auto mb-2" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Your Ultimate <span className="text-[#E2C275]">Salon</span> Booking Solution!
            </h1>
            <p className="text-lg md:text-xl mb-6 text-[#7C6B3F] max-w-2xl mx-auto">
              Book, manage, and grow your salon business—all in one beautiful app. Designed for professionals who want a seamless, modern experience.
            </p>
            {/* Stats/Trust Signals */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-[#A88C4A]">1M+</span>
                <span className="text-[#7C6B3F] text-sm">Appointments Booked</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-[#A88C4A]">10K+</span>
                <span className="text-[#7C6B3F] text-sm">Partner Businesses</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-[#A88C4A]">100K+</span>
                <span className="text-[#7C6B3F] text-sm">Stylists</span>
              </div>
            </div>
            {/* App Screenshots - Dribbble Inspired Floating Layout */}
            <div className="relative flex justify-center items-end mb-8 w-full min-h-[260px] md:min-h-[340px]">
              {/* Left Screenshot */}
              <div className="absolute left-1/3 -translate-x-[120%] md:-translate-x-[160%] bottom-0 z-10 w-28 md:w-40 rotate-[-12deg]" style={{filter:'drop-shadow(0 8px 24px #E2C27533)'}}>
                <img src="/BBECFEAA-8871-4E35-864B-E1ABB9888045_4_5005_c.jpeg" alt="SalonPro screenshot C" className="rounded-3xl border-4 border-[#FCFAF6]" />
              </div>
              {/* Center Screenshot */}
              <div className="relative z-20 w-40 md:w-60 scale-110" style={{filter:'drop-shadow(0 12px 32px #E2C27555)'}}>
                <img src="/25AC08CA-65F7-4275-BFB2-29E6CC6C1245_4_5005_c.jpeg" alt="SalonPro screenshot D" className="rounded-3xl border-4 border-[#FCFAF6]" />
              </div>
              {/* Right Screenshot */}
              <div className="absolute left-1/2 translate-x-[120%] md:translate-x-[160%] bottom-0 z-10 w-28 md:w-40 rotate-[12deg]" style={{filter:'drop-shadow(0 8px 24px #E2C27533)'}}>
                <img src="/46F9CD0E-4AA6-4C7A-832B-24B00AF7C126_4_5005_c.jpeg" alt="SalonPro screenshot B" className="rounded-3xl border-4 border-[#FCFAF6]" />
              </div>
            </div>
            {/* App Store Buttons */}
            <div className="flex gap-4 justify-center mb-8">
              <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-all font-semibold shadow">
                <svg width="20" height="20" fill="currentColor" className="inline-block"><rect width="20" height="20" rx="4"/></svg>
                App Store
              </button>
            </div>
          </div>
        </section>

        {/* Customer Testimonial Section - Horizontal Scrollable */}
        <section className="py-12 bg-[#FCFAF6]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-left mb-8 text-[#A88C4A]">Customer Reviews</h2>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#E2C275]/60 scrollbar-track-[#FCFAF6]">
              {/* Testimonial 1 */}
              <div className="min-w-[320px] max-w-xs bg-white rounded-2xl shadow-lg p-6 border border-[#F2EAD3] flex flex-col snap-center">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-[#E2C275]" fill="currentColor" viewBox="0 0 20 20"><polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" /></svg>
                  ))}
                </div>
                <h3 className="font-bold text-lg mb-1 text-[#A88C4A]">The best booking system</h3>
                <p className="text-[#7C6B3F] text-sm mb-4">Great experience, easy to book. Paying for treatments is so convenient — no cash or cards needed!</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-[#E2C275] flex items-center justify-center text-white font-bold">L</div>
                  <div className="text-left">
                    <div className="font-semibold text-[#A88C4A]">Lucy</div>
                    <div className="text-xs text-[#7C6B3F]">London, UK</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 2 */}
              <div className="min-w-[320px] max-w-xs bg-white rounded-2xl shadow-lg p-6 border border-[#F2EAD3] flex flex-col snap-center">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-[#E2C275]" fill="currentColor" viewBox="0 0 20 20"><polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" /></svg>
                  ))}
                </div>
                <h3 className="font-bold text-lg mb-1 text-[#A88C4A]">Easy to use & explore</h3>
                <p className="text-[#7C6B3F] text-sm mb-4">SalonPro's reminders make life so much easier. I also found a few good stylists I didn't know existed.</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-[#E2C275] flex items-center justify-center text-white font-bold">D</div>
                  <div className="text-left">
                    <div className="font-semibold text-[#A88C4A]">Dan</div>
                    <div className="text-xs text-[#7C6B3F]">New York, USA</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 3 */}
              <div className="min-w-[320px] max-w-xs bg-white rounded-2xl shadow-lg p-6 border border-[#F2EAD3] flex flex-col snap-center">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-[#E2C275]" fill="currentColor" viewBox="0 0 20 20"><polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" /></svg>
                  ))}
                </div>
                <h3 className="font-bold text-lg mb-1 text-[#A88C4A]">Professional & Polished</h3>
                <p className="text-[#7C6B3F] text-sm mb-4">I love how professional my business looks with SalonPro. My clients always compliment the booking experience.</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-[#E2C275] flex items-center justify-center text-white font-bold">S</div>
                  <div className="text-left">
                    <div className="font-semibold text-[#A88C4A]">Samantha</div>
                    <div className="text-xs text-[#7C6B3F]">Austin, TX</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 4 */}
              <div className="min-w-[320px] max-w-xs bg-white rounded-2xl shadow-lg p-6 border border-[#F2EAD3] flex flex-col snap-center">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-[#E2C275]" fill="currentColor" viewBox="0 0 20 20"><polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,19.02 10,15.27 4.18,19.02 6,12.14 0.49,7.64 7.41,7.36" /></svg>
                  ))}
                </div>
                <h3 className="font-bold text-lg mb-1 text-[#A88C4A]">Time-saving & Reliable</h3>
                <p className="text-[#7C6B3F] text-sm mb-4">The reminders and easy booking have saved me so much time. Highly recommend SalonPro!</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-[#E2C275] flex items-center justify-center text-white font-bold">J</div>
                  <div className="text-left">
                    <div className="font-semibold text-[#A88C4A]">Jordan</div>
                    <div className="text-xs text-[#7C6B3F]">San Diego, CA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Download the App Section - Inspired by Fresha */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#A88C4A]">Download the SalonPro App</h2>
            <p className="text-lg text-[#7C6B3F] mb-6 max-w-xl mx-auto">Book unforgettable beauty and wellness experiences with the SalonPro mobile app.</p>
            <a href="#" className="inline-block mb-8">
              <button className="bg-[#E2C275] text-[#7C6B3F] px-8 py-3 rounded-full font-semibold text-lg shadow hover:bg-[#CBB06A] transition-all">Get the app</button>
            </a>
            <div className="flex justify-center w-full">
              <div className="rounded-3xl shadow-2xl border-0 border-[#FCFAF6] overflow-hidden max-w-xs w-full aspect-[9/18] bg-black">
                <video
                  src="/ScreenRecording_05-19-2025 15-20-06_1.mov"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features/Benefits Section - Grid with Icons */}
        <section className="py-12 md:py-20 bg-[#F7F3E8]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-[#A88C4A]">Experience the Best with SalonPro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Convenient Booking</h3>
                <p className="text-[#7C6B3F] text-sm">Book appointments anytime, anywhere with just a few taps.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Real-Time Availability</h3>
                <p className="text-[#7C6B3F] text-sm">See up-to-date schedules and never miss an open slot.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Personalized Services</h3>
                <p className="text-[#7C6B3F] text-sm">Tailor your experience and keep track of client preferences.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Timely Reminders</h3>
                <p className="text-[#7C6B3F] text-sm">Automated notifications so you and your clients never miss an appointment.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Secure Payments</h3>
                <p className="text-[#7C6B3F] text-sm">Fast, safe, and easy payments for every booking.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#F2EAD3] flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#F7F3E8] rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-[#A88C4A]" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#A88C4A]">Exclusive Offers</h3>
                <p className="text-[#7C6B3F] text-sm">Unlock special deals and loyalty rewards for your clients.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Us Section (replaces Stylists Section) */}
        <section id="contact" className="py-12 md:py-20 bg-[#FCFAF6]">
          <div className="container mx-auto px-4 flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-[#A88C4A]">Contact Us</h2>
            <p className="text-[#7C6B3F] mb-6 text-center max-w-xl">Have questions or want to get in touch? Fill out the form below and our team will get back to you as soon as possible.</p>
            <form onSubmit={handleContactSubmit} className="flex flex-col gap-4 w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-[#F2EAD3]">
              <input
                type="text"
                placeholder="Your Name"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                required
              />
              <textarea
                placeholder="Your Message"
                rows={4}
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                className="px-4 py-3 rounded-lg border border-[#E2C275] bg-[#FCFAF6] text-[#7C6B3F] focus:outline-none focus:ring-2 focus:ring-[#E2C275] resize-none"
                required
              />
              <button
                type="submit"
                className="bg-[#E2C275] text-[#7C6B3F] px-6 py-3 rounded-lg font-semibold hover:bg-[#CBB06A] transition-all mt-2 disabled:opacity-60"
                disabled={contactLoading}
              >
                {contactLoading ? 'Sending...' : 'Send Message'}
              </button>
              {contactSuccess && <div className="text-green-600 text-center mt-2">{contactSuccess}</div>}
              {contactError && <div className="text-red-500 text-center mt-2">{contactError}</div>}
            </form>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="bg-[#F7F3E8] border-t border-[#E2C275]/30 mt-16">
          <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand/Logo */}
            <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
              <img src="/SalonProLogo.png" alt="SalonPro Logo" className="h-10 w-auto mb-2" />
              <span className="text-[#A88C4A] font-bold text-lg">SalonPro</span>
              <span className="text-[#7C6B3F] text-xs mt-1">© {new Date().getFullYear()} SalonPro. All rights reserved.</span>
            </div>
            {/* Navigation */}
            <div className="flex flex-col items-center gap-2">
              <a href="/contact" className="text-[#A88C4A] hover:underline font-medium">Contact Us</a>
              <a href="/learn-more" className="text-[#A88C4A] hover:underline font-medium">Learn More</a>
            </div>
            {/* Social Media */}
            <div className="flex gap-4 items-center justify-center">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:scale-110 transition-transform">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#E2C275"/><path d="M16.5 7.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm-4.5 1.25A3.25 3.25 0 1 1 8.75 12 3.25 3.25 0 0 1 12 8.75Zm0 5.25A2 2 0 1 0 10 12a2 2 0 0 0 2 2Zm4.25-5.25a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 7.25 8.75v4.5A2.25 2.25 0 0 0 9.5 15.5h4.5a2.25 2.25 0 0 0 2.25-2.25v-4.5ZM12 6.5a5.5 5.5 0 1 1-5.5 5.5A5.5 5.5 0 0 1 12 6.5Z" fill="#A88C4A"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:scale-110 transition-transform">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#E2C275"/><path d="M15.5 8.5h-1a.5.5 0 0 0-.5.5v1h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H14v4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-4h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1v-1a2 2 0 0 1 2-2h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5Z" fill="#A88C4A"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:scale-110 transition-transform">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#E2C275"/><path d="M17.316 9.246c.008.11.008.22.008.33 0 3.36-2.56 7.24-7.24 7.24A7.2 7.2 0 0 1 5 15.29c.13.016.26.024.39.024a5.1 5.1 0 0 0 3.16-1.09 2.55 2.55 0 0 1-2.38-1.77c.16.024.32.04.49.04.23 0 .46-.03.67-.09a2.54 2.54 0 0 1-2.04-2.5v-.03c.34.19.73.3 1.15.32a2.54 2.54 0 0 1-.79-3.39 7.22 7.22 0 0 0 5.24 2.66 2.54 2.54 0 0 1 4.33-2.32 5.08 5.08 0 0 0 1.61-.62 2.54 2.54 0 0 1-1.12 1.4 5.08 5.08 0 0 0 1.46-.4 5.44 5.44 0 0 1-1.27 1.32Z" fill="#A88C4A"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
    );
  } catch (error) {
    console.error('Error fetching stylists:', error);
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#FCFAF6]">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-red-500 mb-4">Oops!</h1>
          <p className="text-[#7C6B3F]">
          Error loading stylists. Please try again later.
        </p>
        </div>
      </main>
    );
  }
}
