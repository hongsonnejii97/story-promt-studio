@echo off
chcp 65001 > nul
title StoryPrompt Studio - Tool Ghép Prompt Ảnh Từ Link Truyện

echo ========================================================
echo    🚀 Đang khởi động StoryPrompt Studio...
echo ========================================================
echo.

:: Check python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy Python trên máy tính.
    echo Vui lòng cài đặt Python từ https://www.python.org/
    pause
    exit /b 1
)

:: Open browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: Start Uvicorn Server
echo [THÔNG BÁO] Máy chủ đang chạy tại: http://localhost:8000
echo Nhấn Ctrl + C để dừng máy chủ.
echo.
python app.py

pause

