'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Scale, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/90 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/phsweblogo.png" 
                alt="Sabi-WiFi by PHSWEB"
                className="h-16 w-auto"
              />
            </Link>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-blue-500/20 p-4">
                <Scale className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-xl text-gray-300">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-blue-400" />
                Acceptance of Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using Sabi-WiFi by PHSWEB services, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Internet Service</h2>
              <div className="space-y-4 text-gray-300">
                <p>Sabi-WiFi by PHSWEB provides residential and business internet connectivity services including:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>High-speed broadband internet access</li>
                  <li>Wi-Fi connectivity solutions</li>
                  <li>Technical support and maintenance</li>
                  <li>Network infrastructure services</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Service Availability</h2>
              <p className="text-gray-300 leading-relaxed">
                While we strive to provide 99.9% uptime, internet service may be temporarily unavailable due to 
                maintenance, upgrades, or circumstances beyond our control. We are not liable for service 
                interruptions, but will work diligently to restore service as quickly as possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Payment Terms</h2>
              <div className="space-y-4 text-gray-300">
                <p>Payment for services is due in advance according to your selected plan:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Monthly plans: Payment due on the same date each month</li>
                  <li>Annual plans: Payment due annually on the subscription date</li>
                  <li>Late payments may result in service suspension</li>
                  <li>All prices are in Nigerian Naira (₦) and include applicable taxes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Acceptable Use Policy</h2>
              <div className="space-y-4 text-gray-300">
                <p>Customers agree not to use our services for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Illegal activities or content distribution</li>
                  <li>Spamming or unauthorized bulk email</li>
                  <li>Network attacks or security breaches</li>
                  <li>Excessive bandwidth usage that affects other users</li>
                  <li>Reselling services without written permission</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Privacy and Data</h2>
              <p className="text-gray-300 leading-relaxed">
                We respect your privacy and handle your personal data in accordance with our Privacy Policy. 
                We may collect usage data to improve service quality and for billing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
              <p className="text-gray-300 leading-relaxed">
                Either party may terminate service with 30 days written notice. We reserve the right to 
                immediately terminate service for violations of these terms or non-payment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                Sabi-WiFi by PHSWEB&apos;s liability is limited to the monthly service fee. We are not responsible 
                for indirect damages, data loss, or business interruption resulting from service use or outages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
              <div className="space-y-2 text-gray-300">
                <p>For questions about these Terms of Service, contact us:</p>
                <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                  <p><strong>Email:</strong> legal@phsweb.ng</p>
                  <p><strong>Phone:</strong> 02014101240</p>
                  <p><strong>Address:</strong> 2nd floor, Grace And Faith House, Onitsha - Enugu Expy, Awka 420212, Anambra</p>
                </div>
              </div>
            </section>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/privacy">
              <Button variant="outline" className="w-full sm:w-auto">
                <Shield className="mr-2 h-4 w-4" />
                View Privacy Policy
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="w-full sm:w-auto">
                Contact Support
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <span className="text-blue-400 font-bold text-xl">Sabi-WiFi by PHSWEB</span>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-400">
            &copy; {new Date().getFullYear()} Sabi-WiFi by PHSWEB. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage; 