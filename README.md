# 🧠 UniPal – Trợ Lý ảo dành cho sinh viên

**UniPal** là một chatbot thông minh được phát triển nhằm hỗ trợ sinh viên trong việc tra cứu thông tin trường, tìm ngành học dựa theo sở thích và năng lực, quán ăn gần trường với giá tốt và đánh giá cao. Bot hoạt động trong hệ sinh thái Mezon, sử dụng công nghệ hiện đại:

-   🧠 **Ngôn ngữ tự nhiên (NLP)** từ [Gemini API](https://ai.google/discover/gemini/)
-   🗘️ **Google Maps Places API** và **OpenStreetMap** cho tra cứu địa điểm
-   🛠️ **Node.js** (TypeScript), **Python**, và **Mezon SDK** để xử lý logic và tương tác người dùng
-   ⚡ **RapidAPI**, **dotenv**, và nhiều công cụ Dev tiện ích khác

---

## 🚀 Bắt đầu với Mezon Application

### 1. Tạo ứng dụng Mezon

Truy cập [Mezon Developers Portal](https://dev-developers.nccsoft.vn/) để tạo ứng dụng mới.

### 2. Cài đặt bot vào Clan

Sau khi tạo ứng dụng, bạn sẽ nhận được liên kết cài đặt. Truy cập liên kết đó bằng trình duyệt để thêm bot vào Clan mà bạn muốn.

---

## 🛠️ Cài đặt môi trường phát triển (Local)

### 1. Cài đặt các dependencies

```bash
$ npm install
```

### 2. Tạo file cấu hình môi trường

Sao chép file `.env.example` thành `.env`:

```bash
$ cp .env.example .env
```

Điền các biến môi trường sau trong file `.env`:

```env
APPLICATION_TOKEN=your_application_key
RAPIDAPI_KEY=your_rapidapi_key
GEMINI_API_KEY=your_google_gemini_key
```

### 3. Chạy ứng dụng

```bash
$ npm run start
```

Dự án thuộc sở hữu của nhóm phát triển UniPal, dành cho mục đích học tập và nghiên cứu trong hệ sinh thái Mezon.
