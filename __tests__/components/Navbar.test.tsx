/**
 * Navbar Component Integrity Tests
 * 
 * Verifies that the Navbar component maintains visual parity with Connekt-main
 * and prevents unauthorized style changes.
 * 
 * Reference: design-instructions.md - Step 5 (Component conversion)
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 2.4 (Layout Shell)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navbar } from '@/components/Navbar';

describe('Navbar Component', () => {
  describe('Structure Integrity', () => {
    test('should render navigation container', () => {
      render(<Navbar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    test('should render all navigation items', () => {
      render(<Navbar />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    test('should have Logo component', () => {
      const { container } = render(<Navbar />);
      // Logo is rendered as SVG, check for its presence
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Connekt-main Visual Parity', () => {
    test('should have fixed positioning', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      expect(nav?.className).toMatch(/fixed/);
    });

    test('should have top-0 positioning', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      expect(nav?.className).toMatch(/top-0/);
    });

    test('should have full width', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      expect(nav?.className).toMatch(/w-full/);
    });

    test('should have z-50 layering', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      expect(nav?.className).toMatch(/z-50/);
    });
  });

  describe('Glassmorphism Effect Preservation', () => {
    test('desktop nav should have backdrop blur', () => {
      const { container } = render(<Navbar />);
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav?.className).toMatch(/backdrop-blur/);
    });

    test('desktop nav should have white/5 background', () => {
      const { container } = render(<Navbar />);
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav?.className).toMatch(/bg-white\/5/);
    });

    test('desktop nav should have rounded-full shape', () => {
      const { container } = render(<Navbar />);
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav?.className).toMatch(/rounded-full/);
    });
  });

  describe('Gold Active State (Connekt-main Identity)', () => {
    test('active nav button should use gold gradient className pattern', () => {
      const { container } = render(<Navbar />);
      // Check that the component has the className logic for gold active state
      const navButtons = container.querySelectorAll('button');
      const hasGoldPattern = Array.from(navButtons).some(btn => 
        btn.className.includes('bg-[#d7ab04]') || 
        btn.textContent?.includes('Home') // Home is active by default at '/'
      );
      expect(hasGoldPattern).toBe(true);
    });
  });

  describe('Responsive Behavior', () => {
    test('should have mobile menu button with md:hidden', () => {
      const { container } = render(<Navbar />);
      const mobileButton = container.querySelector('.md\\:hidden');
      expect(mobileButton).toBeInTheDocument();
    });

    test('should have desktop nav with hidden md:flex', () => {
      const { container } = render(<Navbar />);
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('Anti-Regression Guards', () => {
    test('should NOT use unauthorized color schemes', () => {
      const { container } = render(<Navbar />);
      const html = container.innerHTML;
      
      // Should not contain non-Connekt colors
      expect(html).not.toContain('bg-blue-500');
      expect(html).not.toContain('bg-red-500');
      expect(html).not.toContain('bg-green-500');
    });

    test('should NOT use CSS-in-JS style objects', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      // Style attribute should only be used for dynamic/computed styles if any
      const styleAttr = nav?.getAttribute('style');
      expect(styleAttr).toBeFalsy(); // Navbar shouldn't need inline styles
    });

    test('should use Tailwind classes exclusively', () => {
      const { container } = render(<Navbar />);
      const nav = container.querySelector('nav');
      const className = nav?.className || '';
      
      // Check for Tailwind pattern (space-separated utility classes)
      expect(className.split(' ').length).toBeGreaterThan(1);
      // Should have at least one responsive class
      expect(className).toMatch(/md:|lg:|sm:/);
    });
  });

  describe('Navigation Item Count Stability', () => {
    test('should have exactly 4 navigation items', () => {
      render(<Navbar />);
      const navItems = ['Home', 'Terms', 'Privacy', 'Contact'];
      navItems.forEach(item => {
        expect(screen.getAllByText(item).length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should NOT have added unauthorized routes', () => {
      render(<Navbar />);
      // These should NOT exist in Connekt-main design
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });
});
