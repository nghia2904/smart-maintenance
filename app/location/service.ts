import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { GPS_CONFIG } from "../config";
import { LOCATION_TASK_NAME } from "./task";

export type PermissionResult =
  | { granted: true }
  | { granted: false; reason: string };

export async function requestRecordingPermissions(): Promise<PermissionResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    return { granted: false, reason: "Cần cho phép vị trí khi dùng ứng dụng." };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    return {
      granted: false,
      reason: "Cần quyền vị trí Luôn cho phép để ghi khi tắt màn hình.",
    };
  }

  const notifications = await Notifications.requestPermissionsAsync();
  if (!notifications.granted) {
    return { granted: false, reason: "Cần cho phép thông báo để foreground service hoạt động." };
  }

  return { granted: true };
}

export async function isRecording(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function startRecording(): Promise<void> {
  const permission = await requestRecordingPermissions();
  if (!permission.granted) {
    throw new Error(permission.reason);
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: GPS_CONFIG.timeIntervalMs,
    distanceInterval: GPS_CONFIG.distanceIntervalMeters,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: GPS_CONFIG.foregroundNotificationTitle,
      notificationBody: GPS_CONFIG.foregroundNotificationBody,
      notificationColor: "#2563eb",
    },
  });
}

export async function stopRecording(): Promise<void> {
  if (await isRecording()) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
