/**
 * Kampala, Uganda - city center coordinates (for geofence verification).
 * You can later restrict to university by changing center + radius.
 */
export const KAMPALA_CENTER = {
  lat: 0.3476,
  lng: 32.5825,
};
/** Radius in meters. 15km allows verification anywhere in Kampala; reduce for campus-only. */
export const GEOFENCE_RADIUS_METERS = 15_000;

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
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

export function isWithinKampala(lat: number, lng: number): boolean {
  return distanceMeters(lat, lng, KAMPALA_CENTER.lat, KAMPALA_CENTER.lng) <= GEOFENCE_RADIUS_METERS;
}

export interface GeoResult {
  success: boolean;
  lat?: number;
  lng?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
  withinZone: boolean;
  error?: string;
}

/**
 * Get current position and check if within Kampala geofence.
 */
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
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy ?? undefined;
        const dist = distanceMeters(lat, lng, KAMPALA_CENTER.lat, KAMPALA_CENTER.lng);
        const within = dist <= GEOFENCE_RADIUS_METERS;
        resolve({
          success: true,
          lat,
          lng,
          accuracyMeters: accuracy,
          distanceMeters: Math.round(dist),
          withinZone: within,
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
