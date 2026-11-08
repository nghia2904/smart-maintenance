export type GpsPoint = {
  id?: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceBetweenMeters(
  first: Pick<GpsPoint, "latitude" | "longitude">,
  second: Pick<GpsPoint, "latitude" | "longitude">,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const latitude1 = toRadians(first.latitude);
  const latitude2 = toRadians(second.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2);

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
