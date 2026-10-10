# HTNV — bàn giao VPS

Setup ngày 10/10/2026 (giờ Việt Nam).

Website: https://htnv.io.vn/
Trang đăng nhập: https://htnv.io.vn/login
Health: https://htnv.io.vn/api/health

## Cấu hình đang chạy

- VPS Ubuntu, Node.js 24.21.0 LTS, Nginx và dịch vụ systemd `htnv`.
- Mã nguồn: `/root/HTNV/htnv`.
- Bản đang chạy: `/srv/htnv/current`, trỏ tới một thư mục trong `/srv/htnv/releases`.
- API chỉ lắng nghe tại `127.0.0.1:3000`; Nginx phục vụ giao diện và chuyển tiếp `/api/`.
- Dịch vụ chạy bằng tài khoản hệ thống `htnv`, tự khởi động cùng VPS và tự chạy lại khi lỗi.
- `/etc/htnv.env` chứa DATABASE_URL, DATABASE_URL_UNPOOLED và các khóa ký; chỉ root đọc được (0600). Không đưa file này lên Git.
- Kết nối ứng dụng dùng Neon pooler với TLS kiểm tra chứng chỉ và channel binding. Kết nối trực tiếp được cấu hình riêng cho thao tác quản trị database.
- HTTPS cho IP có chứng chỉ Let's Encrypt hợp lệ. `htnv-cert-renew.timer` kiểm tra gia hạn mỗi 6 giờ; hook reload Nginx sau khi gia hạn.
- Dữ liệu và mật khẩu tài khoản hiện có được giữ lại. Đăng nhập bằng tài khoản đã được cấp; setup không tạo mật khẩu thay thế.

## Kiểm tra đã đạt

- Build production, các bộ regression tests, TypeScript cho frontend/API và lint không có lỗi. Lint còn 20 cảnh báo của project hiện có.
- Npm audit: 0 lỗ hổng.
- Smoke HTTPS: 14/14 kiểm tra đạt.
- Kiểm tra tích hợp API: 16/16 kiểm tra đạt, gồm xác thực phiên admin/học sinh/giáo viên, workspace, chặn học sinh truy cập quản trị, chặn Origin không hợp lệ và JSON lỗi.
- Phiên tích hợp dùng JWT được ký nội bộ để kiểm tra các role. Chưa kiểm tra đăng nhập bằng mật khẩu thật vì chưa có mật khẩu ứng dụng được cung cấp.
- Trình duyệt đã tải trang chủ và trang đăng nhập.
- Gia hạn chứng chỉ thử nghiệm và hook reload Nginx đã đạt.
- Sao lưu PostgreSQL dạng custom dump được tạo tại `/root/htnv-setup-backups`; đã xác minh danh mục 142 đối tượng bằng pg_restore.

## Quản lý dịch vụ

```bash
systemctl status htnv nginx --no-pager
journalctl -u htnv -n 80 --no-pager
systemctl restart htnv
systemctl list-timers htnv-cert-renew.timer --no-pager
curl -fsS https://htnv.io.vn/api/health
```

## Cập nhật bản chạy

Sau khi cập nhật mã nguồn trong `/root/HTNV/htnv`, chạy:

```bash
/root/HTNV/htnv/deploy/deploy.sh
```

Script cài dependency từ lockfile, chạy toàn bộ build và kiểm tra, tạo bản chạy mới, chuyển ứng dụng sang bản đó và kiểm tra health. Các bản cũ được giữ trong `/srv/htnv/releases` để có thể quay lại khi cần.

## Tên miền

Đã cấu hình https://htnv.io.vn/login trên VPS ngày 10/10/2026. DNS tên miền chính và www đều trỏ tới 36.50.135.241. HTTP và www chuyển hướng về https://htnv.io.vn. Chứng chỉ Let's Encrypt cho htnv.io.vn và www.htnv.io.vn hết hạn ngày 08/01/2027, đã bật tự gia hạn và kiểm tra dry-run thành công. HTTPS bằng IP tiếp tục hoạt động.

Nginx tên miền: /etc/nginx/sites-available/htnv-domain. Bản cấu hình lưu cùng mã nguồn tại deploy/nginx-domain.conf. Dịch vụ htnv-cert-renew kiểm tra cả chứng chỉ IP và tên miền.

## Tài khoản 12A9

Đã cấp tài khoản và giao ba nhiệm vụ khối 12 cho lớp 12A9 năm học 2026–2027: Tây Tiến, Mùa lá rụng trong vườn và Xuân Tóc Đỏ cứu quốc. Giáo viên Đoàn Sin và Nguyễn Thị Kiều Duyên quản lý lớp. Thông tin đăng nhập được bàn giao riêng, không lưu trong repository.

## Database và mã nguồn

Neon đã có schema cùng 173 tài khoản, 5 lớp và 12 nhiệm vụ. Không chạy seed hay migration trong lần setup này. Bảng version_feedback_links hiện chưa có FK feedback_id → feedbacks.id; migration đã có trong repository và cần thực hiện riêng theo quy trình kiểm thử/approval của project trước khi áp dụng trên database đang có dữ liệu.

Các thay đổi phục vụ VPS nằm trong `server/`, `deploy/`, `tsconfig.server.json`, các scripts trong package.json, phần cấu hình pool PostgreSQL và metadata health. Cấu hình này được quản lý cùng mã nguồn trên Git. Các khóa và bản sao dữ liệu chỉ lưu tại VPS trong `/root/htnv-setup-backups`.
