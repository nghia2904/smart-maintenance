# Smart Maintenance GPS

Ứng dụng React Native dùng Expo để ghi lại các điểm GPS thô trên thiết bị. Hiện
tại ứng dụng tập trung vào việc thu thập và xuất dữ liệu; chưa có đăng nhập,
đồng bộ server, quản lý chuyến đi hay tính quãng đường chuyến đi.

## Công nghệ và phiên bản

Các phiên bản được khai báo trong `package.json`:

| Thành phần | Phiên bản |
| --- | --- |
| Expo SDK | 52 (`expo: ~52.0.0`) |
| React Native | 0.76.5 |
| React | 18.3.1 |
| TypeScript | ~5.3.3 |
| Vitest | ^2.1.8 |

Các thư viện Expo chính: `expo-location`, `expo-task-manager`,
`expo-notifications`, `expo-sqlite`, `expo-file-system` và `expo-sharing`.
`package.json` hiện không khai báo `core` như một package/workspace riêng.

## Cấu trúc dự án

```text
.
├── App.tsx                         # UI, trạng thái ghi, danh sách sự kiện, xuất CSV
├── index.ts                        # Đăng ký component gốc với Expo
├── app.json                        # Tên/slug, quyền và plugin Expo
├── package.json                    # Dependencies và scripts
├── tsconfig.json                   # TypeScript strict và alias @core/@app
├── vitest.config.ts                # Vitest chỉ chạy test trong core/
├── app/
│   ├── config.ts                   # Chu kỳ lấy mẫu, ngưỡng phân tích, nội dung notification
│   ├── location/
│   │   ├── options.ts              # Tùy chọn Expo Location và foreground service
│   │   ├── service.ts              # Xin quyền, bắt đầu/tạm dừng/khôi phục ghi GPS
│   │   └── task.ts                 # Background task, nhận và lưu các vị trí
│   └── storage/
│       └── database.ts             # SQLite: GPS, trạng thái app và nhật ký service
├── core/
│   ├── gps.ts                      # Kiểu dữ liệu và hàm phân tích GPS thuần TypeScript
│   └── gps.test.ts                 # Test khoảng cách, tốc độ và nhận diện chuyển động
└── android/                        # Dự án native Android được Expo prebuild tạo/quản lý
```

### Quan hệ giữa `core/` và app

`core/` nằm ngay trong cùng repository với ứng dụng, không phải thư mục ngoài
hay package độc lập. App import kiểu `GpsPoint` trực tiếp bằng đường dẫn tương
đối `./core/gps`; alias `@core/*` cũng được khai báo trong `tsconfig.json`
nhưng chưa được dùng trong mã hiện tại. Chưa có `core/package.json`, build
riêng, hoặc cấu hình publish package.

`core/gps.ts` là mã nguồn thật, không phải file mẫu. Nó cung cấp kiểu `GpsPoint`,
hàm tính khoảng cách và tốc độ giữa hai điểm, kiểm tra cặp điểm có accuracy/
khoảng thời gian hợp lệ, và cập nhật trạng thái phát hiện chuyển động. Các test
hiện có trong `core/gps.test.ts` kiểm tra khoảng cách, tốc độ, từ chối timestamp
không tăng, nhiễu GPS khi đứng yên, điều kiện chuyển sang trạng thái di chuyển,
và cặp điểm có accuracy quá lớn.

Lưu ý: các hàm phát hiện chuyển động trong `core/` hiện chỉ được test; chúng
không điều khiển việc ghi GPS trong app. Bộ ghi lưu mọi location mà task nhận
được, không lọc theo accuracy.

## Cách hoạt động

1. `index.ts` đăng ký `App`. `App.tsx` import `app/location/task.ts` ngay ở cấp
   module để task được khai báo cả khi Android khởi tạo tác vụ nền trước UI.
2. Khi mở app, `ensureRecordingOnAppOpen()` kiểm tra trạng thái tạm dừng và task
   Expo. Nếu người dùng chưa tạm dừng, app đảm bảo task ghi GPS đang chạy.
3. Lần bắt đầu cần lần lượt cấp quyền vị trí khi dùng app, vị trí nền
   (“Luôn cho phép”) và thông báo. Nếu thiếu quyền, app báo lý do và không bắt
   đầu ghi.
4. `expo-location` gửi location cho task `smart-maintenance-gps-recording`.
   Task sắp xếp các location theo timestamp rồi ghi từng điểm vào SQLite.
5. Màn hình hiển thị trạng thái, tổng số điểm, điểm mới nhất và các sự kiện
   service gần đây; có nút tạm dừng/tiếp tục và xuất toàn bộ điểm thành CSV để
   chia sẻ.

Các điểm được yêu cầu ở accuracy `Balanced`, tối thiểu cách nhau 5 giây hoặc
10 mét theo cấu hình hiện tại. Đây là điều kiện yêu cầu cập nhật cho hệ thống,
không đảm bảo thiết bị sẽ luôn trả điểm đúng chu kỳ.

## Lưu trữ và dữ liệu

SQLite mở file `gps-raw.sqlite` trong vùng lưu trữ riêng của ứng dụng và tạo
các bảng:

- `gps_points`: timestamp, latitude, longitude, speed, accuracy, altitude,
  heading.
- `app_state`: cặp key/value cho trạng thái như `recording_paused` và
  `service_expected_running`.
- `service_events`: timestamp, tên sự kiện và chi tiết lỗi/trạng thái.

Dữ liệu không được gửi lên server. Nút **Xuất log CSV** xuất các trường
`timestamp,latitude,longitude,speed,accuracy,altitude,heading` từ tất cả điểm
đã ghi.

## Cài đặt và chạy

Yêu cầu Node.js LTS, Android Studio/Android SDK và thiết bị Android hoặc
emulator đã cấu hình:

```powershell
npm install
npx expo prebuild
npx expo run:android
```

Hoặc dùng script đã khai báo:

```powershell
npm run android
```

Đây là ứng dụng cần native modules và background location; không dùng Expo Go
để kiểm thử luồng ghi nền. `npx expo prebuild` tạo/cập nhật dự án native từ
cấu hình Expo. Thư mục `android/` đã có trong repository.

Các script khác:

| Lệnh | Tác dụng |
| --- | --- |
| `npm start` | Mở Expo development server |
| `npm test` | Chạy Vitest một lần |
| `npm run test:watch` | Chạy Vitest ở chế độ theo dõi |
| `npm run ios` | Chạy iOS native build (cần môi trường macOS/Xcode) |

Cấu hình EAS có profile `preview` để tạo APK phân phối nội bộ. Cấu hình hiện
tập trung vào Android; plugin `expo-location` bật background location cho
Android và tắt cho iOS.

## Android và chạy nền

Android app ID là `com.smartmaintenance.gps`. Cấu hình native hiện khai báo
`minSdkVersion` 24, `compileSdkVersion` 35 và `targetSdkVersion` 34. App yêu
cầu quyền vị trí nền và foreground service; Android 13 trở lên có thể yêu cầu
cấp quyền thông báo.

Foreground service tạo notification cố định trong lúc ghi. Quyền nền có thể
phải được chọn thủ công trong Settings nếu Android chỉ hiện hướng dẫn thay vì
hộp thoại. Trên một số thiết bị như Redmi/MIUI/HyperOS, hãy đặt pin thành
**Không hạn chế**, bật **Tự khởi động/Autostart** nếu có, bật vị trí hệ thống và
cấp quyền vị trí **Luôn cho phép**.

App tự tiếp tục ghi khi được mở nếu trạng thái lưu trên máy không phải tạm
dừng. Sau khi khởi động lại điện thoại, cần mở app để luồng này kiểm tra và
khôi phục việc ghi; dự án hiện không khai báo boot receiver riêng để tự bật
app ngay sau reboot.

Nhật ký service ghi nhận các lần bắt đầu/dừng, lỗi task và trường hợp task từng
được kỳ vọng chạy nhưng không còn đăng ký khi mở app. Expo không cung cấp
heartbeat độc lập ở đây: task chỉ chạy khi Android giao location. Vì vậy app
không thể khẳng định chính xác lúc service bị hệ điều hành dừng, và việc không
có điểm mới không tự động được coi là service đã bị kill. Force stop hoặc tối
ưu pin của nhà sản xuất vẫn có thể làm gián đoạn ghi.

## Kiểm thử

```powershell
npm test
```

Vitest hiện chỉ thu thập `core/**/*.test.ts`. Các test dùng cấu hình phân tích
trong `app/config.ts`; chúng không kiểm thử tích hợp native GPS, quyền Android
hay chạy nền trên thiết bị.
