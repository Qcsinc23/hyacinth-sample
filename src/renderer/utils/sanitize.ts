import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content by removing dangerous elements and attributes.
 * Use this when rendering any user-generated HTML content.
 * 
 * Note: In React, always prefer using JSX with plain text over dangerouslySetInnerHTML.
 * This function is for defense-in-depth or when you must render HTML.
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitizes user input text for safe display.
 * This removes all HTML tags and entities to prevent XSS.
 * Use this for all user-generated text content displayed in the UI.
 * 
 * @param input - User input string to sanitize
 * @returns Plain text string safe for display
 */
export const sanitizeInput = (input: string | null | undefined): string => {
  if (input === null || input === undefined) return '';
  
  // First, remove all HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities to prevent double-encoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  const decoded = textarea.value;
  
  // Remove any remaining potentially dangerous characters
  // Keep alphanumeric, spaces, and common punctuation
  return decoded
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

/**
 * Sanitizes a string for use as a CSS class name.
 * Prevents class name injection attacks.
 * 
 * @param className - CSS class name to sanitize
 * @returns Sanitized class name
 */
export const sanitizeClassName = (className: string): string => {
  if (!className) return '';
  
  // Allow only alphanumeric, hyphens, underscores, and spaces
  return className.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
};

/**
 * Sanitizes a URL to prevent javascript: protocol attacks.
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  const sanitized = url.trim().toLowerCase();
  
  // Block javascript: and data: protocols
  if (sanitized.startsWith('javascript:') || 
      sanitized.startsWith('data:') ||
      sanitized.startsWith('vbscript:')) {
    return '';
  }
  
  return url.trim();
};
