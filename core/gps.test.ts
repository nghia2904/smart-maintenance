import { describe, expect, it } from "vitest";
import {
  distanceBetweenMeters,
  speedBetweenPointsMetersPerSecond,
  updateMovementDetection,
} from "./gps";
import { GPS_CONFIG } from "../app/config";

const movementConfig = {
  maximumAccuracyMeters: GPS_CONFIG.maximumMovementAccuracyMeters,
  minimumSpeedKmh: GPS_CONFIG.movingSpeedThresholdKmh,
  consecutivePairsRequired: GPS_CONFIG.consecutiveMovementPairsToSwitch,
  minimumDistanceFromOriginMeters: GPS_CONFIG.minimumMovementDistanceFromOriginMeters,
  maximumPairElapsedMs: GPS_CONFIG.maxSpeedSampleGapMs,
};

function gpsPoint(eastMeters: number, seconds: number, accuracy: number) {
  return {
    latitude: 0,
    longitude: eastMeters / 111_195,
    timestamp: new Date(seconds * 1_000).toISOString(),
    accuracy,
  };
}

describe("distanceBetweenMeters", () => {
  it("returns zero for the same point", () => {
    const point = { latitude: 10.77, longitude: 106.69 };
    expect(distanceBetweenMeters(point, point)).toBe(0);
  });

  it("calculates a realistic distance", () => {
    const first = { latitude: 0, longitude: 0 };
    const second = { latitude: 0, longitude: 0.001 };
    expect(distanceBetweenMeters(first, second)).toBeCloseTo(111.2, 0);
  });
});

describe("speedBetweenPointsMetersPerSecond", () => {
  it("calculates speed from coordinates and timestamps", () => {
    const first = { latitude: 0, longitude: 0, timestamp: "2026-01-01T00:00:00.000Z" };
    const second = { latitude: 0, longitude: 0.001, timestamp: "2026-01-01T00:00:10.000Z" };
    expect(speedBetweenPointsMetersPerSecond(first, second)).toBeCloseTo(11.12, 0);
  });

  it("rejects non-increasing timestamps", () => {
    const first = { latitude: 0, longitude: 0, timestamp: "2026-01-01T00:00:10.000Z" };
    const second = { latitude: 0, longitude: 0.001, timestamp: "2026-01-01T00:00:10.000Z" };
    expect(speedBetweenPointsMetersPerSecond(first, second)).toBeNull();
  });
});

describe("updateMovementDetection", () => {
  it("does not switch for stationary 20–30 m GPS noise", () => {
    const origin = gpsPoint(0, 0, 12);
    const noisyPoints = [
      gpsPoint(0, 0, 12),
      gpsPoint(25, 10, 12),
      gpsPoint(-5, 20, 12),
      gpsPoint(24, 30, 12),
      gpsPoint(-3, 40, 12),
    ];
    let consecutivePairs = 0;
    let shouldSwitch = false;
    let previous = noisyPoints[0];

    for (const current of noisyPoints.slice(1)) {
      const result = updateMovementDetection(
        previous,
        current,
        origin,
        consecutivePairs,
        movementConfig,
      );
      consecutivePairs = result.consecutiveQualifyingPairs;
      shouldSwitch ||= result.shouldSwitchToMoving;
      previous = current;
    }

    expect(shouldSwitch).toBe(false);
  });

  it("switches after three qualifying vehicle-speed pairs and 50 m from origin", () => {
    const origin = gpsPoint(0, 0, 5);
    const points = [
      gpsPoint(0, 0, 5),
      gpsPoint(30, 10, 5),
      gpsPoint(60, 20, 5),
      gpsPoint(90, 30, 5),
    ];
    let consecutivePairs = 0;
    let shouldSwitch = false;
    let previous = points[0];

    for (const current of points.slice(1)) {
      const result = updateMovementDetection(
        previous,
        current,
        origin,
        consecutivePairs,
        movementConfig,
      );
      consecutivePairs = result.consecutiveQualifyingPairs;
      shouldSwitch ||= result.shouldSwitchToMoving;
      previous = current;
    }

    expect(shouldSwitch).toBe(true);
    expect(consecutivePairs).toBe(3);
  });

  it("ignores pairs with accuracy above 40 m", () => {
    const origin = gpsPoint(0, 0, 5);
    const first = gpsPoint(0, 0, 5);
    const inaccurate = gpsPoint(100, 10, 100);
    const result = updateMovementDetection(
      first,
      inaccurate,
      origin,
      2,
      movementConfig,
    );

    expect(result).toEqual({
      consecutiveQualifyingPairs: 0,
      shouldSwitchToMoving: false,
      pairSpeedKmh: null,
      pairDistanceMeters: null,
      accuracySumMeters: null,
      distanceFromOriginMeters: expect.any(Number),
    });
  });
});
