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

export function speedBetweenPointsMetersPerSecond(
  first: Pick<GpsPoint, "latitude" | "longitude" | "timestamp">,
  second: Pick<GpsPoint, "latitude" | "longitude" | "timestamp">,
): number | null {
  const elapsedMs = Date.parse(second.timestamp) - Date.parse(first.timestamp);
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return null;
  }

  return distanceBetweenMeters(first, second) / (elapsedMs / 1_000);
}

export type MovementDetectionConfig = {
  maximumAccuracyMeters: number;
  minimumSpeedKmh: number;
  consecutivePairsRequired: number;
  minimumDistanceFromOriginMeters: number;
  maximumPairElapsedMs: number;
};

export type MovementDetectionResult = {
  consecutiveQualifyingPairs: number;
  shouldSwitchToMoving: boolean;
  pairSpeedKmh: number | null;
  pairDistanceMeters: number | null;
  accuracySumMeters: number | null;
  distanceFromOriginMeters: number;
};

export type AccurateSpeedPair = {
  distanceMeters: number;
  speedMetersPerSecond: number;
  accuracySumMeters: number;
};

export function getAccurateSpeedPair(
  previous: Pick<GpsPoint, "latitude" | "longitude" | "timestamp" | "accuracy">,
  current: Pick<GpsPoint, "latitude" | "longitude" | "timestamp" | "accuracy">,
  maximumAccuracyMeters: number,
  maximumElapsedMs: number,
): AccurateSpeedPair | null {
  const firstAccuracy = previous.accuracy;
  const secondAccuracy = current.accuracy;
  const elapsedMs = Date.parse(current.timestamp) - Date.parse(previous.timestamp);
  const hasUsableAccuracy =
    firstAccuracy !== null
    && secondAccuracy !== null
    && Number.isFinite(firstAccuracy)
    && Number.isFinite(secondAccuracy)
    && firstAccuracy >= 0
    && secondAccuracy >= 0
    && firstAccuracy <= maximumAccuracyMeters
    && secondAccuracy <= maximumAccuracyMeters;

  if (
    !hasUsableAccuracy
    || !Number.isFinite(elapsedMs)
    || elapsedMs <= 0
    || elapsedMs > maximumElapsedMs
  ) {
    return null;
  }

  const distanceMeters = distanceBetweenMeters(previous, current);
  return {
    distanceMeters,
    speedMetersPerSecond: distanceMeters / (elapsedMs / 1_000),
    accuracySumMeters: firstAccuracy + secondAccuracy,
  };
}

export function updateMovementDetection(
  previous: Pick<GpsPoint, "latitude" | "longitude" | "timestamp" | "accuracy">,
  current: Pick<GpsPoint, "latitude" | "longitude" | "timestamp" | "accuracy">,
  origin: Pick<GpsPoint, "latitude" | "longitude">,
  consecutiveQualifyingPairs: number,
  config: MovementDetectionConfig,
): MovementDetectionResult {
  const pair = getAccurateSpeedPair(
    previous,
    current,
    config.maximumAccuracyMeters,
    config.maximumPairElapsedMs,
  );
  const displacementFromOrigin = distanceBetweenMeters(origin, current);
  if (!pair) {
    return {
      consecutiveQualifyingPairs: 0,
      shouldSwitchToMoving: false,
      pairSpeedKmh: null,
      pairDistanceMeters: null,
      accuracySumMeters: null,
      distanceFromOriginMeters: displacementFromOrigin,
    };
  }

  const pairQualifies =
    pair.distanceMeters > pair.accuracySumMeters
    && pair.speedMetersPerSecond >= config.minimumSpeedKmh / 3.6;
  const nextCount = pairQualifies ? consecutiveQualifyingPairs + 1 : 0;

  return {
    consecutiveQualifyingPairs: nextCount,
    shouldSwitchToMoving:
      nextCount >= config.consecutivePairsRequired
      && displacementFromOrigin >= config.minimumDistanceFromOriginMeters,
    pairSpeedKmh: pair.speedMetersPerSecond * 3.6,
    pairDistanceMeters: pair.distanceMeters,
    accuracySumMeters: pair.accuracySumMeters,
    distanceFromOriginMeters: displacementFromOrigin,
  };
}
