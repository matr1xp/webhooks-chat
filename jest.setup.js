import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }) {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'markdown-content' }, children);
  };
});

// Mock remark-gfm
jest.mock('remark-gfm', () => {
  return function remarkGfm() {
    return function transformer() {};
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy({}, {
    get: (target, prop) => {
      // Convert component name to kebab-case for test ID
      const testId = prop.toString().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
      return ({ className, ...props }) => 
        React.createElement('svg', {
          'data-testid': `lucide-${testId}`,
          className: `lucide lucide-${testId} ${className || ''}`.trim(),
          ...props
        });
    }
  });
});

// Mock uuid for consistent testing
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-mock'),
}));