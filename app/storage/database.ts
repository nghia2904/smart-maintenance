import * as SQLite from "expo-sqlite";
import type { GpsPoint } from "../../core/gps";

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
