# Hệ Thống Tự Động Tạo Đơn Xin Cấp CPP

Ứng dụng giúp tự động hóa việc lập Đơn xin cấp Giấy chứng nhận sản phẩm dược phẩm (CPP) dựa trên dữ liệu sản phẩm có sẵn từ Google Spreadsheet.

## Hướng dẫn sử dụng

1. **Khởi chạy**: Double-click vào tệp [index.html](file:///C:/Users/admin/.gemini/antigravity/scratch/cpp-form-generator/index.html) để mở ứng dụng trực tiếp trong trình duyệt của bạn (Chrome, Edge, Firefox, v.v.). Không cần cài đặt gì thêm.
2. **Cấu hình**:
   - Nhập **Số công văn** và chọn **Ngày ký đề nghị** (mặc định lấy theo ngày hiện tại của bạn).
   - Bạn có thể chỉnh sửa thông tin doanh nghiệp như tên, địa chỉ, số điện thoại, số fax.
3. **Tìm kiếm & Lọc sản phẩm**:
   - Sử dụng ô tìm kiếm để lọc nhanh theo tên thuốc, số đăng ký hoặc hoạt chất.
   - Lọc nhanh theo phân loại sản phẩm (Thuốc, Mỹ phẩm, Trang thiết bị y tế, Thực phẩm chức năng).
4. **Chọn sản phẩm**:
   - Tích chọn một hoặc nhiều sản phẩm tại bảng danh sách ở bên trái.
   - Dữ liệu của sản phẩm được chọn sẽ tự động điền vào mẫu tờ trình A4 ở bên phải theo thời gian thực (real-time preview).
5. **Xuất bản**:
   - **Tải file Word (.doc)**: Click để xuất file đơn đề nghị định dạng Word. File tải về tương thích hoàn toàn với Microsoft Word trên máy tính của bạn, giữ nguyên các cột, căn lề và văn bản màu đỏ đặc trưng.
   - **Tải file PDF / In**: Click để in trực tiếp hoặc lưu dưới dạng file PDF sử dụng công cụ in gốc của trình duyệt (A4 dọc).

## Quy định ánh xạ dữ liệu từ Spreadsheet

Các trường thông tin được tự động ánh xạ theo quy định:
- **Tên thuốc** = `Tên sản phẩm` (in đậm) + `Dạng bào chế` (in thường, bên dưới).
- **Hoạt chất, thành phần, hàm lượng (nồng độ)** = `Nồng độ hàm lượng` (nếu trống sẽ tự động lấy từ cột `Hoạt chất`).
- **Quy cách đóng gói** = `Quy cách đóng gói` (giữ nguyên các dấu xuống dòng dạng danh sách).
- **Tiêu chuẩn chất lượng** = `TCCL` (Nếu là `TCCS` sẽ tự động chuyển thành `Tiêu chuẩn cơ sở` như mẫu).
- **Hạn dùng** = `Hạn dùng`.
- **Số giấy phép lưu hành** = `Số đăng ký`.

## Tính năng khôi phục & hoạt động ngoại tuyến (Offline)

- Ứng dụng sẽ tự động kết nối và đồng bộ dữ liệu mới nhất từ link Google Spreadsheet của bạn.
- Trong trường hợp không có kết nối internet hoặc bị chặn CORS, ứng dụng sẽ tự động tải **748 sản phẩm** từ cơ sở dữ liệu ngoại tuyến được đóng gói sẵn (`data-fallback.js`).
- Ngoài ra, bạn có thể copy trực tiếp các dòng sản phẩm từ bảng Google Spreadsheet và paste vào khung **"Nhập dữ liệu thủ công"** ở góc trái để cập nhật nhanh chóng mà không cần kết nối mạng.
