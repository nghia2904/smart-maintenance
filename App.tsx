import "./app/location/task";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { getAllGpsPoints, getGpsPointCount, getLatestGpsPoint } from "./app/storage/database";
import { isRecording, startRecording, stopRecording } from "./app/location/service";
import type { GpsPoint } from "./core/gps";

function csvValue(value: string | number | null | undefined): string {
  return value == null ? "" : `"${String(value).replaceAll('"', '""')}"`;
}

export default function App() {
  const [recording, setRecording] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [latestPoint, setLatestPoint] = useState<GpsPoint | null>(null);

  const refresh = useCallback(async () => {
    const [active, count, latest] = await Promise.all([
      isRecording(),
      getGpsPointCount(),
      getLatestGpsPoint(),
    ]);
    setRecording(active);
    setPointCount(count);
    setLatestPoint(latest);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const toggleRecording = async () => {
    try {
      if (recording) {
        await stopRecording();
      } else {
        await startRecording();
      }
      await refresh();
    } catch (error) {
      Alert.alert("Không thể thay đổi trạng thái", error instanceof Error ? error.message : "Lỗi không xác định.");
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
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.subtitle}>Điểm gần nhất</Text>
        <Text>{latestPoint ? `${latestPoint.latitude}, ${latestPoint.longitude}` : "Chưa có dữ liệu"}</Text>
        {latestPoint && <Text>{new Date(latestPoint.timestamp).toLocaleString()}</Text>}
      </View>
      <Button title={recording ? "Tắt thu GPS" : "Bật thu GPS"} onPress={() => void toggleRecording()} />
      <View style={styles.spacer} />
      <Button title="Xuất log CSV" onPress={() => void exportLog()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  status: { fontSize: 18, fontWeight: "600" },
  subtitle: { fontWeight: "600" },
  explanation: { gap: 6, padding: 12, backgroundColor: "#eff6ff", borderRadius: 8 },
  latest: { gap: 6, paddingVertical: 16 },
  spacer: { height: 8 },
});
