'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const PrivacyPage: React.FC = () => {
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
              <div className="rounded-full bg-green-500/20 p-4">
                <Shield className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-300">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Privacy Content */}
          <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <Eye className="h-6 w-6 text-green-400" />
                Our Commitment to Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                At Sabi-WiFi by PHSWEB, we are committed to protecting your privacy and personal information. 
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <Database className="h-6 w-6 text-blue-400" />
                Information We Collect
              </h2>
              <div className="space-y-4 text-gray-300">
                <h3 className="text-lg font-semibold text-white">Personal Information:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Name, email address, and phone number</li>
                  <li>Billing address and payment information</li>
                  <li>Service installation address</li>
                  <li>Account credentials and preferences</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-white mt-6">Usage Information:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Internet usage data and bandwidth consumption</li>
                  <li>Connection logs and service performance metrics</li>
                  <li>Device information and network configuration</li>
                  <li>Customer support interactions</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <div className="space-y-4 text-gray-300">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain internet services</li>
                  <li>Process billing and payments</li>
                  <li>Provide customer support and technical assistance</li>
                  <li>Improve service quality and network performance</li>
                  <li>Send service updates and important notifications</li>
                  <li>Comply with legal requirements and regulations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <Lock className="h-6 w-6 text-yellow-400" />
                Data Security
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>We implement comprehensive security measures to protect your data:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>SSL encryption for all data transmission</li>
                  <li>Secure servers with regular security updates</li>
                  <li>Access controls and employee training</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Secure payment processing systems</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Information Sharing</h2>
              <div className="space-y-4 text-gray-300">
                <p>We do not sell your personal information. We may share information only in these limited circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With service providers who help us operate our business</li>
                  <li>When required by law or legal process</li>
                  <li>To protect our rights and prevent fraud</li>
                  <li>With your explicit consent</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your personal information only as long as necessary to provide services and comply with 
                legal obligations. Usage data is typically retained for 12 months for billing and network optimization purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <UserCheck className="h-6 w-6 text-purple-400" />
                Your Rights
              </h2>
              <div className="space-y-4 text-gray-300">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to data processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies and Tracking</h2>
              <p className="text-gray-300 leading-relaxed">
                Our website uses cookies to improve your experience and provide personalized content. 
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not directed to children under 18. We do not knowingly collect personal 
                information from children without parental consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
              <div className="space-y-2 text-gray-300">
                <p>For privacy-related questions or to exercise your rights, contact us:</p>
                <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                  <p><strong>Privacy Officer:</strong> legal@phsweb.ng</p>
                  <p><strong>Phone:</strong> 02014101240</p>
                  <p><strong>Address:</strong> 2nd floor, Grace And Faith House, Onitsha - Enugu Expy, Awka 420212, Anambra</p>
                </div>
              </div>
            </section>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/terms">
              <Button variant="outline" className="w-full sm:w-auto">
                View Terms of Service
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="w-full sm:w-auto">
                Contact Privacy Officer
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
              <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
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

export default PrivacyPage; 