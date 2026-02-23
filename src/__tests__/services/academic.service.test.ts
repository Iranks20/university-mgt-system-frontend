import { describe, it, expect, vi, beforeEach } from 'vitest';
import { academicService } from '@/services/academic.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('AcademicService - Calendar & CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCalendarEvents', () => {
    it('should fetch and return calendar events', async () => {
      const mockData = [
        {
          id: 'cal-1',
          name: 'Test Event',
          type: 'Academic',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await academicService.getCalendarEvents();

      expect(api.get).toHaveBeenCalledWith('/academic/calendar');
      expect(result).toEqual(mockData);
    });

    it('should handle array response format', async () => {
      const mockData = [{ id: 'cal-1', name: 'Event' }];
      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await academicService.getCalendarEvents();

      expect(result).toEqual(mockData);
    });

    it('should return empty array on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await academicService.getCalendarEvents();

      expect(result).toEqual([]);
    });
  });

  describe('createCalendarEvent', () => {
    it('should create a calendar event', async () => {
      const eventData = {
        name: 'New Event',
        type: 'Academic',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
      };

      const mockResponse = { id: 'cal-1', ...eventData };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await academicService.createCalendarEvent(eventData);

      expect(api.post).toHaveBeenCalledWith('/academic/calendar', eventData);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      await expect(
        academicService.createCalendarEvent({
          name: 'Event',
          type: 'Academic',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-02T00:00:00Z',
        })
      ).rejects.toThrow();
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update a calendar event', async () => {
      const updates = { name: 'Updated Event' };
      const mockResponse = { id: 'cal-1', ...updates };
      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await academicService.updateCalendarEvent('cal-1', updates);

      expect(api.put).toHaveBeenCalledWith('/academic/calendar/cal-1', updates);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete a calendar event', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await academicService.deleteCalendarEvent('cal-1');

      expect(api.delete).toHaveBeenCalledWith('/academic/calendar/cal-1');
    });
  });

  describe('updateVenue', () => {
    it('should update a venue', async () => {
      const updates = { capacity: 100 };
      const mockResponse = { id: 'venue-1', capacity: 100 };
      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await academicService.updateVenue('venue-1', updates);

      expect(api.put).toHaveBeenCalledWith('/academic/venues/venue-1', updates);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteVenue', () => {
    it('should delete a venue', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await academicService.deleteVenue('venue-1');

      expect(api.delete).toHaveBeenCalledWith('/academic/venues/venue-1');
    });
  });

  describe('updateClass', () => {
    it('should update a class', async () => {
      const updates = { capacity: 60 };
      const mockResponse = { id: 'class-1', capacity: 60 };
      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await academicService.updateClass('class-1', updates);

      expect(api.put).toHaveBeenCalledWith('/academic/classes/class-1', updates);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteClass', () => {
    it('should delete a class', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);

      await academicService.deleteClass('class-1');

      expect(api.delete).toHaveBeenCalledWith('/academic/classes/class-1');
    });
  });
});
