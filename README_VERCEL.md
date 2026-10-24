# Chuyển Image Study từ Netlify sang Vercel

Đã thêm Vercel Functions, giữ giao diện, 7 câu thông tin người tham gia, chọn 2–3 tiêu chí, 8 cặp ảnh/tiêu chí, admin và xuất dữ liệu. PostgreSQL/Neon hiện có được dùng lại; không có bước chuyển hoặc xóa database.

## 1. Cập nhật repository GitHub

Repo hiện có: https://github.com/ngqynhanh/ab-testing-web

Giải nén gói update và ghi đè vào thư mục source của repo. Giữ thư mục `public/stimuli` và `data/tables.json` hiện có. Gói update nhỏ không chứa lại 480 ảnh; gói full có đầy đủ ảnh.

Push các thay đổi lên repo. Nếu thao tác bằng terminal, ở đúng thư mục chứa package.json:

```powershell
git add .gitignore .vercelignore vercel.json api lib/http.mjs lib/vercel.mjs dev.mjs netlify/functions/api.mjs package.json test/vercel.test.mjs README_VERCEL.md
git commit -m "Add Vercel deployment support"
git push origin main
```

Không đưa .env.local/.env/.neon hoặc dữ liệu người tham gia lên GitHub. Những file này được loại khỏi gói và cấu hình ignore. Tác vụ này sửa source và tạo gói bàn giao, chưa commit/push hoặc deploy lên tài khoản Vercel.

## 2. Import trên Vercel

1. Đăng nhập Vercel và chọn Add New > Project.
2. Import GitHub repository `ngqynhanh/ab-testing-web`. Nếu Vercel chưa thấy repo, cấp quyền GitHub phù hợp cho repo này.
3. Framework Preset: **Other**.
4. Root Directory: **.** khi repo có package.json/vercel.json ở gốc (đúng cấu trúc repo hiện tại). Không nhập tên thư mục trên máy Windows vào đây.
5. Build Command: `npm run build`.
6. Output Directory: `public`.
7. Install Command: để mặc định, Vercel sử dụng lockfile npm.
8. Node.js: dùng 22.x hoặc phiên bản được Vercel hỗ trợ khớp engines >=22 trong package.json.

`vercel.json` đã khai báo build/output, nên không cần đoán hoặc tự thêm SPA catch-all rewrite.

Bộ ảnh khoảng 174 MiB. Ưu tiên import repo qua GitHub như trên: Vercel giới hạn source upload bằng CLI ở mức 100 MB trên Hobby. Không nén lại hoặc giảm chất lượng ảnh nghiên cứu chỉ để vượt giới hạn upload CLI. Các file ảnh riêng lẻ trong bộ hiện tại đều nhỏ hơn 2 MiB. Xem https://vercel.com/docs/limits.

## 3. Environment Variables

Thêm trong project Vercel, tối thiểu cho môi trường Production. Nếu test Preview, đặt cấu hình Preview riêng và dùng STUDY_ID test riêng, tránh làm đầy chỉ tiêu nghiên cứu thật.

| Key | Giá trị |
|---|---|
| DATABASE_URL | Connection string Neon/PostgreSQL hiện có; giữ nguyên |
| ADMIN_TOKEN | Khóa quản trị hiện có, tối thiểu 32 ký tự; viết HOA đúng tên biến |
| STUDY_ID | Giữ ĐÚNG giá trị trên Netlify nếu muốn tiếp tục dữ liệu/chỉ tiêu cũ |
| STUDY_MODE | Giữ pilot hoặc research theo nghiên cứu đang chạy |
| STUDY_OPEN | true để nhận người, false để đóng đăng ký mới |
| TARGET_PER_QUESTION | 20–30 tùy chỉ tiêu đã chốt |
| DIMENSIONS_ACKNOWLEDGED | Giữ giá trị theo protocol ảnh; true chỉ sau khi đã chốt quy trình kích thước |

Không ghi giá trị bí mật vào vercel.json, JavaScript frontend hoặc GitHub. Vercel không tự lấy biến từ Netlify hay file .env.local trên máy bạn. Cấu hình env trên Vercel và deploy/redeploy để áp dụng.

Database đã có bảng thì không cần chạy migration nữa. Chỉ database mới chưa có `retargeting_studies` mới cần `npm run db:migrate` bằng cấu hình của database đó. Không dùng script migration để đổi/xóa dữ liệu khi chỉ đổi host.

## 4. Deploy và kiểm tra

Sau khi thêm env, chọn Deploy. Khi có URL, kiểm tra:

- `/`: trang chọn 2 hoặc 3 tiêu chí, biểu mẫu 7 thông tin.
- `/api/config`: JSON công khai có mode, studyId, 3 câu hỏi, 7 mục profile; không chứa secret hoặc dữ liệu người tham gia.
- `/admin.html`: đăng nhập bằng ADMIN_TOKEN, kiểm tra số hoàn thành/đang làm có đúng study cũ.
- CSV phản hồi và CSV người tham gia tải được.

Để chạy một phiên thử đầy đủ, dùng Preview deployment với STUDY_MODE=pilot, STUDY_ID khác study thật, STUDY_OPEN=true. Chạy đủ 16/24 lượt và xem CSV trước khi phát URL Production.

Nếu project bật Deployment Protection, người tham gia ngoài tài khoản của bạn có thể gặp màn hình đăng nhập Vercel. Kiểm tra URL Production bằng trình duyệt không đăng nhập; cấu hình quyền truy cập project cho đối tượng nghiên cứu theo giao diện Vercel nếu cần. Không gửi URL preview bị khóa để thay cho link nghiên cứu công khai.

## 5. Dữ liệu khi đổi domain

Database và phản hồi cũ được giữ nguyên khi DATABASE_URL và STUDY_ID giữ nguyên. Khóa tiếp tục phiên nằm trong localStorage theo domain, vì vậy người đang làm trên domain Netlify không tự tiếp tục phiên đó trên domain Vercel. Không tự giải phóng hoặc xóa các phiên cũ.

Nếu phiên cũ đã bỏ dở do Netlify bị pause, người nghiên cứu có thể xác nhận rồi đóng phiên đó trong admin để giải phóng chỉ tiêu, giữ nguyên dữ liệu dở. Nên chuyển host giữa các đợt tuyển và thông báo người đã hoàn thành không làm lại. Không bắt đầu study mới chỉ để đổi domain nếu cần giữ chỉ tiêu cũ.

## Kỹ thuật

- API dùng native Request/Response entry `api/study.mjs` trên Node.js.
- Rewrite `/api/:action` tới `/api/study?studyAction=:action`; cả URL gốc và URL sau rewrite đều được xử lý.
- Dataset `data/tables.json` được include vào Function bundle, không được publish như static data.
- Chỉ `public` được phát hành thành nội dung tĩnh, ảnh vẫn nguyên byte.
- Secrets chỉ có trong runtime env. API và các export dùng Cache-Control no-store.
- Logic API chung ở `lib/http.mjs`. Adapter Netlify cũ vẫn được giữ để có thể rollback, Vercel không dùng thư mục netlify.
- Dev server và integration test local đã chuyển qua handler Vercel, dùng lại Neon transaction và schema hiện có.

## Lỗi thường gặp

- Frontend mở nhưng `/api/config` 404: thiếu `api/study.mjs`/vercel.json hoặc Root Directory sai.
- Thiếu `data/tables.json`: kiểm tra functions.includeFiles và Root Directory, không bỏ dataset server khỏi repo.
- ADMIN_TOKEN chưa cấu hình: đặt biến HOA đúng tên ở Production, rồi redeploy.
- Chưa có bảng: chạy migration trên đúng database; không tạo database mới nếu database cũ vẫn còn.
- Admin không thấy dữ liệu cũ: đối chiếu DATABASE_URL và STUDY_ID, không tự sửa dữ liệu trước khi xác minh hai giá trị.

## Tài liệu Vercel

- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/environment-variables
