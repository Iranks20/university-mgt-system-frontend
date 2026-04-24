import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminView from '@/components/AdminView';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '@/lib/api';

describe('AdminView - Courses tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Minimal API mocks required for initial load
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.startsWith('/academic/courses')) {
        return { data: [], total: 0, page: 1, pageSize: 20 } as any;
      }
      if (url.startsWith('/academic/departments')) {
        return { data: [] } as any;
      }
      return { data: [] } as any;
    });
  });

  it('does not show "Add Course" button on /admin-courses view', async () => {
    // AuthProvider reads localStorage for initial auth state
    localStorage.setItem('kcu-token', 'test');
    localStorage.setItem('kcu-user', JSON.stringify({ id: 'u1', email: 'a@b.com', name: 'Admin', role: 'Admin', permissions: [] }));
    localStorage.setItem('kcu-role', 'Admin');

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminView defaultTab="courses" />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByPlaceholderText(/Search courses/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add Course/i)).not.toBeInTheDocument();
  });
});

