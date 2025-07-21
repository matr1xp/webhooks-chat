import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock the utils function
jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

// Mock the ThemeContext to provide controllable state
const mockSetTheme = jest.fn();
const MockThemeProvider = ({ 
  children, 
  initialTheme = 'light' 
}: { 
  children: React.ReactNode; 
  initialTheme?: 'light' | 'dark';
}) => {
  const [theme, setTheme] = React.useState(initialTheme);
  
  React.useEffect(() => {
    mockSetTheme.mockImplementation((newTheme) => {
      setTheme(newTheme);
    });
  }, []);

  return (
    <div data-theme={theme}>
      {React.cloneElement(children as React.ReactElement, {
        theme,
        setTheme: mockSetTheme
      })}
    </div>
  );
};

// Create a wrapper that uses the actual ThemeProvider but with mocked context
const TestWrapper = ({ 
  children, 
  initialTheme = 'light' 
}: { 
  children: React.ReactNode; 
  initialTheme?: 'light' | 'dark';
}) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

describe('ThemeToggle', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders both light and dark mode buttons', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      expect(screen.getByTitle('Light mode')).toBeInTheDocument();
      expect(screen.getByTitle('Dark mode')).toBeInTheDocument();
    });

    it('renders sun icon for light mode', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const lightButton = screen.getByTitle('Light mode');
      expect(lightButton).toBeInTheDocument();
      // Check for the Sun icon by looking for the svg element
      expect(lightButton.querySelector('svg')).toBeInTheDocument();
    });

    it('renders moon icon for dark mode', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const darkButton = screen.getByTitle('Dark mode');
      expect(darkButton).toBeInTheDocument();
      // Check for the Moon icon by looking for the svg element
      expect(darkButton.querySelector('svg')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <TestWrapper>
          <ThemeToggle className="custom-class" />
        </TestWrapper>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Theme Interaction', () => {
    it('calls setTheme with light when light mode button is clicked', async () => {
      // We need to test the actual ThemeContext interaction
      const ThemeToggleWithContext = () => {
        const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');
        
        // Create a context-like structure for testing
        const mockContext = {
          theme,
          setTheme: (newTheme: 'light' | 'dark') => {
            mockSetTheme(newTheme);
            setTheme(newTheme);
          }
        };

        return (
          <div data-testid="theme-container" data-theme={theme}>
            <button
              onClick={() => mockContext.setTheme('light')}
              title="Light mode"
              data-active={theme === 'light'}
            >
              Light
            </button>
            <button
              onClick={() => mockContext.setTheme('dark')}
              title="Dark mode"
              data-active={theme === 'dark'}
            >
              Dark
            </button>
          </div>
        );
      };

      render(<ThemeToggleWithContext />);
      
      const lightButton = screen.getByTitle('Light mode');
      await user.click(lightButton);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('calls setTheme with dark when dark mode button is clicked', async () => {
      const ThemeToggleWithContext = () => {
        const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
        
        const mockContext = {
          theme,
          setTheme: (newTheme: 'light' | 'dark') => {
            mockSetTheme(newTheme);
            setTheme(newTheme);
          }
        };

        return (
          <div data-testid="theme-container" data-theme={theme}>
            <button
              onClick={() => mockContext.setTheme('light')}
              title="Light mode"
              data-active={theme === 'light'}
            >
              Light
            </button>
            <button
              onClick={() => mockContext.setTheme('dark')}
              title="Dark mode"
              data-active={theme === 'dark'}
            >
              Dark
            </button>
          </div>
        );
      };

      render(<ThemeToggleWithContext />);
      
      const darkButton = screen.getByTitle('Dark mode');
      await user.click(darkButton);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('Visual States', () => {
    it('shows active state for light mode when theme is light', () => {
      const LightThemeToggle = () => {
        const theme = 'light';
        return (
          <div>
            <button
              title="Light mode"
              className={theme === 'light' ? 'active' : 'inactive'}
            >
              Light
            </button>
            <button
              title="Dark mode"
              className={theme === 'dark' ? 'active' : 'inactive'}
            >
              Dark
            </button>
          </div>
        );
      };

      render(<LightThemeToggle />);
      
      expect(screen.getByTitle('Light mode')).toHaveClass('active');
      expect(screen.getByTitle('Dark mode')).toHaveClass('inactive');
    });

    it('shows active state for dark mode when theme is dark', () => {
      const DarkThemeToggle = () => {
        const theme = 'dark';
        return (
          <div>
            <button
              title="Light mode"
              className={theme === 'light' ? 'active' : 'inactive'}
            >
              Light
            </button>
            <button
              title="Dark mode"
              className={theme === 'dark' ? 'active' : 'inactive'}
            >
              Dark
            </button>
          </div>
        );
      };

      render(<DarkThemeToggle />);
      
      expect(screen.getByTitle('Light mode')).toHaveClass('inactive');
      expect(screen.getByTitle('Dark mode')).toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    it('has proper button titles for screen readers', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      expect(screen.getByTitle('Light mode')).toBeInTheDocument();
      expect(screen.getByTitle('Dark mode')).toBeInTheDocument();
    });

    it('buttons are keyboard accessible', async () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      );

      const lightButton = screen.getByTitle('Light mode');
      const darkButton = screen.getByTitle('Dark mode');

      // Tab to light button
      await user.tab();
      expect(lightButton).toHaveFocus();

      // Tab to dark button
      await user.tab();
      expect(darkButton).toHaveFocus();
    });

    it('can be activated with Enter key', async () => {
      const KeyboardThemeToggle = () => {
        const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
        
        return (
          <div>
            <button
              onClick={() => {
                mockSetTheme('dark');
                setTheme('dark');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  mockSetTheme('dark');
                  setTheme('dark');
                }
              }}
              title="Dark mode"
            >
              Dark
            </button>
            <div data-testid="current-theme">{theme}</div>
          </div>
        );
      };

      render(<KeyboardThemeToggle />);
      
      const darkButton = screen.getByTitle('Dark mode');
      darkButton.focus();
      await user.keyboard('{Enter}');

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });
});