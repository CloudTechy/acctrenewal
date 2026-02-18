'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const LoginComingSoonPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/90 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/phsweblogo.png"
                alt="PHSWEB Internet"
                width={160}
                height={64}
                className="h-16 w-auto"
                priority
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
          className="max-w-4xl mx-auto text-center"
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="rounded-full bg-blue-500/20 p-6">
              <Clock className="h-12 w-12 text-blue-400" />
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Customer Portal
            <br />
            <span className="text-blue-400">Coming Soon</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            We&apos;re building an amazing customer portal experience for you. 
            Soon you&apos;ll be able to manage your account, view usage, and much more!
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="rounded-full bg-green-500/20 p-4 w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Account Management</h3>
              <p className="text-gray-300">
                Manage your profile, billing information, and account preferences with ease.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="rounded-full bg-purple-500/20 p-4 w-fit mx-auto mb-4">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Usage Analytics</h3>
              <p className="text-gray-300">
                Monitor your internet usage, bandwidth consumption, and service performance.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="rounded-full bg-yellow-500/20 p-4 w-fit mx-auto mb-4">
                <Shield className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Secure Access</h3>
              <p className="text-gray-300">
                Advanced security features to keep your account and data protected.
              </p>
            </motion.div>
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-blue-500/30 p-8"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Need immediate assistance?
            </h2>
            <p className="text-gray-300 mb-6">
              For account renewals and support, please use our renewal portal or contact our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Account Renewal
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline">
                  Contact Support
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
          </motion.div>
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
              <Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
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

export default LoginComingSoonPage; 