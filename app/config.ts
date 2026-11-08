export const GPS_CONFIG = {
  // Balanced accuracy avoids keeping the GPS radio at maximum power.
  accuracy: "balanced" as const,
  timeIntervalMs: 15_000,
  distanceIntervalMeters: 10,
  foregroundNotificationTitle: "Smart Maintenance đang ghi GPS",
  foregroundNotificationBody: "Dữ liệu được lưu trên thiết bị.",
};
