import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { GPS_CONFIG } from "../config";
import {
  getAppState,
  logServiceEvent,
  setAppState,
} from "../storage/database";
import { getLocationOptions } from "./options";
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

async function startService(): Promise<void> {
  if (await isRecording()) {
    await setAppState("service_expected_running", "true");
    return;
  }

  try {
    const permission = await requestRecordingPermissions();
    if (!permission.granted) {
      throw new Error(permission.reason);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, getLocationOptions());
    await setAppState("service_started_at", new Date().toISOString());
    await setAppState("service_expected_running", "true");
    await logServiceEvent(
      "started",
      `fixed_sampling=${GPS_CONFIG.timeIntervalMs}ms/${GPS_CONFIG.distanceIntervalMeters}m`,
    );
  } catch (error) {
    await setAppState("service_expected_running", "false");
    await logServiceEvent(
      "start_failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

export async function ensureRecordingOnAppOpen(): Promise<void> {
  const paused = (await getAppState("recording_paused", "false")) === "true";
  const registered = await isRecording();

  if (paused) {
    if (registered) {
      try {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        await logServiceEvent("stopped", "paused_state_reconciliation");
      } catch (error) {
        await logServiceEvent(
          "stop_failed",
          error instanceof Error ? error.message : "Unknown error",
        );
        throw error;
      }
    }
    await setAppState("service_expected_running", "false");
    return;
  }

  const expected = (await getAppState("service_expected_running", "false")) === "true";
  if (expected && !registered) {
    await logServiceEvent(
      "registration_missing_on_app_open",
      "GPS task was expected but is no longer registered; system stop or app reset is possible.",
    );
    await setAppState("service_expected_running", "false");
  }

  if (registered) {
    await setAppState("service_expected_running", "true");
    return;
  }
  await startService();
}

export async function resumeRecording(): Promise<void> {
  await setAppState("recording_paused", "false");
  await ensureRecordingOnAppOpen();
}

export async function pauseRecording(): Promise<void> {
  await setAppState("recording_paused", "true");
  await setAppState("service_expected_running", "false");
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      await logServiceEvent("stopped", "user_paused");
    } catch (error) {
      await logServiceEvent(
        "stop_failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }
}
