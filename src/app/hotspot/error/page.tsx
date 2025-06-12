'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function HotspotErrorPage() {
  const handleRetry = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardHeader className="pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">Connection Failed</h1>
            <p className="text-gray-600 mt-2">Unable to connect to the internet</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Common Issues:</h3>
              <ul className="text-sm text-red-700 space-y-1 text-left">
                <li>• Invalid username or password</li>
                <li>• Account expired or suspended</li>
                <li>• Network connectivity issues</li>
                <li>• Maximum user limit reached</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="w-4 w-4 mr-2" />
                  Go to Homepage
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/contact">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </div>

            <div className="text-xs text-gray-500 pt-4 border-t space-y-1">
              <p><strong>Need Help?</strong></p>
              <p>Email: support@phsweb.com</p>
              <p>Phone: +234-XXX-XXX-XXXX</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 