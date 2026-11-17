export const GPS_CONFIG = {
  // Balanced accuracy avoids keeping the GPS radio at maximum power.
  accuracy: "balanced" as const,
  timeIntervalMs: 5_000,
  distanceIntervalMeters: 10,
  // Used by GPS analysis helpers, not by the location recorder.
  maximumMovementAccuracyMeters: 40,
  movingSpeedThresholdKmh: 8,
  consecutiveMovementPairsToSwitch: 3,
  minimumMovementDistanceFromOriginMeters: 50,
  maxSpeedSampleGapMs: 120_000,
  foregroundNotificationTitle: "Smart Maintenance đang ghi GPS",
  foregroundNotificationBody: "Dữ liệu được lưu trên thiết bị.",
};
