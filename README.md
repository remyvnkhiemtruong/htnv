# Học tốt Ngữ Văn

Nền tảng học tập Ngữ văn THPT hỗ trợ đọc hiểu theo 6 trục thi pháp, hồ sơ phiên bản bất biến, phản hồi AI thủ công/giáo viên, rubric và phân tích tiến bộ dựa trên dữ liệu thật.

## Trạng thái

- **Phiên bản nghiệp vụ:** Workflow V4 — KHKT 2026–2027
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Vercel Functions + PostgreSQL/Neon
- **Xác thực:** cookie HttpOnly + JWT + RBAC; tài khoản do nhà trường/quản trị viên cấp, không có đăng ký công khai
- **AI hiện tại:** không gọi API trả phí. Tài khoản AI mở đúng bài/đúng version, người vận hành copy response từ ChatGPT và dán vào. Khi bấm gửi, học sinh thấy góp ý AI ngay.
- **Điểm chính thức:** chỉ giáo viên chấm Rubric; máy chủ tính điểm từ rubric gắn đúng assignment.
- **Production:** https://htnv.io.vn

Tên sản phẩm chính thức là **Học tốt Ngữ Văn**. Slug GitHub/Vercel được giữ để không làm gián đoạn hạ tầng.

## Vai trò hệ thống

- `student` — Học sinh
- `teacher` — Giáo viên
- `peer` — Người phản biện bạn học theo phân công
- `researcher` — Người nghiên cứu/giám khảo chỉ xem dữ liệu ẩn danh
- `admin` — Quản trị hệ thống
- `ai` — Tài khoản nhập response ChatGPT thủ công

## Luồng học thuật chuẩn

1. Giáo viên tạo lớp, gán học sinh, chọn đúng revision ngữ liệu và rubric rồi xuất bản nhiệm vụ.
2. Nếu nhiệm vụ bật dự đoán trước đọc, học sinh hoàn thành **V0**. V0 lưu dự đoán + căn cứ + mức tự tin và bị khóa sau khi nộp; V0 không được chấm như đáp án đúng/sai tuyệt đối.
3. Học sinh đọc, viết theo 6 trục thi pháp; autosave chỉ cập nhật draft, không tạo version.
4. Học sinh nộp **V1**. Backend tạo version bất biến và `ai_review_request` trong cùng luồng nghiệp vụ.
5. Tài khoản `ai` mở đúng học sinh + assignment + version, copy response từ ChatGPT, dán vào workspace và bấm **Gửi góp ý AI cho học sinh**.
6. Backend tạo feedback `author_role='ai'`; học sinh thấy ngay để sửa bài. Giáo viên vẫn xem toàn bộ lịch sử, có thể ghi nhận, bổ sung hoặc tạo feedback giáo viên riêng; phản hồi AI gốc không bị sửa thành feedback giáo viên.
7. Học sinh chỉ được nộp **V2**/revision sau khi version trước đã có feedback. Khi nộp revision phải lưu phần thay đổi, lí do sửa, nguồn thay đổi và feedback liên quan.
8. Sau V2/revision, học sinh hoàn thành **REF1 – Tự phản tư** gồm 5 câu. REF1 gắn đúng version và bất biến.
9. Chỉ sau REF1, giáo viên chấm **Rubric chính thức**. Máy chủ xác thực rubric của assignment và tự tính tổng điểm.
10. Kết quả FINAL, lịch sử version, feedback và rubric được dùng cho báo cáo tiến bộ/lớp và nghiên cứu ẩn danh.

Luồng rút gọn: **V0 → V1 → phản hồi AI/GV → V2 → REF1 → Rubric giáo viên → FINAL**.

## 6 trục thi pháp

1. Tình huống – Cốt truyện
2. Nhân vật – Chi tiết nghệ thuật
3. Người kể chuyện – Điểm nhìn
4. Không gian – Thời gian nghệ thuật
5. Ngôn ngữ – Giọng điệu – Biểu tượng
6. Tổng hợp – Lập luận

## Dữ liệu seed KHKT 2026–2027

Seed chuẩn nằm tại `scripts/seed-khkt-2026-2027.sql`. Script không chứa mật khẩu, không tạo bài nộp giả, feedback giả, AI review giả hay điểm giả.

Baseline production sạch gồm:

- 1 lớp `11A1-KHKT`;
- 1 giáo viên và 2 học sinh demo được gán lớp;
- 1 rubric 6 trục × 4 mức;
- 4 ngữ liệu/revision và 4 nhiệm vụ: **Vợ nhặt**, **Chí Phèo**, **Xuân Tóc Đỏ cứu quốc**, **Mùa lá rụng trong vườn**;
- 2 portfolio/draft trống cho mỗi nhiệm vụ;
- 0 submitted version, 0 feedback, 0 AI review, 0 reflection, 0 rubric submission.

Không nhúng toàn văn tác phẩm có bản quyền vào seed. Nội dung ngữ liệu đầy đủ do giáo viên quản lí qua kho văn bản/revision riêng.

## Tài khoản baseline

- `admin@cvt.edu.vn` — admin cao nhất
- `ai-response@cvt.edu.vn` — AI Response thủ công
- `giaovien@cvt.edu.vn` — giáo viên Ngữ văn
- `hocsinh1@cvt.edu.vn`, `hocsinh2@cvt.edu.vn` — học sinh demo
- `peer@cvt.edu.vn` — phản biện demo
- `researcher@cvt.edu.vn` — nghiên cứu demo

Mật khẩu không được lưu trong repository. Admin có thể tạo/reset tài khoản qua `/api/admin/manage`; mật khẩu tạm chỉ được trả về tại thời điểm thao tác. Hệ thống không có endpoint đăng ký tài khoản công khai.

## Phân hệ

### Học sinh

- Danh sách nhiệm vụ theo lớp thật
- V0 dự đoán trước đọc
- Editor 6 trục + autosave server-side
- Version bất biến V1/V2…
- Feedback AI/giáo viên
- So sánh version
- REF1 tự phản tư
- Rubric và báo cáo tiến bộ

### AI Response

- Hàng đợi version đã nộp
- Hiển thị đúng bài và đúng immutable version
- Hiển thị định hướng AI, lỗi thường gặp, gợi ý chuyên môn và rubric của assignment
- Dán response ChatGPT thủ công
- Gửi feedback AI cho học sinh ngay
- Không tích hợp API AI trả phí
- Không quyết định điểm Rubric chính thức

### Giáo viên

- Bàn làm việc theo lớp được phân công
- Review đúng học sinh + assignment + immutable version
- Xem feedback AI đã gửi học sinh
- Bổ sung feedback giáo viên riêng
- Chấm rubric đúng assignment sau REF1
- Quản lí nhiệm vụ, rubric và revision ngữ liệu
- Class Analytics từ dữ liệu thật

### Admin

- Tạo tài khoản và mật khẩu tạm
- Đổi role / khóa / mở tài khoản
- Reset mật khẩu
- Tạo lớp và gán thành viên
- Audit log

### Nghiên cứu

- Chỉ nhận pseudonym, không PII
- Không nhận mutable draft
- Pre/post từ dữ liệu version/rubric thật
- Không tạo số liệu giả khi dữ liệu chưa đủ

## Backend API

- `GET /api/health` — health/schema counters
- `POST /api/auth/login` — đăng nhập
- `GET/PATCH /api/auth/me` — session/hồ sơ
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/academic/snapshot` — snapshot theo RBAC
- `POST /api/academic/action` — draft/version/feedback/rubric/assignment/AI/reflection
- `GET /api/admin/users` — admin-only
- `POST /api/admin/manage` — admin-only

## PostgreSQL

Các bảng trọng yếu gồm `app_users`, `classes`, `class_members`, `literature_texts`, `literature_text_versions`, `rubrics`, `rubric_criteria`, `assignments`, `portfolios`, `portfolio_drafts`, `portfolio_versions`, `submission_idempotency_keys`, `feedbacks`, `ai_review_requests`, `student_reflections`, `rubric_submissions`, `peer_review_assignments`, `version_feedback_links`, `audit_logs`, `auth_rate_events`.

- `portfolio_versions` là immutable snapshot; server tạo `sequence_no`, checksum và idempotency key.
- assignment trỏ đúng `literature_text_version_id`.
- `student_reflections` gắn đúng portfolio+version và có trigger chặn UPDATE/DELETE.
- điểm rubric được máy chủ tính từ rubric của assignment.

## Biến môi trường

Production cần:

- `DATABASE_URL`
- `JWT_SECRET` — bắt buộc, tối thiểu 32 ký tự; backend không suy ra khóa ký JWT từ dữ liệu trong database.

Không commit secrets/mật khẩu vào repository.

## Chạy local

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Build chạy regression/invariant tests, TypeScript, lint và Vite build. Dự án giữ tối đa 12 Vercel Functions.

## Nguyên tắc production

- Không lưu JWT trong localStorage.
- Cookie HttpOnly; API nhạy cảm xác thực server-side.
- Không cho phép đăng ký tài khoản công khai; tài khoản chỉ được cấp/quản trị qua luồng admin.
- Không dùng localStorage làm database.
- Không dùng dữ liệu giả thay cho editor/version/review/audit/analytics production.
- Draft autosave không tạo version.
- Version và REF1 đã nộp là bất biến.
- AI Response là manual ChatGPT-paste flow; feedback AI hiển thị cho học sinh ngay.
- AI không chấm điểm chính thức.
- Giáo viên chỉ thao tác trong lớp được phân công.
- Peer chỉ review assignment/version được gán và không review chính mình.
- Researcher chỉ xem dữ liệu ẩn danh.
