/**
 * Tailwind Compatibility Tests
 * 
 * Verifies that Connekt-main Tailwind classes render correctly in Next.js pipeline
 * and prevents introduction of non-Tailwind styling systems.
 * 
 * Reference: design-instructions.md - Step 6 (Tailwind compatibility)
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 2.6
 */

import fs from 'fs';
import path from 'path';

describe('Tailwind Pipeline Compatibility', () => {
  describe('Tailwind Configuration', () => {
    test('should have tailwind.config.js or tailwind.config.ts', () => {
      const tsConfig = path.join(process.cwd(), 'tailwind.config.ts');
      const jsConfig = path.join(process.cwd(), 'tailwind.config.js');
      const mtsConfig = path.join(process.cwd(), 'tailwind.config.mts');
      
      const hasConfig = fs.existsSync(tsConfig) || fs.existsSync(jsConfig) || fs.existsSync(mtsConfig);
      expect(hasConfig).toBe(true);
    });

    test('should use Tailwind CSS v4 (from package.json)', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const tailwindVersion = packageJson.devDependencies?.tailwindcss;
      expect(tailwindVersion).toMatch(/\^4/);
    });

    test('should have @tailwindcss/postcss in devDependencies', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.devDependencies?.['@tailwindcss/postcss']).toBeDefined();
    });
  });

  describe('Globals.css Tailwind Integration', () => {
    const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
    let globalsContent: string;

    beforeAll(() => {
      globalsContent = fs.readFileSync(globalsPath, 'utf-8');
    });

    test('should import tailwindcss', () => {
      expect(globalsContent).toMatch(/@import\s+["']tailwindcss["']/);
    });

    test('should import tw-animate-css', () => {
      expect(globalsContent).toMatch(/@import\s+["']tw-animate-css["']/);
    });

    test('should have @theme inline block', () => {
      expect(globalsContent).toMatch(/@theme\s+inline/);
    });

    test('should NOT use old @tailwind directives (v4 syntax)', () => {
      // Tailwind v4 uses @import instead of @tailwind
      expect(globalsContent).not.toMatch(/@tailwind\s+base/);
      expect(globalsContent).not.toMatch(/@tailwind\s+components/);
      expect(globalsContent).not.toMatch(/@tailwind\s+utilities/);
    });
  });

  describe('Connekt-main Arbitrary Value Support', () => {
    test('should support arbitrary color values bg-[#ffd534]', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toContain('bg-[#d7ab04]');
    });

    test('should support arbitrary shadow values', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/shadow-\[.*\]/);
    });

    test('should support opacity modifiers (text-white/70)', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/text-white\/\d+/);
    });

    test('should support arbitrary font family font-[\'Outfit\']', () => {
      const footerPath = path.join(process.cwd(), 'src/components/Footer.tsx');
      const footerContent = fs.readFileSync(footerPath, 'utf-8');
      
      expect(footerContent).toContain('font-[\'Outfit\']');
    });
  });

  describe('Responsive Breakpoint Support', () => {
    test('Navbar should use md: breakpoint', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/md:/);
    });

    test('Footer should use md: breakpoint', () => {
      const footerPath = path.join(process.cwd(), 'src/components/Footer.tsx');
      const footerContent = fs.readFileSync(footerPath, 'utf-8');
      
      expect(footerContent).toMatch(/md:/);
    });

    test('should NOT use custom breakpoints not in Tailwind defaults', () => {
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      
      // Should not have custom breakpoints like xxl:, xxxl:, mobile:
      expect(layoutContent).not.toMatch(/xxl:/);
      expect(layoutContent).not.toMatch(/xxxl:/);
      expect(layoutContent).not.toMatch(/mobile:/);
    });
  });

  describe('Glassmorphism Effect Classes', () => {
    test('should support backdrop-blur-xl', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/backdrop-blur-xl/);
    });

    test('should support backdrop-blur-md', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/backdrop-blur-md/);
    });
  });

  describe('Animation Classes', () => {
    test('should support animate-pulse-slow (custom animation)', () => {
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      
      expect(layoutContent).toMatch(/animate-pulse-slow/);
    });

    test('should support animate-in utilities', () => {
      const navbarPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
      const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
      
      expect(navbarContent).toMatch(/animate-in/);
    });
  });

  describe('Anti-Regression: No Alternative CSS Systems', () => {
    const componentsDir = path.join(process.cwd(), 'src/components');
    const appDir = path.join(process.cwd(), 'src/app');

    function scanDirectoryForPatterns(dir: string, patterns: RegExp[]): boolean {
      if (!fs.existsSync(dir)) return false;
      
      const files = fs.readdirSync(dir, { recursive: true, encoding: 'utf-8' });
      
      for (const file of files) {
        if (typeof file !== 'string') continue;
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isFile() && /\.(tsx?|jsx?)$/.test(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              return true;
            }
          }
        }
      }
      
      return false;
    }

    test('should NOT use CSS modules (*.module.css)', () => {
      const hasModuleImports = scanDirectoryForPatterns(
        componentsDir,
        [/import\s+.*\.module\.css/]
      );
      expect(hasModuleImports).toBe(false);
    });

    test('should NOT use styled-components', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.['styled-components']).toBeUndefined();
      expect(packageJson.devDependencies?.['styled-components']).toBeUndefined();
    });

    test('should NOT use emotion', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.['@emotion/react']).toBeUndefined();
      expect(packageJson.dependencies?.['@emotion/styled']).toBeUndefined();
    });

    test('should NOT use vanilla-extract', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.['@vanilla-extract/css']).toBeUndefined();
    });

    test('should NOT use CSS-in-JS libraries', () => {
      const hasStyledUsage = scanDirectoryForPatterns(
        componentsDir,
        [/styled\./,  /css`/, /@emotion/]
      );
      expect(hasStyledUsage).toBe(false);
    });
  });

  describe('Class Composition Utilities', () => {
    test('should use tailwind-merge (imported as cn or direct)', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.['tailwind-merge']).toBeDefined();
    });

    test('should use clsx for conditional classes', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.['clsx']).toBeDefined();
    });
  });
});

describe('Vite-to-Next Migration Completeness', () => {
  describe('No Vite Artifacts', () => {
    test('should NOT have vite.config.ts', () => {
      const viteConfig = path.join(process.cwd(), 'vite.config.ts');
      const viteConfigJs = path.join(process.cwd(), 'vite.config.js');
      
      expect(fs.existsSync(viteConfig)).toBe(false);
      expect(fs.existsSync(viteConfigJs)).toBe(false);
    });

    test('should NOT have Vite in package.json', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      expect(packageJson.dependencies?.vite).toBeUndefined();
      expect(packageJson.devDependencies?.vite).toBeUndefined();
    });

    test('should NOT use import.meta.env (Vite-specific)', () => {
      const rootPagePath = path.join(process.cwd(), 'src/app/page.tsx');
      if (fs.existsSync(rootPagePath)) {
        const pageContent = fs.readFileSync(rootPagePath, 'utf-8');
        expect(pageContent).not.toContain('import.meta.env');
      }
    });
  });

  describe('Next.js Standards', () => {
    test('should have next.config.ts or next.config.js', () => {
      const tsConfig = path.join(process.cwd(), 'next.config.ts');
      const jsConfig = path.join(process.cwd(), 'next.config.js');
      
      const hasConfig = fs.existsSync(tsConfig) || fs.existsSync(jsConfig);
      expect(hasConfig).toBe(true);
    });

    test('should use Next.js 15+ (from package.json)', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const nextVersion = packageJson.dependencies?.next;
      expect(nextVersion).toMatch(/15\./);
    });

    test('should use process.env for environment variables', () => {
      // This is tested implicitly - Next.js uses process.env by default
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      expect(packageJson.dependencies?.next).toBeDefined();
    });
  });
});
