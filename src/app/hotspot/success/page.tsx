'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Wifi, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function HotspotSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">Connected Successfully!</h1>
            <p className="text-gray-600 mt-2">You are now connected to PHSWEB Internet</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Wifi className="w-5 h-5" />
                <span className="font-medium">Internet Access Active</span>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Session Information</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <p>Connection established at {new Date().toLocaleTimeString()}</p>
                  <p>Session will remain active while you are connected</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="https://google.com" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Start Browsing
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  Visit PHSWEB Website
                </Link>
              </Button>
            </div>

            <div className="text-xs text-gray-500 pt-4 border-t">
              <p>Need support? Contact us at support@phsweb.com</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 