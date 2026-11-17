import "./app/location/task";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  getAllGpsPoints,
  getGpsPointCount,
  getLatestGpsPoint,
  getRecentServiceEvents,
  type ServiceEvent,
} from "./app/storage/database";
import {
  ensureRecordingOnAppOpen,
  isRecording,
  pauseRecording,
  resumeRecording,
} from "./app/location/service";
import type { GpsPoint } from "./core/gps";

function csvValue(value: string | number | null | undefined): string {
  return value == null ? "" : `"${String(value).replaceAll('"', '""')}"`;
}

function serviceEventLabel(event: string): string {
  const labels: Record<string, string> = {
    started: "Đã bắt đầu thu",
    stopped: "Đã dừng thu",
    start_failed: "Không thể bắt đầu thu",
    stop_failed: "Không thể dừng thu",
    registration_missing_on_app_open: "Không còn đăng ký tác vụ GPS khi mở app",
    task_error: "Lỗi tác vụ GPS",
  };
  return labels[event] ?? event;
}

export default function App() {
  const [recording, setRecording] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [latestPoint, setLatestPoint] = useState<GpsPoint | null>(null);
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([]);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    const [active, count, latest, events] = await Promise.all([
      isRecording(),
      getGpsPointCount(),
      getLatestGpsPoint(),
      getRecentServiceEvents(),
    ]);
    setRecording(active);
    setPointCount(count);
    setLatestPoint(latest);
    setServiceEvents(events);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await ensureRecordingOnAppOpen();
        await refresh();
      } catch (error) {
        Alert.alert(
          "Không thể tự bật thu GPS",
          error instanceof Error ? error.message : "Lỗi không xác định.",
        );
        await refresh();
      } finally {
        setBusy(false);
      }
    })();
    const timer = setInterval(() => void refresh(), 2_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const toggleRecording = async () => {
    setBusy(true);
    try {
      if (recording) {
        await pauseRecording();
      } else {
        await resumeRecording();
      }
      await refresh();
    } catch (error) {
      Alert.alert("Không thể thay đổi trạng thái", error instanceof Error ? error.message : "Lỗi không xác định.");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const exportLog = async () => {
    try {
      const points = await getAllGpsPoints();
      const header = "timestamp,latitude,longitude,speed,accuracy,altitude,heading";
      const rows = points.map((point) =>
        [
          point.timestamp,
          point.latitude,
          point.longitude,
          point.speed,
          point.accuracy,
          point.altitude,
          point.heading,
        ].map(csvValue).join(","),
      );
      const path = `${FileSystem.cacheDirectory}gps-log-${new Date().toISOString().replaceAll(":", "-")}.csv`;
      await FileSystem.writeAsStringAsync(path, [header, ...rows].join("\n"), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Thiết bị không hỗ trợ chia sẻ file.");
      }
      await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Xuất log GPS" });
    } catch (error) {
      Alert.alert("Không thể xuất log", error instanceof Error ? error.message : "Lỗi không xác định.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Smart Maintenance GPS</Text>
        <View style={styles.explanation}>
          <Text style={styles.subtitle}>Vì sao cần các quyền này?</Text>
          <Text>
            Ứng dụng cần vị trí khi dùng app và “Luôn cho phép” để ghi điểm GPS
            khi bạn khóa màn hình. Quyền thông báo dùng để hiển thị foreground
            service cố định và báo rằng dữ liệu vẫn đang được lưu trên máy.
          </Text>
        </View>
        <Text style={styles.status}>Trạng thái: {recording ? "ĐANG GHI" : "ĐÃ DỪNG"}</Text>
        <Text>Số điểm đã ghi: {pointCount}</Text>
        <View style={styles.latest}>
          <Text style={styles.subtitle}>Điểm GPS gần nhất</Text>
          <Text>{latestPoint ? `${latestPoint.latitude}, ${latestPoint.longitude}` : "Chưa có dữ liệu"}</Text>
          <Text>
            Thời điểm ghi: {latestPoint ? new Date(latestPoint.timestamp).toLocaleString() : "Chưa có"}
          </Text>
        </View>
        <Button
          title={recording ? "Tạm dừng thu GPS" : "Tiếp tục thu GPS"}
          onPress={() => void toggleRecording()}
          disabled={busy}
        />
        <View style={styles.events}>
          <Text style={styles.subtitle}>Nhật ký dịch vụ gần đây</Text>
          {serviceEvents.length === 0 ? (
            <Text>Chưa có sự kiện dịch vụ.</Text>
          ) : (
            serviceEvents.map((event) => (
              <Text key={event.id}>
                {new Date(event.timestamp).toLocaleString()} — {serviceEventLabel(event.event)}
                {event.details ? ` (${event.details})` : ""}
              </Text>
            ))
          )}
        </View>
        <View style={styles.spacer} />
        <Button title="Xuất log CSV" onPress={() => void exportLog()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  status: { fontSize: 18, fontWeight: "600" },
  subtitle: { fontWeight: "600" },
  explanation: { gap: 6, padding: 12, backgroundColor: "#eff6ff", borderRadius: 8 },
  latest: { gap: 6, paddingVertical: 16 },
  events: { gap: 6 },
  spacer: { height: 8 },
});
