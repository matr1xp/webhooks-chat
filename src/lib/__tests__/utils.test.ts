import {
  cn,
  formatTimestamp,
  generateSessionId,
  generateUserId,
  sanitizeInput,
  detectMessageType,
} from '../utils';

// Mock clsx for testing cn function
jest.mock('clsx', () => ({
  clsx: jest.fn((inputs) => {
    return Array.isArray(inputs) 
      ? inputs.filter(Boolean).join(' ')
      : inputs;
  }),
}));

describe('utils', () => {
  describe('cn function', () => {
    it('calls clsx with provided inputs', () => {
      const result = cn('class1', 'class2', false, 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('handles empty inputs', () => {
      const result = cn();
      expect(result).toBeDefined();
    });

    it('handles conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });
  });

  describe('formatTimestamp function', () => {
    let mockNow: Date;
    let originalDate: typeof Date;

    beforeEach(() => {
      // Store original Date constructor
      originalDate = global.Date;
      
      // Set a fixed "now" time for consistent testing
      mockNow = new originalDate('2023-12-01T12:00:00.000Z');
      
      // Mock Date constructor
      global.Date = jest.fn((input?: any) => {
        if (input === undefined) {
          return mockNow;
        }
        return new originalDate(input);
      }) as any;
      
      // Mock Date.now
      global.Date.now = jest.fn(() => mockNow.getTime());
      
      // Copy other static methods
      Object.setPrototypeOf(global.Date, originalDate);
      Object.getOwnPropertyNames(originalDate).forEach(name => {
        if (name !== 'now' && name !== 'length' && name !== 'name' && name !== 'prototype') {
          global.Date[name] = originalDate[name];
        }
      });
    });

    afterEach(() => {
      // Restore original Date
      global.Date = originalDate;
    });

    it('returns "Just now" for timestamps less than a minute ago', () => {
      const timestamp = new Date(mockNow.getTime() - 30000).toISOString(); // 30 seconds ago
      expect(formatTimestamp(timestamp)).toBe('Just now');
    });

    it('returns minutes ago for timestamps less than an hour ago', () => {
      const timestamp = new Date(mockNow.getTime() - 300000).toISOString(); // 5 minutes ago
      expect(formatTimestamp(timestamp)).toBe('5 minutes ago');
    });

    it('returns singular minute for 1 minute ago', () => {
      const timestamp = new Date(mockNow.getTime() - 60000).toISOString(); // 1 minute ago
      expect(formatTimestamp(timestamp)).toBe('1 minute ago');
    });

    it('returns hours ago for timestamps less than a day ago', () => {
      const timestamp = new Date(mockNow.getTime() - 7200000).toISOString(); // 2 hours ago
      expect(formatTimestamp(timestamp)).toBe('2 hours ago');
    });

    it('returns singular hour for 1 hour ago', () => {
      const timestamp = new Date(mockNow.getTime() - 3600000).toISOString(); // 1 hour ago
      expect(formatTimestamp(timestamp)).toBe('1 hour ago');
    });

    it('returns formatted date for timestamps more than a day ago', () => {
      const timestamp = new Date(mockNow.getTime() - 86400000).toISOString(); // 1 day ago
      const expectedDate = new Date(timestamp).toLocaleDateString();
      expect(formatTimestamp(timestamp)).toBe(expectedDate);
    });

    it('handles invalid timestamp gracefully', () => {
      const result = formatTimestamp('invalid-date');
      // Should still return a string (NaN date results in "Invalid Date")
      expect(typeof result).toBe('string');
    });
  });

  describe('generateSessionId function', () => {
    beforeEach(() => {
      // Mock Date.now
      jest.spyOn(Date, 'now').mockReturnValue(1638360000000);
      // Mock Math.random
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('generates a session ID with the correct format', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]{9}$/);
    });

    it('includes timestamp in session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toContain('1638360000000');
    });

    it('generates unique session IDs', () => {
      // Reset mocks to get different values
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.111111111)
        .mockReturnValueOnce(0.222222222);

      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('generateUserId function', () => {
    beforeEach(() => {
      // Mock Date.now
      jest.spyOn(Date, 'now').mockReturnValue(1638360000000);
      // Mock Math.random
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('generates a user ID with the correct format', () => {
      const userId = generateUserId();
      expect(userId).toMatch(/^user_\d+_[a-z0-9]{9}$/);
    });

    it('includes timestamp in user ID', () => {
      const userId = generateUserId();
      expect(userId).toContain('1638360000000');
    });

    it('generates unique user IDs', () => {
      // Reset mocks to get different values
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.111111111)
        .mockReturnValueOnce(0.222222222);

      const userId1 = generateUserId();
      const userId2 = generateUserId();
      
      expect(userId1).not.toBe(userId2);
    });
  });

  describe('sanitizeInput function', () => {
    it('trims whitespace from input', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });

    it('removes angle brackets to prevent HTML injection', () => {
      expect(sanitizeInput('hello <script>alert("xss")</script> world')).toBe('hello scriptalert("xss")/script world');
    });

    it('removes only angle brackets, not other HTML-like characters', () => {
      expect(sanitizeInput('hello & world')).toBe('hello & world');
    });

    it('limits input length to 10000 characters', () => {
      const longInput = 'a'.repeat(15000);
      const result = sanitizeInput(longInput);
      expect(result).toHaveLength(10000);
    });

    it('handles empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('handles input with only whitespace', () => {
      expect(sanitizeInput('   ')).toBe('');
    });

    it('preserves normal text without changes', () => {
      const normalText = 'Hello, this is a normal message!';
      expect(sanitizeInput(normalText)).toBe(normalText);
    });
  });

  describe('detectMessageType function', () => {
    it('detects image types correctly', () => {
      expect(detectMessageType('photo.jpg')).toBe('image');
      expect(detectMessageType('photo.JPEG')).toBe('image');
      expect(detectMessageType('image.png')).toBe('image');
      expect(detectMessageType('animation.gif')).toBe('image');
      expect(detectMessageType('modern.webp')).toBe('image');
    });

    it('detects file types correctly', () => {
      expect(detectMessageType('document.pdf')).toBe('file');
      expect(detectMessageType('report.doc')).toBe('file');
      expect(detectMessageType('spreadsheet.docx')).toBe('file');
      expect(detectMessageType('notes.txt')).toBe('file');
      expect(detectMessageType('data.csv')).toBe('file');
    });

    it('defaults to text for unknown extensions', () => {
      expect(detectMessageType('unknown.xyz')).toBe('text');
      expect(detectMessageType('no-extension')).toBe('text');
      expect(detectMessageType('file.html')).toBe('text');
    });

    it('is case insensitive', () => {
      expect(detectMessageType('IMAGE.JPG')).toBe('image');
      expect(detectMessageType('DOCUMENT.PDF')).toBe('file');
    });

    it('handles complex filenames', () => {
      expect(detectMessageType('my-photo-2023.jpg')).toBe('image');
      expect(detectMessageType('report_final_v2.pdf')).toBe('file');
      expect(detectMessageType('backup.2023.12.01.txt')).toBe('file');
    });

    it('handles URLs with image extensions', () => {
      expect(detectMessageType('https://example.com/image.png')).toBe('image');
      expect(detectMessageType('http://cdn.site.com/photo.jpg?version=1')).toBe('image');
    });

    it('handles empty or invalid input', () => {
      expect(detectMessageType('')).toBe('text');
      expect(detectMessageType('.')).toBe('text');
      expect(detectMessageType('.jpg')).toBe('image');
    });
  });
});