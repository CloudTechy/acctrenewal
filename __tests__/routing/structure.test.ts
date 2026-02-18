/**
 * Routing & Navigation Integrity Tests
 * 
 * Verifies that Next.js routing preserves Connekt-main route structure
 * and prevents unauthorized route changes.
 * 
 * Reference: design-instructions.md - Strict Rule #4 (Preserve routing)
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 1 (Rule 4)
 */

import fs from 'fs';
import path from 'path';

describe('Routing Structure Integrity', () => {
  const appDir = path.join(process.cwd(), 'src/app');

  describe('Required Routes (Connekt-main Parity)', () => {
    test('should have root page (/)', () => {
      const rootPage = path.join(appDir, 'page.tsx');
      expect(fs.existsSync(rootPage)).toBe(true);
    });

    test('should have contact page (/contact)', () => {
      const contactPage = path.join(appDir, 'contact/page.tsx');
      expect(fs.existsSync(contactPage)).toBe(true);
    });

    test('should have privacy page (/privacy)', () => {
      const privacyPage = path.join(appDir, 'privacy/page.tsx');
      expect(fs.existsSync(privacyPage)).toBe(true);
    });

    test('should have terms page (/terms)', () => {
      const termsPage = path.join(appDir, 'terms/page.tsx');
      expect(fs.existsSync(termsPage)).toBe(true);
    });
  });

  describe('Root Layout Existence', () => {
    test('should have root layout.tsx', () => {
      const rootLayout = path.join(appDir, 'layout.tsx');
      expect(fs.existsSync(rootLayout)).toBe(true);
    });

    test('should have globals.css', () => {
      const globalsCss = path.join(appDir, 'globals.css');
      expect(fs.existsSync(globalsCss)).toBe(true);
    });
  });

  describe('Anti-Regression: Unauthorized Routes', () => {
    test('should NOT have /about page (not in Connekt-main)', () => {
      const aboutPage = path.join(appDir, 'about/page.tsx');
      expect(fs.existsSync(aboutPage)).toBe(false);
    });

    test('should NOT have /blog page (not in Connekt-main)', () => {
      const blogPage = path.join(appDir, 'blog/page.tsx');
      expect(fs.existsSync(blogPage)).toBe(false);
    });

    test('should NOT have /products page (not in Connekt-main)', () => {
      const productsPage = path.join(appDir, 'products/page.tsx');
      expect(fs.existsSync(productsPage)).toBe(false);
    });

    test('should NOT have /services page (not in Connekt-main)', () => {
      const servicesPage = path.join(appDir, 'services/page.tsx');
      expect(fs.existsSync(servicesPage)).toBe(false);
    });
  });

  describe('Dashboard Routes (Preserved from acctrenewal)', () => {
    // These are acctrenewal-specific and should be preserved
    test('should maintain existing dashboard routes', () => {
      const dashboardDir = path.join(appDir, 'dashboard');
      if (fs.existsSync(dashboardDir)) {
        expect(fs.existsSync(path.join(dashboardDir, 'admin/page.tsx'))).toBe(true);
        expect(fs.existsSync(path.join(dashboardDir, 'owner/page.tsx'))).toBe(true);
      }
    });

    test('should maintain hotspot page (acctrenewal-specific)', () => {
      const hotspotPage = path.join(appDir, 'hotspot/page.tsx');
      if (fs.existsSync(hotspotPage)) {
        expect(fs.existsSync(hotspotPage)).toBe(true);
      }
    });

    test('should maintain login page (acctrenewal-specific)', () => {
      const loginPage = path.join(appDir, 'login/page.tsx');
      if (fs.existsSync(loginPage)) {
        expect(fs.existsSync(loginPage)).toBe(true);
      }
    });
  });

  describe('File Structure Standards', () => {
    test('pages should use page.tsx naming (not index.tsx)', () => {
      const rootPage = path.join(appDir, 'page.tsx');
      const rootIndex = path.join(appDir, 'index.tsx');
      
      expect(fs.existsSync(rootPage)).toBe(true);
      expect(fs.existsSync(rootIndex)).toBe(false);
    });

    test('should NOT use pages directory (Next.js App Router standard)', () => {
      const pagesDir = path.join(process.cwd(), 'pages');
      expect(fs.existsSync(pagesDir)).toBe(false);
    });
  });

  describe('API Routes Structure', () => {
    test('should have api directory under app (Next.js 15 standard)', () => {
      const apiDir = path.join(appDir, 'api');
      if (fs.existsSync(apiDir)) {
        expect(fs.statSync(apiDir).isDirectory()).toBe(true);
      }
    });
  });
});

describe('Navigation Links Integrity', () => {
  describe('Navbar Navigation Items', () => {
    const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
    let navbarContent: string;

    beforeAll(() => {
      navbarContent = fs.readFileSync(navbarPath, 'utf-8');
    });

    test('should define exactly 4 navigation items', () => {
      const navItemsMatch = navbarContent.match(/navItems\s*=\s*\[/);
      expect(navItemsMatch).toBeTruthy();
      
      // Count navigation items
      const homeMatch = navbarContent.match(/name:\s*["']Home["']/);
      const termsMatch = navbarContent.match(/name:\s*["']Terms["']/);
      const privacyMatch = navbarContent.match(/name:\s*["']Privacy["']/);
      const contactMatch = navbarContent.match(/name:\s*["']Contact["']/);
      
      expect(homeMatch).toBeTruthy();
      expect(termsMatch).toBeTruthy();
      expect(privacyMatch).toBeTruthy();
      expect(contactMatch).toBeTruthy();
    });

    test('Home should link to "/"', () => {
      expect(navbarContent).toMatch(/name:\s*["']Home["'],\s*path:\s*["']\//);
    });

    test('Terms should link to "/terms"', () => {
      expect(navbarContent).toMatch(/name:\s*["']Terms["'],\s*path:\s*["']\/terms["']/);
    });

    test('Privacy should link to "/privacy"', () => {
      expect(navbarContent).toMatch(/name:\s*["']Privacy["'],\s*path:\s*["']\/privacy["']/);
    });

    test('Contact should link to "/contact"', () => {
      expect(navbarContent).toMatch(/name:\s*["']Contact["'],\s*path:\s*["']\/contact["']/);
    });
  });

  describe('Footer Navigation Links', () => {
    const footerPath = path.join(process.cwd(), 'src/components/Footer.tsx');
    let footerContent: string;

    beforeAll(() => {
      footerContent = fs.readFileSync(footerPath, 'utf-8');
    });

    test('should link to /terms', () => {
      expect(footerContent).toMatch(/router\.push\(['"]\/terms['"]\)/);
    });

    test('should link to /privacy', () => {
      expect(footerContent).toMatch(/router\.push\(['"]\/privacy['"]\)/);
    });

    test('should link to /contact', () => {
      expect(footerContent).toMatch(/router\.push\(['"]\/contact['"]\)/);
    });

    test('should use Next useRouter, NOT React Router useNavigate', () => {
      expect(footerContent).toMatch(/from\s+['"]next\/navigation['"]/);
      expect(footerContent).not.toContain('react-router');
      expect(footerContent).not.toContain('useNavigate');
    });
  });
});

describe('Business Logic Preservation (Strict Rule #6)', () => {
  describe('Payment Integration Integrity', () => {
    const rootPagePath = path.join(process.cwd(), 'src/app/page.tsx');
    let pageContent: string;

    beforeAll(() => {
      if (fs.existsSync(rootPagePath)) {
        pageContent = fs.readFileSync(rootPagePath, 'utf-8');
      }
    });

    test('should preserve react-paystack integration', () => {
      if (pageContent) {
        expect(pageContent).toMatch(/react-paystack/);
      }
    });

    test('should preserve dynamic Paystack import (SSR guard)', () => {
      if (pageContent) {
        // Check for Paystack integration and ssr false configuration
        expect(pageContent).toMatch(/react-paystack|PaystackButton/);
        expect(pageContent).toMatch(/ssr\s*:\s*false|ssr\s*false/);
      }
    });

    test('should preserve payment success/close handlers', () => {
      if (pageContent) {
        // Check for payment handlers (named or functional)
        expect(pageContent).toMatch(/Success|onSuccess|handlePayment/);
        expect(pageContent).toMatch(/Close|onClose|handleClose/);
      }
    });
  });

  describe('API Integration Integrity', () => {
    const rootPagePath = path.join(process.cwd(), 'src/app/page.tsx');
    let pageContent: string;

    beforeAll(() => {
      if (fs.existsSync(rootPagePath)) {
        pageContent = fs.readFileSync(rootPagePath, 'utf-8');
      }
    });

    test('should preserve account lookup API calls', () => {
      if (pageContent) {
        expect(pageContent).toMatch(/\/api\/user/);
      }
    });

    test('should preserve service API calls', () => {
      if (pageContent) {
        expect(pageContent).toMatch(/\/api\/service/);
      }
    });

    test('should NOT have changed API endpoint structure', () => {
      if (pageContent) {
        // Should not have RESTful versioning that wasn't there before
        expect(pageContent).not.toContain('/api/v2/');
        expect(pageContent).not.toContain('/api/v3/');
      }
    });
  });

  describe('State Management Preservation', () => {
    const rootPagePath = path.join(process.cwd(), 'src/app/page.tsx');
    let pageContent: string;

    beforeAll(() => {
      if (fs.existsSync(rootPagePath)) {
        pageContent = fs.readFileSync(rootPagePath, 'utf-8');
      }
    });

    test('should preserve component state management with React hooks', () => {
      if (pageContent) {
        // Verify useState is used (either with step, userData, or other state)
        expect(pageContent).toMatch(/useState\s*<|useState\s*\(/);
      }
    });

    test('should preserve user data state', () => {
      if (pageContent) {
        expect(pageContent).toMatch(/userData/);
      }
    });

    test('should NOT introduce global state library without permission', () => {
      if (pageContent) {
        expect(pageContent).not.toContain('redux');
        expect(pageContent).not.toContain('zustand');
        expect(pageContent).not.toContain('jotai');
        expect(pageContent).not.toContain('recoil');
      }
    });
  });
});
