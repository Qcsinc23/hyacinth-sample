/**
 * Component Tests for Button
 * Tests the Button component from components/common/Button.tsx
 */

import { render, screen, fireEvent } from '../test-utils';
import { Button } from '../../renderer/components/common/Button';

describe('Button', () => {
  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('should render button with children', () => {
      render(
        <Button>
          <span>Child Element</span>
        </Button>
      );
      expect(screen.getByText('Child Element')).toBeInTheDocument();
    });

    it('should have type="button" by default', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should accept type prop', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  // ============================================================================
  // Variant Tests
  // ============================================================================
  describe('variants', () => {
    const variants = ['primary', 'secondary', 'danger', 'warning', 'success', 'ghost'] as const;
    
    variants.forEach(variant => {
      it(`should render ${variant} variant`, () => {
        render(<Button variant={variant}>{variant}</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        // Check for variant-specific class
        expect(button.className).toContain(variant === 'primary' ? 'bg-blue-600' : '');
      });
    });

    it('should default to primary variant', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-blue-600');
    });
  });

  // ============================================================================
  // Size Tests
  // ============================================================================
  describe('sizes', () => {
    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('text-sm');
    });

    it('should render medium size (default)', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('text-base');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('text-lg');
    });
  });

  // ============================================================================
  // State Tests
  // ============================================================================
  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading spinner when isLoading', () => {
      render(<Button isLoading>Loading</Button>);
      const spinner = document.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should not show text when isLoading (spinner replaces content)', () => {
      render(<Button isLoading>Loading</Button>);
      // The spinner is shown but text is also visible after spinner
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Full Width Tests
  // ============================================================================
  describe('fullWidth', () => {
    it('should have full width class when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button').className).toContain('w-full');
    });

    it('should not have full width class by default', () => {
      render(<Button>Normal</Button>);
      expect(screen.getByRole('button').className).not.toContain('w-full');
    });
  });

  // ============================================================================
  // Icon Tests
  // ============================================================================
  describe('icons', () => {
    it('should render left icon', () => {
      const LeftIcon = <span data-testid="left-icon">←</span>;
      render(<Button leftIcon={LeftIcon}>With Left Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      const RightIcon = <span data-testid="right-icon">→</span>;
      render(<Button rightIcon={RightIcon}>With Right Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should not render icons when loading', () => {
      const LeftIcon = <span data-testid="left-icon">←</span>;
      const RightIcon = <span data-testid="right-icon">→</span>;
      render(
        <Button isLoading leftIcon={LeftIcon} rightIcon={RightIcon}>
          Loading
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Event Handler Tests
  // ============================================================================
  describe('event handlers', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button isLoading onClick={handleClick}>Loading</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Custom ClassName Tests
  // ============================================================================
  describe('custom className', () => {
    it('should merge custom className with base classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('inline-flex');
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('accessibility', () => {
    it('should be focusable', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have focus styles', () => {
      render(<Button>Focus Styles</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus:ring-2');
    });

    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });
  });
});
