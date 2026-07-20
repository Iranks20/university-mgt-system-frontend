import api from '@/lib/api';

export type GeofenceConfig = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export const DEFAULT_GEOFENCE: GeofenceConfig = {
  name: 'Main Campus',
  latitude: 0.3476,
  longitude: 32.5825,
  radiusMeters: 500,
};

let cachedGeofence: GeofenceConfig | null = null;
let geofencePromise: Promise<GeofenceConfig> | null = null;

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinGeofence(
  lat: number,
  lng: number,
  geofence: GeofenceConfig = cachedGeofence ?? DEFAULT_GEOFENCE
): boolean {
  return distanceMeters(lat, lng, geofence.latitude, geofence.longitude) <= geofence.radiusMeters;
}

export const KAMPALA_CENTER = {
  lat: DEFAULT_GEOFENCE.latitude,
  lng: DEFAULT_GEOFENCE.longitude,
};
export const GEOFENCE_RADIUS_METERS = DEFAULT_GEOFENCE.radiusMeters;

export function isWithinKampala(lat: number, lng: number): boolean {
  return isWithinGeofence(lat, lng, DEFAULT_GEOFENCE);
}

export interface GeoResult {
  success: boolean;
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
  withinZone: boolean;
  geofence?: GeofenceConfig;
  error?: string;
}

export async function loadGeofenceConfig(force = false): Promise<GeofenceConfig> {
  if (!force && cachedGeofence) return cachedGeofence;
  if (!force && geofencePromise) return geofencePromise;

  geofencePromise = (async () => {
    try {
      const response = await api.get<{ data: GeofenceConfig } | GeofenceConfig>('/settings/geofence');
      const data = (response as { data?: GeofenceConfig })?.data ?? (response as GeofenceConfig);
      if (
        data &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number' &&
        typeof data.radiusMeters === 'number'
      ) {
        cachedGeofence = {
          name: data.name || DEFAULT_GEOFENCE.name,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMeters: data.radiusMeters > 0 ? data.radiusMeters : DEFAULT_GEOFENCE.radiusMeters,
        };
        return cachedGeofence;
      }
    } catch {
      // fall through to defaults
    } finally {
      geofencePromise = null;
    }
    cachedGeofence = DEFAULT_GEOFENCE;
    return cachedGeofence;
  })();

  return geofencePromise;
}

export function clearGeofenceCache() {
  cachedGeofence = null;
  geofencePromise = null;
}

export function verifyLocation(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        success: false,
        withinZone: false,
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy ?? undefined;
        const geofence = await loadGeofenceConfig();
        const dist = distanceMeters(lat, lng, geofence.latitude, geofence.longitude);
        const within = dist <= geofence.radiusMeters;
        resolve({
          success: true,
          lat,
          lng,
          accuracyMeters: accuracy,
          distanceMeters: Math.round(dist),
          withinZone: within,
          geofence,
        });
      },
      (err) => {
        resolve({
          success: false,
          withinZone: false,
          error:
            err.code === 1
              ? 'Location permission denied. Please enable location access to verify.'
              : err.code === 2
                ? 'Location unavailable. Please try again.'
                : err.message || 'Failed to get location.',
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  });
}
