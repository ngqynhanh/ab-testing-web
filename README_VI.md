# Image Study — website đánh giá retargeting

Giao diện tiếng Việt, 40 lượt/người, 16 điều kiện cân bằng (8 nhóm x A/B), mã mời dùng một lần, lưu từng lượt trên máy chủ, tiếp tục phiên trên cùng trình duyệt, thử gửi lại không nhân đôi phản hồi, bảng quản trị và CSV/JSON export.

## Kiến trúc

- GitHub: quản lý mã nguồn (nên dùng repository private cho bộ dữ liệu).
- Netlify: phục vụ giao diện và Netlify Functions API.
- PostgreSQL: lưu tập trung lâu dài. Có thể dùng Neon, Supabase PostgreSQL hoặc PostgreSQL do bạn quản lý. Không dùng browser localStorage làm kho dữ liệu chính.
- `public/stimuli` là bản sao nguyên byte của 480 file từ bộ Gorilla. Không resize ảnh.
- `data/tables.json` chỉ được đọc trên server; tên phương pháp không gửi trong API người tham gia.

GitHub Pages chỉ phục vụ giao diện tĩnh; bản đầy đủ này cần Functions và database, nên triển khai bằng Netlify kết nối repository GitHub. Không upload ZIP frontend bằng Netlify Drop để thay cho quy trình build Functions.

## Chạy thử trên máy

Cài Node.js 22 trở lên. Trong thư mục này:

```powershell
npm install
npm test
npm run build
npm run dev
```

Mở http://127.0.0.1:4173 và http://127.0.0.1:4173/admin.html.

Local demo dùng file `.dev-state.json`, không kết nối production DB. Mã mời ban đầu trong `.dev-invites.txt`. Admin key demo được in trong terminal. Local demo chỉ lắng nghe loopback. Không đưa file dữ liệu thử hoặc mã mời lên GitHub.

`npm run test:http` khởi động server ở cổng tạm và chạy một phiên pilot bằng HTTP; nó ghi dữ liệu thử vào kho local. Không chạy lệnh này trong lúc đang dùng local demo với dữ liệu cần giữ. Unit/API tests (`npm test`) dùng state trong bộ nhớ và không cần database.

Để kiểm tra full 40 lượt trên local có thể đặt STUDY_MODE=research và DIMENSIONS_ACKNOWLEDGED=true trong shell chỉ cho chạy thử. Đừng diễn giải đây là việc sửa kích thước ảnh.

## Đưa lên Netlify

1. Tạo một repository GitHub cho NỘI DUNG thư mục `retargeting-study` (package.json và netlify.toml ở gốc repo). Nếu đưa toàn bộ workspace lên, phải đặt Base directory = retargeting-study. Không đưa checkpoints hoặc dữ liệu người tham gia vào repo.
2. Trong Netlify chọn Add new project / Import an existing project, kết nối GitHub và chọn repository.
3. Build command: `npm run build`; Publish directory: `public`; Functions directory được khai báo trong netlify.toml.
4. Tạo PostgreSQL database riêng. Lấy connection string được nhà cung cấp khuyến nghị cho serverless, có SSL verification. Không chia sẻ connection string công khai. Ứng dụng tự tạo bảng `retargeting_studies`; tài khoản DB cần quyền CREATE và SELECT/INSERT/UPDATE bảng đó. Nếu dùng DB với quyền hạn chế, nhờ quản trị tạo bảng trước theo schema trong lib/store.mjs.
5. Trong Project configuration > Environment variables của Netlify, đặt các giá trị bên dưới, có scope Functions. Không đặt secrets trong netlify.toml hoặc JavaScript frontend. Nếu sửa env sau deploy, redeploy.

| Variable | Thiết lập |
|---|---|
| DATABASE_URL | PostgreSQL connection string, bao gồm SSL theo nhà cung cấp |
| ADMIN_TOKEN | Secret ngẫu nhiên tối thiểu 32 ký tự; không dùng khóa demo |
| STUDY_ID | `retargeting-v1-pilot` khi thử; đổi thành `retargeting-v1` khi bắt đầu chính thức |
| STUDY_MODE | `pilot` ban đầu; `research` khi chính thức |
| STUDY_OPEN | `false` khi chuẩn bị; `true` khi muốn nhận người |
| TARGET_PER_CONDITION | `5` cho 80 người; `3` cho 48 người |
| DIMENSIONS_ACKNOWLEDGED | `false` ban đầu; chỉ `true` sau khi chốt cách xử lý kích thước |

6. Deploy. Vào `/admin.html`, nhập ADMIN_TOKEN và tạo mã mời. Dùng mã để test một phiên online đầy đủ. Kiểm tra CSV, tải JSON backup, test tải lại trang và thử mất mạng trong lúc lưu.
7. Trước nghiên cứu chính thức: đổi STUDY_ID để tách dữ liệu pilot, đổi STUDY_MODE=research, xác nhận quy trình ảnh, mở STUDY_OPEN=true rồi redeploy. Tạo mã mới cho study mới.
8. Gửi mỗi người link website và MỘT mã riêng. Mỗi người chỉ làm một phiên. Không gửi khóa quản trị. Người đã dùng mã phải tiếp tục bằng cùng browser; mã không mở phiên mới trên máy khác.

Để đóng tuyển người: STUDY_OPEN=false, redeploy; phiên đã bắt đầu vẫn tiếp tục được.

## Chỉ tiêu và người bỏ dở

Allocation được khóa bằng PostgreSQL transaction trên hàng study, tránh hai request đồng thời chiếm cùng chỉ tiêu. Mỗi điều kiện giữ chỗ cho phiên active + complete; khi đủ chỉ tiêu không nhận mới.

Mục tiêu mặc định 16 x 5 = 80 phiên research hoàn thành. Người bỏ dở không tự mất chỗ theo giờ. Trong admin, kiểm tra và đóng phiên bỏ dở để giải phóng chỗ; dữ liệu cũ vẫn được giữ với status released. Mã cũ không được dùng lại. Phát mã mới cho người thay thế.

Không tự động loại phiên theo sở thích, thời gian hoặc tỷ lệ chọn Ours. Admin thống kê tất cả phiên research hoàn thành; hoàn thành KHÔNG đồng nghĩa hợp lệ. Khi cần loại dữ liệu theo protocol, làm trong phân tích CSV và ghi lý do; theo dõi chỉ tiêu hợp lệ riêng và tăng target/tuyển bù theo kế hoạch nghiên cứu. Chưa có tính năng đánh dấu excluded trong UI.

## Kích thước ảnh — việc còn cần quyết định

Bộ hiện tại có 70 ảnh Self-Play-RL, 13 ảnh Cycle-IR, 16 ảnh Linear lệch đích floor(W_original/2) x H_original. Giao diện dùng contain, giữ tỷ lệ gốc, không sửa sai lệch bằng kéo giãn. Cờ DIMENSIONS_ACKNOWLEDGED chỉ xác nhận protocol, không sửa ảnh. Muốn so sánh cùng đích thì xuất lại baseline hoặc chuẩn hóa có công bố trước khi triển khai chính thức; cập nhật assets và kích thước trong tables.json cùng nhau, giữ nguyên study ID sau khi đã có người chỉ khi nội dung không đổi. Nếu thay stimuli/protocol sau thu dữ liệu, dùng study ID mới và lưu nguồn cũ để tái lập.

## Dữ liệu và phân tích

CSV có participant_id, mode, condition, status, trial_order, trial_id, image_id, baseline, left_method, right_method, choice, winner, reaction_time_ms, received_at, size_mismatch. Mỗi dòng là một phản hồi được server chấp nhận. Winner được tính phía server theo mapping trong bảng. Pilot, released và phiên dở vẫn có trong CSV, cần lọc trước phân tích.

Thống kê admin chỉ dùng completed research; Ours % = ours / total, gồm hòa trong mẫu số. Không có kiểm định hay khoảng tin cậy tự động. Khi phân tích paper, tính đến phụ thuộc theo người và ảnh; không coi 3200 lượt là độc lập.

Reaction time tính sau khi cả ba ảnh decode xong, kết thúc khi chọn; bao gồm thời gian xem lớn, không bao gồm request lưu. Chưa loại thời gian chuyển tab. Không dùng RT này cho nghiên cứu đòi hỏi timing chính xác cấp mili giây.

Khóa session nằm ở browser localStorage để resume; DB chỉ lưu hash khóa. Admin key chỉ nằm trong bộ nhớ tab. Export JSON chứa hash invitation/session, coi là bản sao lưu nhạy cảm và lưu riêng khỏi repo. Database provider và Netlify có thể giữ log hạ tầng theo chính sách của họ; ứng dụng không chủ động thu tên/email/IP.

## Giới hạn triển khai

Được thiết kế cho nghiên cứu nhỏ khoảng 80 người/3200 đánh giá. Tất cả state của một study nằm trong một JSONB row và các request được serialize; không dành cho crowdsourcing quy mô lớn. Không có cơ chế chống bot toàn diện; mã mời chỉ kiểm soát quyền bắt đầu. Người có nhiều mã vẫn có thể làm nhiều lần. Cần quản lý việc phát mã.

Sao lưu CSV/JSON định kỳ và bật backup của nhà cung cấp DB. Dữ liệu không bị xóa khi redeploy, vì DB nằm ngoài Functions. Xóa project/DB phía nhà cung cấp sẽ mất dữ liệu nếu không có backup.

## Tài liệu chính thức

- https://docs.netlify.com/build/functions/environment-variables/
- https://node-postgres.com/features/transactions
- https://node-postgres.com/features/ssl
