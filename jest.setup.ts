import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return React.createElement('img', { src, alt, ...rest });
  },
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => React.createElement('div', props),
    section: (props: any) => React.createElement('section', props),
    header: (props: any) => React.createElement('header', props),
    footer: (props: any) => React.createElement('footer', props),
    nav: (props: any) => React.createElement('nav', props),
    button: (props: any) => React.createElement('button', props),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock react-paystack
jest.mock('react-paystack', () => ({
  PaystackButton: (props: any) => React.createElement('button', props),
}));

// Suppress console errors in tests (optional - remove if you want to see errors)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
