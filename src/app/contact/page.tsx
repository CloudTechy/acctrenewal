'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const ContactPage: React.FC = () => {
  const handleWhatsAppChat = () => {
    const message = encodeURIComponent('Hello! I need assistance with my PHSWEB Internet service.');
    const whatsappUrl = `https://wa.me/2349076824134?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/90 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-blue-400 font-bold text-2xl">PHSWEB Internet</span>
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
          className="max-w-6xl mx-auto"
        >
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-purple-500/20 p-4">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Contact Support</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get in touch with our support team. We&apos;re here to help with any questions or issues.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* WhatsApp Support */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/20 p-3">
                    <MessageCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">WhatsApp Chat</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">Chat with us instantly</p>
                <Button 
                  onClick={handleWhatsAppChat}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            {/* Phone Support */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/20 p-3">
                    <Phone className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-white">Phone Support</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-2">Call us directly</p>
                <p className="text-white font-semibold">02014101240</p>
                <p className="text-gray-400 text-xs mt-2">24/7 Technical Support</p>
              </CardContent>
            </Card>

            {/* Email Support */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-500/20 p-3">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">Email Support</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-2">Send us an email</p>
                <p className="text-white font-semibold">support@phsweb.ng</p>
                <p className="text-gray-400 text-xs mt-2">Response within 2 hours</p>
              </CardContent>
            </Card>

            {/* Office Location */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-orange-500/20 p-3">
                    <MapPin className="h-5 w-5 text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-white">Office Location</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-2">Visit our office</p>
                <p className="text-white font-semibold text-sm">2nd floor, Grace And Faith House, Onitsha - Enugu Expy, Awka 420212, Anambra</p>
                <p className="text-gray-400 text-xs mt-2">Tues-Fri: 10AM-3PM</p>
              </CardContent>
            </Card>
          </div>

          {/* Business Hours & Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Business Hours */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  Business Hours
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Monday</span>
                  <span className="text-red-400 font-semibold">Closed</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Tuesday - Friday</span>
                  <span className="text-white font-semibold">10:00 AM - 3:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Saturday - Sunday</span>
                  <span className="text-red-400 font-semibold">Closed</span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Emergency Support</span>
                    <span className="text-green-400 font-semibold">24/7</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-gray-700/50 bg-gray-900/70 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
                <p className="text-gray-400 text-sm">Get instant support through your preferred channel</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleWhatsAppChat}
                  variant="outline" 
                  className="w-full justify-start h-12 text-left border-green-500/30 hover:border-green-500/60 hover:bg-green-500/10 transition-all duration-200 bg-gray-800/50 text-white"
                >
                  <MessageCircle className="mr-3 h-5 w-5 text-green-400" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-white">WhatsApp Support</span>
                    <span className="text-xs text-gray-400">Instant messaging</span>
                  </div>
                </Button>
                
                <Link href="tel:02014101240" className="block">
                  <Button variant="outline" className="w-full justify-start h-12 text-left border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/10 transition-all duration-200 bg-gray-800/50 text-white">
                    <Phone className="mr-3 h-5 w-5 text-blue-400" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white">Call Support</span>
                      <span className="text-xs text-gray-400">02014101240</span>
                    </div>
                  </Button>
                </Link>
                
                <Link href="mailto:support@phsweb.ng" className="block">
                  <Button variant="outline" className="w-full justify-start h-12 text-left border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 transition-all duration-200 bg-gray-800/50 text-white">
                    <Mail className="mr-3 h-5 w-5 text-purple-400" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white">Email Support</span>
                      <span className="text-xs text-gray-400">support@phsweb.ng</span>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <span className="text-blue-400 font-bold text-xl">PHSWEB Internet</span>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-400">
            &copy; {new Date().getFullYear()} PHSWEB Internet. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage; 