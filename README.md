# Smart Maintenance GPS

Ứng dụng React Native dùng **Expo development build** để chỉ ghi GPS thô
trên thiết bị Android. Giai đoạn này chưa có nhận diện chuyến đi, tính km,
đăng nhập hoặc server.

## Cài đặt và chạy

Yêu cầu Node.js LTS, Android Studio/SDK và một thiết bị Android thật:

```powershell
npm install
npx expo prebuild
npx expo run:android
```

Không dùng Expo Go: foreground service và background location cần development
build/native build. Trên Mac có thể dùng `npx expo run:ios` cho phần phát triển,
nhưng luồng foreground service trong mục tiêu này là Android.

Các khoảng lấy điểm nằm tại [app/config.ts](./app/config.ts):

- `15 giây` hoặc khi di chuyển `10 mét`
- `Balanced` accuracy, không giữ GPS ở mức cao nhất liên tục

## Luồng quyền

Khi bấm **Bật thu GPS**, app lần lượt xin:

1. Vị trí khi dùng ứng dụng.
2. Vị trí nền/“Luôn cho phép”.
3. Thông báo (Android 13+).

Nếu từ chối bất kỳ bước nào, việc ghi không bắt đầu và lý do được hiển thị.
Tên foreground task phải được đăng ký ở cấp module, vì Android có thể khởi động
task khi JavaScript UI chưa mở.

## Kiểm tra trên Redmi Note 11 / MIUI

1. Cài development build và cấp đủ ba quyền ở trên.
2. Vào **Cài đặt > Ứng dụng > Smart Maintenance GPS > Pin**, chọn **Không hạn chế**.
3. Vào **Cài đặt > Ứng dụng > Quyền > Vị trí**, chọn **Luôn cho phép**.
4. Trong **Tự khởi động/Autostart**, bật cho ứng dụng (tên mục có thể khác theo
   phiên bản MIUI/HyperOS).
5. Tắt tối ưu pin cho ứng dụng, bật vị trí hệ thống và thử ngoài trời.
6. Bấm **Bật thu GPS**, khóa máy và đi 15–20 phút. Mở lại để kiểm tra số điểm,
   thời gian/điểm gần nhất, sau đó bấm **Xuất log CSV**.

Foreground service tạo thông báo cố định để Android duy trì việc ghi khi tắt
màn hình. “Force stop” từ cài đặt hoặc một số chế độ tiết kiệm pin của MIUI
vẫn có thể dừng ứng dụng; đây là giới hạn hệ điều hành, không thể đảm bảo tuyệt
đối bằng JavaScript.

## Test

```powershell
npm test
```

Phần tính khoảng cách và kiểu dữ liệu nằm trong [core/gps.ts](./core/gps.ts),
không phụ thuộc React Native. Dữ liệu SQLite nằm trong `app/` và không được
đồng bộ lên server.

## Điểm phụ thuộc phiên bản

Expo SDK, Android API và MIUI có thể thay đổi màn hình xin quyền. Một số máy
hiển thị quyền nền như một liên kết dẫn tới Settings thay vì dialog; người dùng
phải chọn “Luôn cho phép” thủ công. `expo-location` cung cấp foreground service
configuration ở Android, nhưng độ ổn định khi OEM kill app vẫn phụ thuộc firmware.
