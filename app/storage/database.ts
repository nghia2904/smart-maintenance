import * as SQLite from "expo-sqlite";
import type { GpsPoint } from "../../core/gps";

export type ServiceEvent = {
  id: number;
  timestamp: string;
  event: string;
  details: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync("gps-raw.sqlite");
  const database = await databasePromise;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS gps_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL,
      accuracy REAL,
      altitude REAL,
      heading REAL
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      event TEXT NOT NULL,
      details TEXT
    );
  `);
  return database;
}

export async function insertGpsPoint(point: GpsPoint): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO gps_points
      (timestamp, latitude, longitude, speed, accuracy, altitude, heading)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    point.timestamp,
    point.latitude,
    point.longitude,
    point.speed,
    point.accuracy,
    point.altitude,
    point.heading,
  );
}

export async function getGpsPointCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM gps_points",
  );
  return result?.count ?? 0;
}

export async function getLatestGpsPoint(): Promise<GpsPoint | null> {
  const database = await getDatabase();
  return database.getFirstAsync<GpsPoint>(
    `SELECT id, timestamp, latitude, longitude, speed, accuracy, altitude, heading
     FROM gps_points ORDER BY id DESC LIMIT 1`,
  );
}

export async function getAllGpsPoints(): Promise<GpsPoint[]> {
  const database = await getDatabase();
  return database.getAllAsync<GpsPoint>(
    `SELECT id, timestamp, latitude, longitude, speed, accuracy, altitude, heading
     FROM gps_points ORDER BY id ASC`,
  );
}

export async function getAppState(key: string, defaultValue: string): Promise<string> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = ?",
    key,
  );
  return row?.value ?? defaultValue;
}

export async function setAppState(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function logServiceEvent(event: string, details: string | null = null): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT INTO service_events (timestamp, event, details) VALUES (?, ?, ?)",
    new Date().toISOString(),
    event,
    details,
  );
}

export async function getRecentServiceEvents(limit = 5): Promise<ServiceEvent[]> {
  const database = await getDatabase();
  return database.getAllAsync<ServiceEvent>(
    `SELECT id, timestamp, event, details
     FROM service_events ORDER BY id DESC LIMIT ?`,
    limit,
  );
}
