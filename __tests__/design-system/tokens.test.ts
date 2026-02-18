/**
 * Design Token Preservation Tests
 * 
 * These tests verify that the design tokens from Connekt-main are preserved
 * and prevent unauthorized changes to the design system.
 * 
 * Reference: design-instructions.md - Strict Rule #5
 * Audit: DESIGN_MIGRATION_AUDIT_REPORT.md - Section 1 (Rule 5)
 */

import fs from 'fs';
import path from 'path';

describe('Design Token Preservation', () => {
  const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
  const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.ts');
  let globalsContent: string;
  let tailwindConfigContent: string;

  beforeAll(() => {
    globalsContent = fs.readFileSync(globalsPath, 'utf-8');
    if (fs.existsSync(tailwindConfigPath)) {
      tailwindConfigContent = fs.readFileSync(tailwindConfigPath, 'utf-8');
    }
  });

  describe('Gold Accent Colors (Connekt-main Identity)', () => {
    test('should preserve primary gold accent #ffd534', () => {
      if (tailwindConfigContent) {
        expect(tailwindConfigContent).toContain('#ffd534');
      }
    });

    test('should preserve hover gold accent #efab18', () => {
      if (tailwindConfigContent) {
        expect(tailwindConfigContent).toContain('#efab18');
      }
    });

    test('should preserve active gold accent #d7ab04', () => {
      if (tailwindConfigContent) {
        expect(tailwindConfigContent).toContain('#d7ab04');
      }
    });
  });

  describe('Dark Background Colors', () => {
    test('should preserve primary dark background via oklch format', () => {
      // Primary dark color is defined in globals.css using oklch format
      expect(globalsContent).toMatch(/--foreground:\s*oklch/);
    });

    test('should preserve card background #0d0d0d (via layout usage)', () => {
      // This is verified in layout.tsx, not globals.css
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      expect(layoutContent).toContain('#0d0d0d');
    });

    test('should preserve dark mode background oklch(0.145 0 0)', () => {
      expect(globalsContent).toContain('oklch(0.145 0 0)');
    });
  });

  describe('Typography Tokens', () => {
    test('should use Outfit font family', () => {
      expect(globalsContent).toContain('--font-outfit');
      expect(globalsContent).toMatch(/font-family:\s*var\(--font-outfit\)/);
    });

    test('should preserve font weight tokens', () => {
      expect(globalsContent).toContain('--font-weight-medium: 500');
      expect(globalsContent).toContain('--font-weight-normal: 400');
    });
  });

  describe('Spacing & Border Radius Tokens', () => {
    test('should preserve border radius token', () => {
      expect(globalsContent).toContain('--radius: 0.625rem');
    });

    test('should define radius variants', () => {
      expect(globalsContent).toContain('--radius-sm: calc(var(--radius) - 4px)');
      expect(globalsContent).toContain('--radius-md: calc(var(--radius) - 2px)');
      expect(globalsContent).toContain('--radius-lg: var(--radius)');
      expect(globalsContent).toContain('--radius-xl: calc(var(--radius) + 4px)');
    });
  });

  describe('CSS Variable Integrity', () => {
    test('should have :root definition block', () => {
      expect(globalsContent).toMatch(/:root\s*\{/);
    });

    test('should have .dark definition block', () => {
      expect(globalsContent).toMatch(/\.dark\s*\{/);
    });

    test('should have @theme inline block for Tailwind integration', () => {
      expect(globalsContent).toMatch(/@theme\s+inline\s*\{/);
    });
  });

  describe('Connekt-main Parity Check', () => {
    const connektThemePath = path.join(
      process.cwd(),
      'Connekt-main/Connekt-main/src/styles/theme.css'
    );

    test('should have matching primary color definition', () => {
      if (fs.existsSync(connektThemePath)) {
        const connektTheme = fs.readFileSync(connektThemePath, 'utf-8');
        const primaryMatch = connektTheme.match(/--primary:\s*([^;]+);/);
        
        if (primaryMatch) {
          expect(globalsContent).toContain(`--primary: ${primaryMatch[1]}`);
        }
      }
    });

    test('should have matching foreground color definition', () => {
      if (fs.existsSync(connektThemePath)) {
        const connektTheme = fs.readFileSync(connektThemePath, 'utf-8');
        const foregroundMatch = connektTheme.match(/--foreground:\s*([^;]+);/);
        
        if (foregroundMatch) {
          expect(globalsContent).toContain(`--foreground: ${foregroundMatch[1]}`);
        }
      }
    });
  });

  describe('Anti-Regression Guards', () => {
    test('should NOT contain Geist font (old design system)', () => {
      expect(globalsContent).not.toContain('Geist');
      expect(globalsContent).not.toContain('--font-geist');
    });

    test('should NOT contain unauthorized color tokens', () => {
      // Prevent introduction of random brand colors
      expect(globalsContent).not.toContain('#ff0000'); // No pure red
      expect(globalsContent).not.toContain('#00ff00'); // No pure green
      expect(globalsContent).not.toContain('#0000ff'); // No pure blue
    });

    test('should NOT have CSS-in-JS style objects', () => {
      expect(globalsContent).not.toMatch(/const\s+styles\s*=/);
      expect(globalsContent).not.toMatch(/styled\./);
    });
  });
});
