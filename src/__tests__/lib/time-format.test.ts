import { describe, expect, it } from 'vitest';
import { formatTime12To24, formatTime24Display, normalizeTime24, parseTime24To12 } from '@/lib/time-format';

describe('time-format', () => {
  it('normalizes HH:MM:SS to HH:MM', () => {
    expect(normalizeTime24('09:30:00')).toBe('09:30');
    expect(normalizeTime24('14:05')).toBe('14:05');
  });

  it('converts 24h to 12h parts', () => {
    expect(parseTime24To12('09:30')).toEqual({ hour: '09', minute: '30', period: 'AM' });
    expect(parseTime24To12('14:05')).toEqual({ hour: '02', minute: '05', period: 'PM' });
    expect(parseTime24To12('00:15')).toEqual({ hour: '12', minute: '15', period: 'AM' });
    expect(parseTime24To12('12:00')).toEqual({ hour: '12', minute: '00', period: 'PM' });
  });

  it('converts 12h parts to 24h storage format', () => {
    expect(formatTime12To24('09', '30', 'AM')).toBe('09:30');
    expect(formatTime12To24('02', '05', 'PM')).toBe('14:05');
    expect(formatTime12To24('12', '15', 'AM')).toBe('00:15');
    expect(formatTime12To24('12', '00', 'PM')).toBe('12:00');
  });

  it('formats display with AM/PM', () => {
    expect(formatTime24Display('14:05')).toBe('02:05 PM');
    expect(formatTime24Display('09:30')).toBe('09:30 AM');
  });
});
