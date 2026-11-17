import * as Location from "expo-location";
import { GPS_CONFIG } from "../config";

export function getLocationOptions(): Location.LocationTaskOptions {
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: GPS_CONFIG.timeIntervalMs,
    distanceInterval: GPS_CONFIG.distanceIntervalMeters,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: GPS_CONFIG.foregroundNotificationTitle,
      notificationBody: GPS_CONFIG.foregroundNotificationBody,
      notificationColor: "#2563eb",
    },
  };
}
