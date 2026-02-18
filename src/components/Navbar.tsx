"use client";

import React, { useState, useEffect } from "react";
import { Logo } from "./Logo";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Terms", path: "/terms" },
    { name: "Privacy", path: "/privacy" },
    { name: "Contact", path: "/contact" }
  ];

  const currentPath = pathname;

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 px-4 md:px-28 py-4 md:py-6 transition-all duration-500 ${
        isScrolled 
          ? "bg-black/40 backdrop-blur-xl border-b border-white/5 shadow-2xl py-3 md:py-4" 
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <button onClick={() => router.push("/")} className="hover:opacity-80 transition-opacity">
          <Logo className="scale-90 md:scale-100 origin-left" />
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-2xl">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.path)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                currentPath === item.path
                  ? "bg-[#d7ab04] text-white shadow-[0_0_20px_rgba(215,171,4,0.4)]"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-white bg-white/5 backdrop-blur-md rounded-full border border-white/10"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 p-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl md:hidden flex flex-col gap-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.path)}
              className={`w-full px-6 py-4 rounded-2xl text-left text-sm font-medium transition-all ${
                currentPath === item.path
                  ? "bg-[#d7ab04] text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
