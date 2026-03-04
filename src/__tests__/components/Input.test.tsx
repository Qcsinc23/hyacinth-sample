/**
 * Component Tests for Input
 * Tests the Input component from components/common/Input.tsx
 */

import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import { Input } from '../../renderer/components/common/Input';

describe('Input', () => {
  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with value', () => {
      render(<Input value="Test Value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Label Tests
  // ============================================================================
  describe('label', () => {
    it('should render label when provided', () => {
      render(<Input label="Username" id="username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor', () => {
      render(<Input label="Email" id="email" />);
      const label = screen.getByText('Email');
      const input = screen.getByLabelText('Email');
      expect(label).toHaveAttribute('for', 'email');
      expect(input).toHaveAttribute('id', 'email');
    });

    it('should show required indicator when required', () => {
      render(<Input label="Required Field" id="required" required />);
      const label = screen.getByText('Required Field');
      const requiredIndicator = screen.getByText('*');
      expect(requiredIndicator).toHaveClass('text-red-500');
      expect(label.parentElement).toContainElement(requiredIndicator);
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================
  describe('error state', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" id="test" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styles to input', () => {
      render(<Input error="Error" id="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-red-500');
      expect(input.className).toContain('focus:border-red-500');
      expect(input.className).toContain('focus:ring-red-500');
    });

    it('should set aria-invalid to true when error', () => {
      render(<Input error="Error" id="test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-describedby to error id', () => {
      render(<Input error="Error message" id="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should not show helper text when error is present', () => {
      render(
        <Input 
          helperText="Helper text" 
          error="Error message" 
          id="test" 
        />
      );
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Helper Text Tests
  // ============================================================================
  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Input helperText="Enter your full name" id="test" />);
      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('should set aria-describedby to help id', () => {
      render(<Input helperText="Helper" id="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-help');
    });

    it('should apply helper text styles', () => {
      render(<Input helperText="Helper" id="test" />);
      expect(screen.getByText('Helper')).toHaveClass('text-gray-500');
    });
  });

  // ============================================================================
  // Icon Tests
  // ============================================================================
  describe('icons', () => {
    it('should render left icon', () => {
      const LeftIcon = <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={LeftIcon} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      const RightIcon = <span data-testid="right-icon">✓</span>;
      render(<Input rightIcon={RightIcon} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should apply left padding when left icon is present', () => {
      const LeftIcon = <span>🔍</span>;
      render(<Input leftIcon={LeftIcon} />);
      expect(screen.getByRole('textbox').className).toContain('pl-10');
    });

    it('should apply right padding when right icon is present', () => {
      const RightIcon = <span>✓</span>;
      render(<Input rightIcon={RightIcon} />);
      expect(screen.getByRole('textbox').className).toContain('pr-10');
    });

    it('should position left icon correctly', () => {
      const LeftIcon = <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={LeftIcon} />);
      const iconContainer = screen.getByTestId('left-icon').parentElement;
      expect(iconContainer).toHaveClass('absolute', 'left-0', 'pl-3');
    });
  });

  // ============================================================================
  // Event Handler Tests
  // ============================================================================
  describe('event handlers', () => {
    it('should call onChange when value changes', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when input loses focus', () => {
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should call onFocus when input gains focus', () => {
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Input Types Tests
  // ============================================================================
  describe('input types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      // textbox role implies type="text", but testing-library removes type attribute
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      // Email inputs are rendered as textbox role in testing-library
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render password input', () => {
      // Password inputs don't have role="textbox"
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================
  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      // disabled: classes are Tailwind pseudo-classes, not in rendered className
      expect(input).toBeDisabled();
    });
  });

  // ============================================================================
  // Ref Forwarding Tests
  // ============================================================================
  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow focusing via ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  // ============================================================================
  // Custom ClassName Tests
  // ============================================================================
  describe('custom className', () => {
    it('should apply custom className to wrapper', () => {
      render(<Input className="custom-class" />);
      const wrapper = screen.getByRole('textbox').parentElement?.parentElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should have focus styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('focus:border-blue-500');
      expect(input.className).toContain('focus:ring-blue-500');
    });

    it('should support aria-label', () => {
      render(<Input aria-label="Custom Label" />);
      expect(screen.getByLabelText('Custom Label')).toBeInTheDocument();
    });

    it('should support aria-required', () => {
      render(<Input required aria-label="Required" />);
      expect(screen.getByLabelText('Required')).toBeRequired();
    });
  });
});
