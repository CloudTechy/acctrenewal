'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Phone, Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  const contactMethods = [
    {
      title: 'Whatsapp Chat',
      description: 'Chat with us instantly',
      action: 'Start Chat',
      icon: <MessageSquare className="size-6" />,
      link: 'https://wa.me/2340201410240',
    },
    {
      title: 'Phone Support',
      description: 'Call us directly',
      action: '0201410240',
      icon: <Phone className="size-6" />,
      link: 'tel:0201410240',
    },
    {
      title: 'Email Support',
      description: 'Send us a message',
      action: 'Support@connekt.me',
      icon: <Mail className="size-5" />,
      link: 'mailto:Support@connekt.me',
    },
    {
      title: 'Office Location',
      description: 'Visit our Office',
      action: '5, Gbangbala Street, Ikate Lagos',
      icon: <MapPin className="size-6" />,
      link: 'https://maps.google.com/?q=5, Gbangbala Street, Ikate Lagos',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {contactMethods.map((method, idx) => (
          <motion.div
            key={method.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#252525]/40 backdrop-blur-xl border border-white/20 rounded-[20px] p-8 flex flex-col gap-6 group hover:border-[#ffd534]/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#ffd534] flex items-center justify-center shrink-0 text-black">
                {method.icon}
              </div>
              <h3 className="text-2xl font-medium font-['Outfit']">{method.title}</h3>
            </div>

            <div className="flex flex-col gap-4 text-center">
              <p className="text-[#dfdfdf] text-sm font-['Outfit']">{method.description}</p>

              <motion.a
                href={method.link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 rounded-xl font-semibold font-['Outfit'] text-center transition-all border ${
                  idx === 0
                    ? 'bg-[#0d0d0d]/60 border-white/20 hover:bg-white hover:text-black'
                    : idx === 1
                      ? 'bg-[#292012] border-[#a7a7a7]/30 hover:bg-[#3d2f1b]'
                      : 'bg-[#17101b] border-[#a7a7a7]/30 hover:bg-[#251a2c]'
                }`}
              >
                {method.action}
              </motion.a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}