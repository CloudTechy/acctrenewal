/**
 * Footer Component Integrity Tests
 * 
 * Verifies that the Footer component maintains visual parity with Connekt-main
 * including the signature yellow bottom line and layout structure.
 * 
 * Reference: design-instructions.md - Step 5 (Component conversion)
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 2.4 (Layout Shell)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/Footer';

describe('Footer Component', () => {
  describe('Structure Integrity', () => {
    test('should render footer container', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    test('should display CONNEKT branding', () => {
      render(<Footer />);
      const brandingElements = screen.getAllByText(/CONNEKT/i);
      expect(brandingElements.length).toBeGreaterThan(0);
      // Verify main brand text in logo area exists
      expect(brandingElements.some(el => el.className.includes('text-[21px]'))).toBe(true);
    });

    test('should have current year in copyright', () => {
      render(<Footer />);
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
    });
  });

  describe('Connekt-main Signature: Yellow Bottom Line', () => {
    test('should have yellow (#ffd534) bottom decorative line', () => {
      const { container } = render(<Footer />);
      const yellowLine = container.querySelector('.bg-\\[\\#ffd534\\]');
      expect(yellowLine).toBeInTheDocument();
    });

    test('yellow line should be positioned at bottom', () => {
      const { container } = render(<Footer />);
      const yellowLine = container.querySelector('.bg-\\[\\#ffd534\\]');
      expect(yellowLine?.className).toMatch(/bottom-/);
    });

    test('yellow line should be height 0.5 (h-0.5)', () => {
      const { container } = render(<Footer />);
      const yellowLine = container.querySelector('.bg-\\[\\#ffd534\\]');
      expect(yellowLine?.className).toMatch(/h-0\.5/);
    });
  });

  describe('Layout Grid Structure', () => {
    test('should have grid layout', () => {
      const { container } = render(<Footer />);
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });

    test('should have responsive grid columns (md:grid-cols-4)', () => {
      const { container } = render(<Footer />);
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer?.className).toMatch(/grid-cols-1/);
      expect(gridContainer?.className).toMatch(/md:grid-cols-4/);
    });
  });

  describe('Navigation Sections', () => {
    test('should have Company section heading', () => {
      render(<Footer />);
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    test('should have Legal section heading', () => {
      render(<Footer />);
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    test('should have Contact link', () => {
      render(<Footer />);
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    test('should have Terms of Service link', () => {
      render(<Footer />);
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    test('should have Privacy Policy link', () => {
      render(<Footer />);
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
  });

  describe('Social Media Icons', () => {
    test('should have 4 social media links', () => {
      const { container } = render(<Footer />);
      const socialLinks = container.querySelectorAll('a[href="#"]');
      // Filter only social icons (they have specific icon sizing)
      const socialIcons = Array.from(socialLinks).filter(link => 
        link.className.includes('size-10') && link.className.includes('rounded-full')
      );
      expect(socialIcons.length).toBe(4);
    });

    test('social icons should have gold hover state (#ffd534)', () => {
      const { container } = render(<Footer />);
      const socialLink = container.querySelector('.size-10.rounded-full');
      expect(socialLink?.className).toMatch(/hover:text-\[#ffd534\]/);
      expect(socialLink?.className).toMatch(/hover:border-\[#ffd534\]/);
    });
  });

  describe('Glassmorphism Effect', () => {
    test('should have backdrop blur', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer?.className).toMatch(/backdrop-blur/);
    });

    test('should have dark semi-transparent background', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer?.className).toMatch(/bg-black\/40/);
    });

    test('should have top border with white/5 opacity', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer?.className).toMatch(/border-t/);
      expect(footer?.className).toMatch(/border-white\/5/);
    });
  });

  describe('Typography Preservation', () => {
    test('should use Outfit font family', () => {
      const { container } = render(<Footer />);
      const outfitElements = container.querySelectorAll('[class*="font-[\'Outfit\']"]');
      expect(outfitElements.length).toBeGreaterThan(0);
    });

    test('company description should have white/50 text', () => {
      const { container } = render(<Footer />);
      const description = container.querySelector('.text-white\\/50');
      expect(description).toBeInTheDocument();
    });
  });

  describe('Anti-Regression Guards', () => {
    test('should NOT use unauthorized background colors', () => {
      const { container } = render(<Footer />);
      const html = container.innerHTML;
      
      expect(html).not.toContain('bg-blue');
      expect(html).not.toContain('bg-red');
      expect(html).not.toContain('bg-green');
    });

    test('should NOT have removed yellow bottom line', () => {
      const { container } = render(<Footer />);
      // This is the signature Connekt-main design element
      const yellowLine = container.querySelector('.bg-\\[\\#ffd534\\]');
      expect(yellowLine).toBeInTheDocument();
      expect(yellowLine?.className).toMatch(/absolute/);
    });

    test('should NOT have added unauthorized sections', () => {
      render(<Footer />);
      // These should NOT exist in Connekt-main footer
      expect(screen.queryByText('Newsletter')).not.toBeInTheDocument();
      expect(screen.queryByText('Subscribe')).not.toBeInTheDocument();
      expect(screen.queryByText('Blog')).not.toBeInTheDocument();
    });

    test('should maintain relative overflow-hidden for effects', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer?.className).toMatch(/relative/);
      expect(footer?.className).toMatch(/overflow-hidden/);
    });
  });

  describe('Content Stability', () => {
    test('should have exact tagline from Connekt-main', () => {
      render(<Footer />);
      expect(screen.getByText(/Empowering homes and businesses/i)).toBeInTheDocument();
      expect(screen.getByText(/lightning-fast broadband/i)).toBeInTheDocument();
    });

    test('should have "All rights reserved" text', () => {
      render(<Footer />);
      expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    });

    test('should have "Broadband Solutions for the Future" tagline', () => {
      render(<Footer />);
      expect(screen.getByText(/Broadband Solutions for the Future/i)).toBeInTheDocument();
    });
  });
});
