# StoryPrompt Studio - Tool Ghép Prompt Ảnh Từ Link Truyện

Công cụ tự động hóa quy trình chuyển đổi link truyện thành các Prompt chi tiết cho ChatGPT / Midjourney / DALL-E / Stable Diffusion để tạo 1 bức ảnh chân thực (photorealistic) diễn tả khoảnh khắc cao trào cảm xúc nhất của câu chuyện.

---

## 🌟 Tính Năng Nổi Bật

1. **Quản lý & Lưu Trữ Prompt Mẫu Toàn Cục**:
   - Cho phép tải lên (`.txt`) và lưu trữ vĩnh viễn prompt mẫu dùng chung cho tất cả các yêu cầu.
   - Hỗ trợ khôi phục về prompt mẫu chuẩn mặc định bất cứ lúc nào.
   - Tùy chỉnh linh hoạt vị trí ghép Mã truyện và Mô tả truyện.

2. **Tự Động Trích Xuất Mô Tả Truyện Từ Link**:
   - Tự động cào và bóc tách tóm tắt / nội dung giới thiệu từ các website truyện tiếng Việt (Truyenfull, DTruyen, MetruyenCV, TangThuVien, Wattpad, SSTruyen, v.v.) và các trang web khác.
   - Tự động làm sạch các câu quảng cáo, lời chào, watermarks gây nhiễu.
   - Cơ chế bypass TLS / Cloudflare thông minh với `curl_cffi` và `requests`.

3. **Chỉnh Sửa Trực Tiếp & Real-time Auto Update**:
   - Xem trước nội dung mô tả đã lấy được.
   - Cho phép chỉnh sửa nhanh mô tả hoặc nhập tay nếu link bị chặn; Prompt hoàn chỉnh sẽ tự động cập nhật ngay lập tức.

4. **Xử Lý Hàng Loạt (Batch Mode)**:
   - Dán danh sách nhiều truyện cùng lúc:
     ```text
     Mã truyện 1 | Link truyện 1
     Mã truyện 2 | Link truyện 2
     TRUYEN01 | https://dtruyen.com/...
     TRUYEN02 | https://truyenfull.io/...
     ```
   - Hỗ trợ tải file danh sách `.txt` / `.csv`.
   - Nút **Copy TẤT CẢ Prompts** để dán 1 lần sang công cụ AI.
   - Nút **Copy Prompt** riêng cho từng truyện.
   - Xuất file `.txt` lưu trữ tiện lợi.

---

## 🚀 Hướng Dẫn Khởi Động

### Cách 1: Chạy nhanh bằng file Batch (Khuyên dùng trên Windows)
- Nhấp đúp chuột vào file **`run.bat`**.
- Trình duyệt sẽ tự động mở địa chỉ: `http://localhost:8000`.

### Cách 2: Chạy bằng dòng lệnh Terminal
```bash
python app.py
```
Sau đó mở trình duyệt truy cập: `http://localhost:8000`.

---

## 📋 Mẫu Prompt Cuối Cùng Được Tạo Ra

```text
[Mã truyện] + 
You are an expert at converting written stories into a single photorealistic image.
When a story is provided, you must:
1. Carefully read and understand the entire story.
2. Identify the SINGLE most emotionally impactful moment (emotional peak).
3. Generate ONE image that depicts ONLY that moment.
4. Choose a non-violating scene to create the image while still capturing the essence of the story.

Strict rules for selecting the moment:
- Choose the highest emotional peak (conflict, shock, betrayal, realization, confrontation, silent tension).
- Avoid neutral or transitional scenes.
- Avoid summaries or setup unless they contain the emotional climax.
- Prefer moments with strong human interaction and visual tension.
- The moment must be understandable visually without needing story context.

Strict rules for the image:
- Photorealistic, real-life snapshot (NOT illustration, NOT cinematic).
- Natural, unposed, candid moment.
- Characters must behave naturally, not looking at camera.
- Vietnamese people, realistic everyday appearance.
- Natural cool daylight only (no warm interior lamps, no yellow artificial light).
- Subtle, real emotions (micro-expressions, not exaggerated acting).
- Slight imperfections allowed (blur, noise, messy environment, imperfect framing).

Style:
- Like a secretly captured real-life photo
- Emotional, raw, quiet tension
- No cinematic color grading, no over-editing
- Expressive, soulful eyes.
Technical:
- Aspect ratio 4:5
- Clean white and blue color palette, strictly eliminate yellow/sepia tones.
- Natural skin texture, beautify
Output format:
Return ONLY the final image. Do not explain anything.
Bright, luminous skin tones and backgrounds; the subject always looks beautiful.
An absolutely bright white color palette, minimizing black tones in the image.
Story:
[Nội dung tóm tắt / mô tả truyện được tự động lấy từ link]
```

---

## 📂 Cấu Trúc Dự Án

```
Promt-Images-GPT/
├── app.py              # Server FastAPI chính & API endpoints
├── scraper.py          # Bộ máy bóc tách mô tả truyện tự động
├── config.py           # Quản lý cấu hình & tệp lưu trữ prompt mẫu
├── prompt_builder.py   # Ghép mã truyện, prompt mẫu & mô tả
├── data/
│   ├── template.txt    # File lưu trữ prompt mẫu dùng chung
│   └── settings.json   # Cấu hình định dạng
├── static/
│   ├── index.html      # Giao diện web người dùng (UI)
│   ├── app.js          # Xử lý logic phía client (copy, batch, live edit)
│   └── style.css       # Hiệu ứng giao diện
├── requirements.txt    # Danh sách thư viện Python
├── run.bat             # File khởi chạy 1-click trên Windows
└── README.md           # Hướng dẫn chi tiết
```

