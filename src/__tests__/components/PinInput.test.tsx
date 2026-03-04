/**
 * Component Tests for PinInput
 * Tests the PinInput component from components/common/PinInput.tsx
 */

import { render, screen, fireEvent, waitFor } from '../test-utils';
import { PinInput } from '../../renderer/components/common/PinInput';

// Helper to get PIN inputs
const getPinInputs = () => screen.getAllByLabelText(/PIN digit/);

describe('PinInput', () => {
  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('rendering', () => {
    it('should render 4 input fields by default', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      expect(inputs).toHaveLength(4);
    });

    it('should render custom length of inputs', () => {
      render(<PinInput length={6} />);
      const inputs = getPinInputs();
      expect(inputs).toHaveLength(6);
    });

    it('should render inputs as password type by default', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'password');
      });
    });

    it('should render inputs as text type when mask is false', () => {
      render(<PinInput mask={false} />);
      const inputs = getPinInputs();
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'text');
      });
    });

    it('should have numeric input mode', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      inputs.forEach(input => {
        expect(input).toHaveAttribute('inputMode', 'numeric');
      });
    });

    it('should have pattern for numbers', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      inputs.forEach(input => {
        expect(input).toHaveAttribute('pattern', '[0-9]*');
      });
    });
  });

  // ============================================================================
  // ARIA Label Tests
  // ============================================================================
  describe('accessibility labels', () => {
    it('should have aria-label for each input', () => {
      render(<PinInput length={4} />);
      expect(screen.getByLabelText('PIN digit 1')).toBeInTheDocument();
      expect(screen.getByLabelText('PIN digit 2')).toBeInTheDocument();
      expect(screen.getByLabelText('PIN digit 3')).toBeInTheDocument();
      expect(screen.getByLabelText('PIN digit 4')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Input Handling Tests
  // ============================================================================
  describe('input handling', () => {
    it('should accept numeric input', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(inputs[0]).toHaveValue('1');
    });

    it('should reject non-numeric input', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: 'a' } });
      expect(inputs[0]).toHaveValue('');
    });

    it('should only accept single digit', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '12' } });
      expect(inputs[0]).toHaveValue('2'); // Should only keep last digit
    });

    it('should move focus to next input after entry', async () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      
      await waitFor(() => {
        expect(inputs[1]).toHaveFocus();
      });
    });

    it('should call onChange with current PIN value', () => {
      const handleChange = jest.fn();
      render(<PinInput onChange={handleChange} />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(handleChange).toHaveBeenCalledWith('1');
      
      fireEvent.change(inputs[1], { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalledWith('12');
    });

    it('should call onComplete when all digits entered', () => {
      const handleComplete = jest.fn();
      render(<PinInput length={4} onComplete={handleComplete} />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
      fireEvent.change(inputs[2], { target: { value: '3' } });
      fireEvent.change(inputs[3], { target: { value: '4' } });
      
      expect(handleComplete).toHaveBeenCalledWith('1234');
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests
  // ============================================================================
  describe('keyboard navigation', () => {
    it('should move to previous input on backspace when empty', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      // Enter first digit
      fireEvent.change(inputs[0], { target: { value: '1' } });
      // Move to second input
      fireEvent.change(inputs[1], { target: { value: '2' } });
      
      // Backspace on second input (which has value)
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      expect(inputs[1]).toHaveValue('');
      
      // Backspace again should move focus
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      expect(inputs[0]).toHaveFocus();
    });

    it('should clear current input on backspace when has value', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.keyDown(inputs[0], { key: 'Backspace' });
      
      expect(inputs[0]).toHaveValue('');
    });

    it('should move left with arrow key', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
      
      fireEvent.keyDown(inputs[1], { key: 'ArrowLeft' });
      expect(inputs[0]).toHaveFocus();
    });

    it('should move right with arrow key', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.keyDown(inputs[0], { key: 'ArrowRight' });
      expect(inputs[1]).toHaveFocus();
    });

    it('should not move left from first input', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.keyDown(inputs[0], { key: 'ArrowLeft' });
      expect(inputs[0]).toHaveFocus();
    });

    it('should not move right from last input', () => {
      render(<PinInput length={4} />);
      const inputs = getPinInputs();
      
      fireEvent.keyDown(inputs[3], { key: 'ArrowRight' });
      expect(inputs[3]).toHaveFocus();
    });
  });

  // ============================================================================
  // Paste Tests
  // ============================================================================
  describe('paste handling', () => {
    it('should handle pasted PIN', () => {
      render(<PinInput length={4} />);
      const inputs = getPinInputs();
      
      const clipboardData = {
        getData: () => '1234',
      };
      
      fireEvent.paste(inputs[0], { clipboardData });
      
      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('4');
    });

    it('should strip non-numeric characters from paste', () => {
      render(<PinInput length={4} />);
      const inputs = getPinInputs();
      
      const clipboardData = {
        getData: () => '12a3b4',
      };
      
      fireEvent.paste(inputs[0], { clipboardData });
      
      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('4');
    });

    it('should only paste up to length', () => {
      render(<PinInput length={4} />);
      const inputs = getPinInputs();
      
      const clipboardData = {
        getData: () => '12345678',
      };
      
      fireEvent.paste(inputs[0], { clipboardData });
      
      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('4');
    });

    it('should call onComplete after paste', () => {
      const handleComplete = jest.fn();
      render(<PinInput length={4} onComplete={handleComplete} />);
      const inputs = getPinInputs();
      
      const clipboardData = {
        getData: () => '1234',
      };
      
      fireEvent.paste(inputs[0], { clipboardData });
      
      expect(handleComplete).toHaveBeenCalledWith('1234');
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================
  describe('error state', () => {
    it('should display error message', () => {
      render(<PinInput error="Invalid PIN" />);
      expect(screen.getByText('Invalid PIN')).toBeInTheDocument();
    });

    it('should apply error styles to inputs', () => {
      render(<PinInput error="Invalid" />);
      const inputs = getPinInputs();
      
      inputs.forEach(input => {
        expect(input.className).toContain('border-red-500');
        expect(input.className).toContain('focus:border-red-500');
      });
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================
  describe('disabled state', () => {
    it('should disable all inputs when disabled', () => {
      render(<PinInput disabled />);
      const inputs = getPinInputs();
      
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it('should apply disabled styles', () => {
      render(<PinInput disabled />);
      const inputs = getPinInputs();
      
      inputs.forEach(input => {
        expect(input.className).toContain('bg-gray-100');
        expect(input.className).toContain('cursor-not-allowed');
      });
    });

    it('should not accept input when disabled', () => {
      const handleChange = jest.fn();
      render(<PinInput disabled onChange={handleChange} />);
      const inputs = getPinInputs();
      
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Focus Tests
  // ============================================================================
  describe('focus', () => {
    it('should focus first input on mount', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      expect(inputs[0]).toHaveFocus();
    });

    it('should apply focus styles', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      fireEvent.focus(inputs[0]);
      expect(inputs[0].className).toContain('ring-2');
      expect(inputs[0].className).toContain('ring-blue-200');
    });
  });

  // ============================================================================
  // Max Length Tests
  // ============================================================================
  describe('max length', () => {
    it('should have maxLength of 1 on each input', () => {
      render(<PinInput />);
      const inputs = getPinInputs();
      
      inputs.forEach(input => {
        expect(input).toHaveAttribute('maxLength', '1');
      });
    });
  });

  // ============================================================================
  // Complete Workflow Tests
  // ============================================================================
  describe('complete workflow', () => {
    it('should handle complete PIN entry workflow', async () => {
      const handleComplete = jest.fn();
      const handleChange = jest.fn();
      
      render(
        <PinInput 
          length={4} 
          onComplete={handleComplete}
          onChange={handleChange}
        />
      );
      
      const inputs = getPinInputs();
      
      // Enter PIN digit by digit
      fireEvent.change(inputs[0], { target: { value: '5' } });
      expect(handleChange).toHaveBeenLastCalledWith('5');
      
      fireEvent.change(inputs[1], { target: { value: '2' } });
      expect(handleChange).toHaveBeenLastCalledWith('52');
      
      fireEvent.change(inputs[2], { target: { value: '7' } });
      expect(handleChange).toHaveBeenLastCalledWith('527');
      
      fireEvent.change(inputs[3], { target: { value: '9' } });
      expect(handleChange).toHaveBeenLastCalledWith('5279');
      expect(handleComplete).toHaveBeenCalledWith('5279');
    });

    it('should handle backspace through all inputs', () => {
      render(<PinInput length={4} />);
      const inputs = getPinInputs();
      
      // Fill all inputs
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
      fireEvent.change(inputs[2], { target: { value: '3' } });
      fireEvent.change(inputs[3], { target: { value: '4' } });
      
      // Clear from last input
      fireEvent.keyDown(inputs[3], { key: 'Backspace' });
      fireEvent.keyDown(inputs[3], { key: 'Backspace' });
      fireEvent.keyDown(inputs[2], { key: 'Backspace' });
      fireEvent.keyDown(inputs[2], { key: 'Backspace' });
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      fireEvent.keyDown(inputs[0], { key: 'Backspace' });
      
      expect(inputs[0]).toHaveValue('');
      expect(inputs[1]).toHaveValue('');
      expect(inputs[2]).toHaveValue('');
      expect(inputs[3]).toHaveValue('');
    });
  });
});
