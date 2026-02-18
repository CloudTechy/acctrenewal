/**
 * Layout Shell Integrity Tests
 * 
 * Verifies that the root layout maintains exact parity with Connekt-main MainLayout
 * including background treatment, component mounting, and toaster configuration.
 * 
 * Reference: design-instructions.md - Step 4 (Layout shell parity)
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 2.4
 */

import React from 'react';
import fs from 'fs';
import path from 'path';

describe('Layout Shell Integrity', () => {
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
  let layoutContent: string;

  beforeAll(() => {
    layoutContent = fs.readFileSync(layoutPath, 'utf-8');
  });

  describe('Outfit Font Loading', () => {
    test('should import Outfit from next/font/google', () => {
      expect(layoutContent).toMatch(/import\s+{\s*Outfit\s*}\s+from\s+['"]next\/font\/google['"]/);
    });

    test('should configure Outfit with correct weights', () => {
      expect(layoutContent).toMatch(/weight:\s*\[\s*["']400["'],\s*["']500["'],\s*["']600["'],\s*["']700["'],\s*["']800["'],\s*["']900["']\s*\]/);
    });

    test('should set Outfit variable name', () => {
      expect(layoutContent).toMatch(/variable:\s*["']--font-outfit["']/);
    });

    test('should NOT import Geist font (old design)', () => {
      expect(layoutContent).not.toContain('Geist');
    });
  });

  describe('Background Layer Structure', () => {
    test('should have fixed background container', () => {
      expect(layoutContent).toMatch(/className=["']fixed\s+inset-0/);
    });

    test('should have z-0 for background layer', () => {
      expect(layoutContent).toMatch(/z-0/);
    });

    test('should have pointer-events-none on background', () => {
      expect(layoutContent).toMatch(/pointer-events-none/);
    });

    test('should use Connekt-main background image asset', () => {
      expect(layoutContent).toContain('9c8972844f0e811c448d184ca2d7dc97cbe073a5.png');
    });

    test('should have opacity-40 on background image', () => {
      expect(layoutContent).toMatch(/opacity-40/);
    });

    test('should have scale-105 on background image', () => {
      expect(layoutContent).toMatch(/scale-105/);
    });

    test('should have animate-pulse-slow', () => {
      expect(layoutContent).toMatch(/animate-pulse-slow/);
    });
  });

  describe('Background Overlay Treatment', () => {
    test('should have radial gradient overlay', () => {
      expect(layoutContent).toMatch(/bg-radial-gradient/);
    });

    test('should have dark (#0d0d0d) multiply blend overlay', () => {
      expect(layoutContent).toMatch(/bg-\[#0d0d0d\]\/40/);
      expect(layoutContent).toMatch(/mix-blend-multiply/);
    });
  });

  describe('Primary Background Color', () => {
    test('should use #0d0d0d as main background', () => {
      expect(layoutContent).toMatch(/bg-\[#0d0d0d\]/);
    });

    test('should have white text color', () => {
      expect(layoutContent).toMatch(/text-white/);
    });
  });

  describe('Selection Highlight (Connekt-main Identity)', () => {
    test('should use gold (#efab18) selection background', () => {
      expect(layoutContent).toMatch(/selection:bg-\[#efab18\]/);
    });

    test('should use black selection text', () => {
      expect(layoutContent).toMatch(/selection:text-black/);
    });
  });

  describe('Font Application', () => {
    test('should apply Outfit font variable to body', () => {
      expect(layoutContent).toMatch(/className.*outfit\.variable/);
    });

    test('should have antialiased font smoothing', () => {
      expect(layoutContent).toMatch(/antialiased/);
    });

    test('should have inline Outfit font fallback', () => {
      expect(layoutContent).toMatch(/font-\['Outfit'\]/);
    });
  });

  describe('Component Mounting Order', () => {
    test('should import Navbar component', () => {
      expect(layoutContent).toMatch(/import\s+{\s*Navbar\s*}\s+from\s+['"]@\/components\/Navbar['"]/);
    });

    test('should import Footer component', () => {
      expect(layoutContent).toMatch(/import\s+{\s*Footer\s*}\s+from\s+['"]@\/components\/Footer['"]/);
    });

    test('should mount Navbar before children', () => {
      const navbarIndex = layoutContent.indexOf('<Navbar');
      const childrenIndex = layoutContent.indexOf('{children}');
      expect(navbarIndex).toBeLessThan(childrenIndex);
    });

    test('should mount Footer after children', () => {
      const footerIndex = layoutContent.indexOf('<Footer');
      const childrenIndex = layoutContent.indexOf('{children}');
      expect(footerIndex).toBeGreaterThan(childrenIndex);
    });
  });

  describe('Z-Index Layering', () => {
    test('should have z-10 for content layer', () => {
      expect(layoutContent).toMatch(/z-10/);
    });

    test('background should be z-0, content z-10', () => {
      const z0Index = layoutContent.indexOf('z-0');
      const z10Index = layoutContent.indexOf('z-10');
      expect(z0Index).toBeLessThan(z10Index);
    });
  });

  describe('Toaster Configuration (Connekt-main Glassmorphism)', () => {
    test('should import Toaster from sonner', () => {
      expect(layoutContent).toMatch(/import\s+{\s*Toaster\s*}\s+from\s+['"]sonner['"]/);
    });

    test('should use bottom-center position', () => {
      expect(layoutContent).toMatch(/position=["']bottom-center["']/);
    });

    test('should enable richColors', () => {
      expect(layoutContent).toMatch(/richColors/);
    });

    test('toaster should have glassmorphism background', () => {
      expect(layoutContent).toMatch(/rgba\(26,\s*26,\s*26,\s*0\.9\)/);
    });

    test('toaster should have backdrop blur', () => {
      expect(layoutContent).toMatch(/backdropFilter:\s*['"]blur\(10px\)['"]/);
    });

    test('toaster should have white border with opacity', () => {
      expect(layoutContent).toMatch(/border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/);
    });

    test('toaster should have 16px border radius', () => {
      expect(layoutContent).toMatch(/borderRadius:\s*['"]16px['"]/);
    });
  });

  describe('Metadata Preservation', () => {
    test('should have CONNEKT title', () => {
      expect(layoutContent).toMatch(/title:\s*["']CONNEKT/);
    });

    test('should have broadband-related description', () => {
      expect(layoutContent).toMatch(/description:/);
      expect(layoutContent).toMatch(/broadband|internet|subscription/i);
    });
  });

  describe('Next.js Image Configuration', () => {
    test('should import Next Image component', () => {
      expect(layoutContent).toMatch(/import\s+Image\s+from\s+['"]next\/image['"]/);
    });

    test('background image should use Next Image component', () => {
      expect(layoutContent).toMatch(/<Image/);
    });

    test('background image should have fill prop', () => {
      expect(layoutContent).toMatch(/fill/);
    });

    test('background image should have priority prop', () => {
      expect(layoutContent).toMatch(/priority/);
    });
  });

  describe('Anti-Regression Guards', () => {
    test('should NOT import Geist font', () => {
      expect(layoutContent).not.toMatch(/from\s+['"]next\/font\/google['"].*Geist/);
    });

    test('should NOT use Vite-specific imports', () => {
      expect(layoutContent).not.toContain('import.meta');
      expect(layoutContent).not.toContain('vite');
    });

    test('should NOT use React Router', () => {
      expect(layoutContent).not.toContain('react-router');
      expect(layoutContent).not.toContain('BrowserRouter');
    });

    test('should NOT have CSS module imports', () => {
      expect(layoutContent).not.toMatch(/import\s+.*\.module\.css/);
    });

    test('should NOT use emotional/styled-components', () => {
      expect(layoutContent).not.toContain('@emotion');
      expect(layoutContent).not.toContain('styled-components');
    });
  });

  describe('Overflow & Scrolling', () => {
    test('should have overflow-x-hidden to prevent horizontal scroll', () => {
      expect(layoutContent).toMatch(/overflow-x-hidden/);
    });

    test('should have min-h-screen for full viewport height', () => {
      expect(layoutContent).toMatch(/min-h-screen/);
    });
  });

  describe('Vercel Analytics Integration', () => {
    test('should import Analytics from @vercel/analytics', () => {
      expect(layoutContent).toMatch(/import\s+{\s*Analytics\s*}\s+from\s+['"]@vercel\/analytics\/react['"]/);
    });

    test('should render Analytics component', () => {
      expect(layoutContent).toMatch(/<Analytics\s*\/>/);
    });
  });

  describe('Connekt-main Parity Verification', () => {
    const connektAppPath = path.join(
      process.cwd(),
      'Connekt-main/Connekt-main/src/app/App.tsx'
    );

    test('should match Connekt-main MainLayout structure', () => {
      if (fs.existsSync(connektAppPath)) {
        const connektApp = fs.readFileSync(connektAppPath, 'utf-8');
        
        // Both should have same background image
        expect(layoutContent).toContain('9c8972844f0e811c448d184ca2d7dc97cbe073a5.png');
        expect(connektApp).toContain('9c8972844f0e811c448d184ca2d7dc97cbe073a5.png');
        
        // Both should have selection styling
        expect(layoutContent).toMatch(/selection:bg-\[#efab18\]/);
        expect(connektApp).toMatch(/selection:bg-\[#efab18\]/);
        
        // Both should use #0d0d0d background
        expect(layoutContent).toMatch(/bg-\[#0d0d0d\]/);
        expect(connektApp).toMatch(/bg-\[#0d0d0d\]/);
      }
    });
  });
});
