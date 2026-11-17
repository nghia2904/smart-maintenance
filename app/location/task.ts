import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import {
  insertGpsPoint,
  logServiceEvent,
} from "../storage/database";

export const LOCATION_TASK_NAME = "smart-maintenance-gps-recording";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("GPS background task failed", error);
    await logServiceEvent("task_error", error.message);
    return;
  }

  const locations = (
    (data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? []
  ).sort((first, second) => first.timestamp - second.timestamp);
  if (locations.length === 0) {
    return;
  }

  for (const location of locations) {
    await insertGpsPoint({
      timestamp: new Date(location.timestamp).toISOString(),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed: location.coords.speed,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
    });
  }
});
