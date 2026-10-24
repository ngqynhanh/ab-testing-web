> Cập nhật 2.1: người tham gia được chọn 2 hoặc cả 3 tiêu chí. Mỗi tiêu chí 8 lượt, tổng 16/24. Phiên V2 cũ có 16 lượt vẫn tiếp tục được; nếu đã thu chính thức, nên dùng STUDY_ID mới khi đổi protocol.

# Image Study V2 — chọn ít nhất 2/3 tiêu chí, 8 lượt/tiêu chí

## Thay đổi

- Người tham gia không nhập mã mời, không có tài khoản, không tạo hash danh tính/fingerprint.
- Người dùng chọn hai hoặc cả ba tiêu chí trong ba: distortion, preservation, overall.
- Mỗi tiêu chí lấy ngẫu nhiên 8 cặp: 2 cặp Ours-vs-RETVI, 2 Cycle-IR, 2 Self-Play-RL, 2 Linear. Tổng 16 hoặc 24 ảnh nguồn không lặp/người.
- Mỗi baseline trong mỗi tiêu chí có một lượt Ours-trái và một lượt Ours-phải. Thứ tự các tiêu chí và các lượt được xáo trộn. Bộ ảnh/lượt được lưu trên server một lần để không đổi khi reload.
- Ba lựa chọn A / B / Không phân biệt được. Câu hỏi và hướng dẫn thay đổi theo tiêu chí.
- Cả pilot và research đều dùng 16 hoặc 24 lượt. Pilot không tính vào thống kê chính thức.
- Trang quản trị thống kê riêng từng tiêu chí và baseline. CSV có question_id và question_prompt.

## Không dùng hash người tham gia

Ứng dụng vẫn sinh UUID ngẫu nhiên cho phiên để nhóm 16 hoặc 24 phản hồi và khóa phiên ngẫu nhiên để resume/chống ghi trùng. Không có mã người dùng phải nhập, không băm tên/email/thiết bị, không có fingerprint. UUID không suy ra được danh tính người tham gia. Khóa phiên lưu ở localStorage và DB, không hiển thị trong UI hoặc CSV; JSON backup có khóa này nên cần bảo quản riêng. Không có cơ chế bảo đảm một người chỉ làm một lần sau khi họ xóa localStorage hoặc đổi trình duyệt; cần thông báo mỗi người chỉ tham gia một lần và tuyển mẫu phù hợp.

## Câu hỏi

1. Which result has less visual distortion?
2. Which result crops out less important content and better preserves the main subject?
3. Which result is better overall?

Câu 2 được định nghĩa là giữ nội dung/chủ thể chính, bao gồm việc cắt mất nội dung. Đây là tiêu chí kết hợp, không thể dùng một câu trả lời để tách riêng ảnh hưởng của cropping và object preservation. Hãy giữ nguyên định nghĩa trong hướng dẫn và paper.

## Chỉ tiêu

TARGET_PER_QUESTION mặc định 30. Mỗi người làm hai hoặc ba tiêu chí:

| Chỉ tiêu/tiêu chí | Người hoàn thành đủ 16 lượt | Tổng đánh giá | Đánh giá/tiêu chí | Đánh giá/baseline/tiêu chí |
|---|---|---|---|---|
| 20 | 20–30 | 480 | 160 | 40 |
| 30 | 30–45 | 720 | 240 | 60 |

Đây là kế hoạch phân bổ, không phải kết quả power analysis. Chỉ tiêu là số nguyên từ 2 trở lên, thường dùng 20–30. Số người thực tế phụ thuộc có bao nhiêu người chọn cả ba tiêu chí.

Chỉ người hoàn thành đủ 16 hoặc 24 lượt đã đăng ký mới tính vào completed cho tất cả tiêu chí đã chọn. Active giữ chỗ ở tất cả tiêu chí đã chọn. Các cặp lựa chọn tự đóng khi đầy hoặc khi tiếp tục nhận cặp đó sẽ khiến một tiêu chí bị thiếu không thể ghép đủ hai hoặc ba. Như vậy người đến sau có thể bị giới hạn cặp tiêu chí. Đây là lựa chọn của người tham gia trong những cặp còn mở, không phải phân bổ tiêu chí hoàn toàn ngẫu nhiên. Nêu điều này khi báo cáo kết quả.

Đóng phiên bỏ dở trong admin để giải phóng chỗ; phản hồi dở vẫn ở CSV với status released. Không tự loại người dựa trên sở thích. Ảnh được lấy mẫu ngẫu nhiên theo baseline, không bảo đảm mọi cặp trong 80 ảnh được đánh giá bằng nhau; 20–30 người/tiêu chí không đủ phủ nhiều lượt cho từng ảnh. Phân tích theo tiêu chí với sự phụ thuộc theo người và ảnh, không coi mọi lượt là độc lập.

## Cập nhật bản đã host trên Netlify

1. Thay mã nguồn bằng bản V2, giữ credentials hiện có trong Netlify, không đưa secrets lên GitHub.
2. Giữ DATABASE_URL và ADMIN_TOKEN hiện có. Nếu chưa có bảng, chạy `npm run db:migrate` theo cấu hình database hiện có.
3. BẮT BUỘC dùng STUDY_ID mới, ví dụ `retargeting-criteria-v2-pilot` khi thử và `retargeting-criteria-v2-research` khi chính thức. Không dùng ID của bản 40 lượt/mã mời cũ. App từ chối đọc thiết kế revision 1 để bảo vệ dữ liệu cũ, không xóa hoặc tự di chuyển dữ liệu cũ.
4. Đặt `TARGET_PER_QUESTION=30` (hoặc 20). `TARGET_PER_CONDITION` không còn được sử dụng.
5. Đặt STUDY_MODE=pilot và STUDY_OPEN=true để test; sau khi sẵn sàng chuyển research, dùng study ID research mới.
6. Giữ quy trình xử lý ảnh đã thống nhất; research vẫn cần DIMENSIONS_ACKNOWLEDGED=true. Cờ này không sửa ảnh. Bộ nguồn vẫn có sai lệch kích thước baseline đã báo trước.
7. Redeploy; kiểm tra bằng trang chủ. Phải thấy chọn 2 hoặc cả 3 tiêu chí, không thấy ô mã mời. Trên admin phải thấy 3 chỉ tiêu, không còn 16 nhóm.
8. Gửi một link chung cho người tham gia. Không cần tạo hoặc phát mã. Theo dõi completed/active, xử lý bỏ dở, tải CSV/JSON định kỳ.

Ví dụ cấu hình chính thức:

```text
STUDY_ID=retargeting-criteria-v2-research
STUDY_MODE=research
STUDY_OPEN=true
TARGET_PER_QUESTION=30
DIMENSIONS_ACKNOWLEDGED=true
```

Giá trị cuối chỉ đặt sau khi đã chốt quy trình kích thước ảnh. Không thay ADMIN_TOKEN hoặc DATABASE_URL chỉ vì đổi thiết kế.

## Chạy local và kiểm tra

```powershell
npm install
npm test
npm run build
npm run dev
```

Dev đọc .env.local/.env nếu có. Khi có DATABASE_URL, dùng DB thật; không có hoặc STUDY_STORAGE=file thì dùng .dev-state-v2.json. Nếu file env local đang có STUDY_ID cũ, đổi sang ID mới trong cấu hình local trước khi thử. Local file không ghi đè dữ liệu cũ .dev-state.json.

`npm run test:http` chạy full 16 lượt qua HTTP với kho file local. `npm run test:neon` chạy integration với DB đã cấu hình ở study ID test ngẫu nhiên riêng và chỉ xóa study test đó khi kết thúc; không chạy chung ID nghiên cứu. Không dùng hai dev process đồng thời với cùng kho file; production dùng khóa hàng PostgreSQL để serialize đăng ký/ghi.

CSV là dữ liệu từng phản hồi gồm participant_id, selected_questions, question_id, question_prompt, image_id, baseline, hai methods, choice, winner, rt, trạng thái phiên và size_mismatch. Lọc mode=research và status=complete trước khi phân tích chính thức. Không cần mở CSV bằng Excel để web hoạt động.

## Hosting

Netlify publish=public, build=`npm run build`, Functions=netlify/functions. PostgreSQL/Neon lưu bền vững, GitHub quản lý mã. Đặt secrets vào Netlify environment variables có scope Functions và redeploy. Không dùng GitHub Pages một mình cho backend. DB schema hiện tại không cần đổi: study mới lưu JSONB revision 2 trong cùng bảng.

## Kiểm tra trước khi thu thật

Nêu tên/người liên hệ nghiên cứu theo đơn vị của bạn trong hướng dẫn nếu cần; thử trên thiết bị người tham gia; chốt câu hỏi/tiêu chí loại dữ liệu và quy trình ảnh trước thu. Việc tự chọn tiêu chí có thể tạo khác biệt thành phần người dùng giữa các tiêu chí, nên tránh diễn giải như đã randomize người giữa ba nhóm.
