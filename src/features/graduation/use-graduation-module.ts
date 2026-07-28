import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  graduationModuleService,
  type GraduationDashboardPayload,
} from '@/services/graduation-module.service';

export function useGraduationDashboard() {
  const [data, setData] = useState<GraduationDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await graduationModuleService.getDashboard();
      setData(payload);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load graduation dashboard';
      setError(message);
      toast.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useGraduationActiveEvent() {
  const { data, loading, reload } = useGraduationDashboard();
  return {
    activeEvent: data?.activeEvent ?? null,
    access: data?.access ?? null,
    loading,
    reload,
  };
}
