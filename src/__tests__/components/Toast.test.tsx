/**
 * Component Tests for Toast
 * Tests the Toast and ToastContainer components from components/common/Toast.tsx
 */

import { render, screen, fireEvent } from '../test-utils';
import { Toast, ToastContainer } from '../../renderer/components/common/Toast';
import type { ToastType } from '../../renderer/components/common/Toast';

describe('Toast', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Toast Rendering Tests
  // ============================================================================
  describe('Toast rendering', () => {
    const toastTypes: ToastType[] = ['success', 'error', 'warning', 'info'];

    toastTypes.forEach(type => {
      it(`should render ${type} toast`, () => {
        render(
          <Toast
            id="test-toast"
            type={type}
            message={`This is a ${type} message`}
            onClose={mockOnClose}
          />
        );
        
        expect(screen.getByText(`This is a ${type} message`)).toBeInTheDocument();
      });
    });

    it('should have alert role', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test message"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live polite', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test message"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ============================================================================
  // Toast Type Styles Tests
  // ============================================================================
  describe('toast type styles', () => {
    it('should have success styles', () => {
      render(
        <Toast
          id="test-toast"
          type="success"
          message="Success!"
          onClose={mockOnClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-emerald-50');
      expect(toast.className).toContain('border-emerald-400');
    });

    it('should have error styles', () => {
      render(
        <Toast
          id="test-toast"
          type="error"
          message="Error!"
          onClose={mockOnClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-red-50');
      expect(toast.className).toContain('border-red-400');
    });

    it('should have warning styles', () => {
      render(
        <Toast
          id="test-toast"
          type="warning"
          message="Warning!"
          onClose={mockOnClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-amber-50');
      expect(toast.className).toContain('border-amber-400');
    });

    it('should have info styles', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Info!"
          onClose={mockOnClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-blue-50');
      expect(toast.className).toContain('border-blue-400');
    });
  });

  // ============================================================================
  // Icon Tests
  // ============================================================================
  describe('icons', () => {
    it('should render success icon', () => {
      render(
        <Toast
          id="test-toast"
          type="success"
          message="Success!"
          onClose={mockOnClose}
        />
      );
      
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.parentElement).toHaveClass('text-emerald-400');
    });

    it('should render error icon', () => {
      render(
        <Toast
          id="test-toast"
          type="error"
          message="Error!"
          onClose={mockOnClose}
        />
      );
      
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.parentElement).toHaveClass('text-red-400');
    });
  });

  // ============================================================================
  // Close Button Tests
  // ============================================================================
  describe('close button', () => {
    it('should render close button', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should have sr-only text for close button', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });

    it('should call onClose when close button clicked', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });
  });

  // ============================================================================
  // Auto-dismiss Tests
  // ============================================================================
  describe('auto-dismiss', () => {
    it('should auto-dismiss after default duration (5000ms)', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      jest.advanceTimersByTime(5000);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });

    it('should auto-dismiss after custom duration', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
          duration={3000}
        />
      );
      
      jest.advanceTimersByTime(3000);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-toast');
    });

    it('should not auto-dismiss when duration is 0', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
          duration={0}
        />
      );
      
      jest.advanceTimersByTime(10000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      unmount();
      jest.advanceTimersByTime(5000);
      
      // onClose should not be called after unmount
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ToastContainer Tests
  // ============================================================================
  describe('ToastContainer', () => {
    const mockToasts = [
      { id: '1', type: 'success' as ToastType, message: 'Success!' },
      { id: '2', type: 'error' as ToastType, message: 'Error!' },
    ];

    it('should render multiple toasts', () => {
      render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should render empty container', () => {
      render(<ToastContainer toasts={[]} onClose={mockOnClose} />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should position toasts in top right', () => {
      render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);
      
      const container = screen.getByText('Success!').closest('.fixed');
      expect(container).toHaveClass('top-4', 'right-4');
    });

    it('should stack toasts vertically', () => {
      render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);
      
      const container = screen.getByText('Success!').closest('.flex-col');
      expect(container).toHaveClass('flex-col', 'gap-2');
    });

    it('should pass onClose to each toast', () => {
      render(<ToastContainer toasts={mockToasts} onClose={mockOnClose} />);
      
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      fireEvent.click(closeButtons[0]);
      
      expect(mockOnClose).toHaveBeenCalledWith('1');
    });
  });

  // ============================================================================
  // Animation Tests
  // ============================================================================
  describe('animation', () => {
    it('should have animation classes', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('animate-in');
      expect(toast.className).toContain('slide-in-from-right');
      expect(toast.className).toContain('duration-300');
    });
  });

  // ============================================================================
  // Message Display Tests
  // ============================================================================
  describe('message display', () => {
    it('should display long messages', () => {
      const longMessage = 'This is a very long message that might wrap to multiple lines in the toast notification.';
      render(
        <Toast
          id="test-toast"
          type="info"
          message={longMessage}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should display special characters', () => {
      const message = 'Error: Item "Biktarvy (nPEP)" is out of stock!';
      render(
        <Toast
          id="test-toast"
          type="error"
          message={message}
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    it('should have focus styles on close button', () => {
      render(
        <Toast
          id="test-toast"
          type="info"
          message="Test"
          onClose={mockOnClose}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton.className).toContain('focus:outline-none');
      expect(closeButton.className).toContain('focus:ring-2');
    });
  });
});
