# Cập nhật thông tin người tham gia — V2.2

Biểu mẫu trước khi bắt đầu có đúng 7 câu hỏi theo yêu cầu. Vẫn chọn ít nhất 2 hoặc cả 3 tiêu chí, 8 ảnh/tiêu chí, tổng 16/24 lượt.

| Trường | Lựa chọn | Yêu cầu |
|---|---|---|
| Nhóm tuổi | 18–24 / 25–34 / 35–44 / 45–54 / ≥55 | Bắt buộc |
| Giới tính | Nam / Nữ / Giới tính khác / Không muốn trả lời | Tùy chọn, có thể để trống |
| Nghề nghiệp | Sinh viên / Đang đi làm / Khác / Không muốn trả lời | Tùy chọn, có thể để trống |
| Lĩnh vực học tập/làm việc | CNTT–AI / Thiết kế–nhiếp ảnh / Lĩnh vực khác | Bắt buộc |
| Kinh nghiệm xử lý ảnh | Chưa có / Cơ bản / Thường xuyên / Chuyên môn hoặc nghiên cứu | Bắt buộc |
| Khả năng nhìn ảnh hiện tại | Nhìn rõ không cần kính / Nhìn rõ khi dùng kính / Vẫn khó nhìn rõ | Bắt buộc |
| Đã tham gia đánh giá này chưa? | Chưa / Đã tham gia | Bắt buộc |

Không thu ngày sinh, tên, email hoặc tên công ty. Không tự tạo fingerprint hay hash danh tính. Mã phiên ngẫu nhiên vẫn dùng để nối phản hồi và tiếp tục tiến độ.

Chọn “Đã tham gia” hoặc “Vẫn khó nhìn rõ” chỉ được ghi nhận, KHÔNG tự chặn hay loại khỏi thống kê. Người nghiên cứu cần áp dụng tiêu chí đã chốt trước khi phân tích; câu hỏi tự khai không bảo đảm phát hiện mọi trường hợp tham gia lặp.

## Lưu trữ và xuất dữ liệu

Thông tin được lưu một lần trong profile của phiên cùng profileVersion=2 và consentVersion=participant-background-v2. Giao diện có thông báo sử dụng thông tin nền tảng/điều kiện quan sát cho nghiên cứu, người tham gia xác nhận trước khi bắt đầu.

- Trang admin hiển thị 7 trường trong bảng phiên tham gia.
- “Tải CSV” xuất từng phản hồi, kèm 7 trường để nối với kết quả A/B.
- “CSV người tham gia” xuất một dòng mỗi phiên, tránh đếm một người 16/24 lần khi mô tả phân bố mẫu.
- Admin export yêu cầu ADMIN_TOKEN. API người tham gia không công khai profile các phiên khác.
- Phiên cũ không có trường tương ứng ghi not_collected (Chưa thu thập).
- Hai trường tùy chọn bị bỏ trống ghi not_provided (Bỏ qua).
- Chọn Không muốn trả lời ghi prefer_not, khác với bỏ trống hoặc chưa từng thu.
- Giá trị cũ không có trong danh mục mới giữ nguyên trong CSV, admin hiển thị kèm “giá trị cũ”; không tự biến đổi nghề nghiệp cũ thành nghề nghiệp mới.

## Tên cột và mã dữ liệu

| CSV | Thuộc tính profile | Mã |
|---|---|---|
| age_group | ageGroup | 18_24, 25_34, 35_44, 45_54, 55_plus |
| gender | gender | male, female, other, prefer_not |
| career | career | student, employed, other, prefer_not |
| field_of_work | fieldOfWork | it_ai, design_photography, other |
| image_experience | imageExperience | none, basic, frequent, professional_research |
| vision | vision | clear_without_glasses, clear_with_glasses, difficulty |
| prior_participation | priorParticipation | no, yes |

CSV cũng có profile_version và consent_version để phân biệt phiên bản biểu mẫu. Pilot/released/phiên dở vẫn được xuất để kiểm tra; lọc mode=research và status=complete cho thống kê chính thức, sau đó áp dụng tiêu chí chất lượng nghiên cứu đã định trước.

## Triển khai

Giải nén gói update ghi đè vào thư mục source hiện tại, commit/push lên GitHub và redeploy Netlify. Không cần thay DATABASE_URL/ADMIN_TOKEN, không cần đổi schema PostgreSQL vì profile nằm trong JSONB. Không đưa .env hoặc dữ liệu người tham gia lên GitHub.

Phiên đang dở trước cập nhật vẫn tiếp tục được, không ép họ trả lời bổ sung giữa chừng. Nếu muốn bộ mẫu chính thức có cùng thông tin nền tảng, bắt đầu bằng STUDY_ID mới (ví dụ retargeting-criteria-v22-research). Dữ liệu study cũ được giữ nguyên.

Chỉ source local/gói update đã được thay đổi, bản online cần redeploy để có biểu mẫu mới. Giữ nguyên protocol ảnh và cấu hình chỉ tiêu theo README_V2.md.
