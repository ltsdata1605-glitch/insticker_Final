# Sticker Event App 🚀

Ứng dụng quản lý và tra cứu thông tin sản phẩm từ file Excel, tích hợp tính năng tính toán thưởng (bonus) và báo cáo dữ liệu.

## ✨ Tính năng chính
- **Nhập liệu Excel**: Tải lên file Excel chứa danh sách sản phẩm.
- **Tra cứu nhanh**: Tìm kiếm sản phẩm theo mã code.
- **Tính toán Bonus**: Tự động tính toán các khoản thưởng dựa trên dữ liệu.
- **Báo cáo & Phân tích**: Biểu đồ trực quan về doanh số và hiệu quả.
- **Đồng bộ Firebase**: Lưu trữ dữ liệu an toàn và thời gian thực.

## 🛠 Công nghệ sử dụng
- **Frontend**: React, TypeScript, Vite, Tailwind CSS.
- **Backend**: Firebase (Firestore, Authentication).
- **Thư viện**: Lucide Icons, Recharts, XLSX.

## 🚀 Hướng dẫn cài đặt (Local Development)

1. **Clone repository**:
   ```bash
   git clone <your-github-repo-url>
   cd <repo-name>
   ```

2. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

3. **Cấu hình môi trường**:
   - Tạo file `.env.local` dựa trên `.env.example`.
   - Điền các thông tin cấu hình Firebase của bạn.

4. **Chạy ứng dụng**:
   ```bash
   npm run dev
   ```

## 📦 Triển khai (Deployment)

### Netlify
Ứng dụng đã được cấu hình sẵn cho Netlify thông qua file `netlify.toml` và `public/_redirects`.
1. Kết nối repo này với Netlify.
2. **Cấu hình Biến môi trường (Environment Variables)**: Trong cài đặt Netlify (Site settings > Build & deploy > Environment), hãy thêm các biến sau:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
3. **Cấu hình Firebase Authorized Domains**:
   - Truy cập [Firebase Console](https://console.firebase.google.com/).
   - Chọn dự án của bạn > **Authentication** > **Settings** > **Authorized domains**.
   - Thêm domain Netlify của bạn (ví dụ: `your-app.netlify.app`) vào danh sách. Nếu không, tính năng đăng nhập sẽ bị chặn.

### GitHub Pages
Nếu muốn triển khai lên GitHub Pages, hãy cập nhật `base` trong `vite.config.ts` nếu repo không nằm ở root domain.

## 🔒 Bảo mật
File `firebase-applet-config.json` đã được đưa vào `.gitignore` để bảo vệ mã API của bạn. Hãy luôn sử dụng **Environment Variables** cho các môi trường production.

---
*Phát triển bởi [AI Studio Build](https://ai.studio/build)*
