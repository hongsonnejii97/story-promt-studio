import os
import asyncio
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

import config
import scraper
import prompt_builder

app = FastAPI(title="Story Prompt Generator", description="Tool ghép prompt tạo ảnh từ link truyện")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories
config.DATA_DIR.mkdir(exist_ok=True)
static_dir = config.BASE_DIR / "static"
static_dir.mkdir(exist_ok=True)

class StoryItem(BaseModel):
    id: Optional[int] = None
    code: str
    url: str
    description: Optional[str] = ""

class BatchRequest(BaseModel):
    items: Optional[List[StoryItem]] = None
    raw_text: Optional[str] = None
    template_override: Optional[str] = None
    header_format: Optional[str] = None
    story_format: Optional[str] = None
    target_words: Optional[int] = 500

class AssembleRequest(BaseModel):
    code: str
    description: str
    template: Optional[str] = None
    header_format: Optional[str] = None
    story_format: Optional[str] = None

class TemplateUpdateRequest(BaseModel):
    template: str
    header_format: Optional[str] = None
    story_format: Optional[str] = None
    auto_clean_ads: Optional[bool] = None

def parse_raw_input(raw_text: str) -> List[StoryItem]:
    """
    Parses user input formatted as:
    Mã truyện | Link truyện
    Or separated by tab, comma, or colon.
    Supports codes that start with '#' like #ST12430.
    """
    items = []
    lines = raw_text.strip().split("\n")
    idx = 1
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Only treat as comment if line starts with '//' or '#' AND has no '|' and no 'http'
        if (line.startswith("//") or line.startswith("#")) and "|" not in line and "http" not in line:
            continue
        
        # Check separators: '|', '\t', ',', ' '
        code = ""
        url = ""
        if "|" in line:
            parts = line.split("|", 1)
            code = parts[0].strip()
            url = parts[1].strip()
        elif "\t" in line:
            parts = line.split("\t", 1)
            code = parts[0].strip()
            url = parts[1].strip()
        elif "," in line and "http" in line:
            parts = line.split(",", 1)
            code = parts[0].strip()
            url = parts[1].strip()
        else:
            # Try finding first url in line
            parts = line.split()
            if len(parts) >= 2:
                for i, p in enumerate(parts):
                    if p.startswith("http://") or p.startswith("https://") or "www." in p:
                        code = " ".join(parts[:i]).strip()
                        url = p.strip()
                        break
            if not url:
                code = line
                url = ""

        if code or url:
            items.append(StoryItem(id=idx, code=code, url=url))
            idx += 1
    return items

@app.get("/api/template")
def get_template_api():
    return {
        "template": config.get_template(),
        "settings": config.get_settings()
    }

@app.post("/api/template")
def update_template_api(req: TemplateUpdateRequest):
    config.save_template(req.template)
    settings_update = {}
    if req.header_format is not None:
        settings_update["header_format"] = req.header_format
    if req.story_format is not None:
        settings_update["story_format"] = req.story_format
    if req.auto_clean_ads is not None:
        settings_update["auto_clean_ads"] = req.auto_clean_ads
    if settings_update:
        config.save_settings(settings_update)
    return {
        "success": True,
        "template": config.get_template(),
        "settings": config.get_settings()
    }

@app.post("/api/template/reset")
def reset_template_api():
    t = config.reset_template()
    return {
        "success": True,
        "template": t,
        "settings": config.get_settings()
    }

@app.post("/api/template/upload")
async def upload_template_file(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="ignore")
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="File nội dung trống!")
    
    config.save_template(text)
    return {
        "success": True,
        "template": text.strip(),
        "filename": file.filename
    }

@app.post("/api/assemble")
def assemble_prompt_api(req: AssembleRequest):
    settings = config.get_settings()
    template = req.template if req.template is not None else config.get_template()
    header_fmt = req.header_format if req.header_format is not None else settings.get("header_format", "{code}\n\n")
    story_fmt = req.story_format if req.story_format is not None else settings.get("story_format", "\n{story}")
    
    final_prompt = prompt_builder.build_final_prompt(
        code=req.code,
        story_desc=req.description,
        template=template,
        header_format=header_fmt,
        story_format=story_fmt
    )
    return {"final_prompt": final_prompt}

async def process_single_item(item: StoryItem, sem: asyncio.Semaphore, template: str, header_fmt: str, story_fmt: str, auto_clean: bool, target_words: int = 500):
    async with sem:
        desc = (item.description or "").strip()
        success = True
        error = None
        
        # If description not provided, fetch from URL
        if not desc and item.url:
            res = await asyncio.to_thread(scraper.get_story_description, item.url, auto_clean_ads=auto_clean, target_words=target_words)
            if res.get("success"):
                desc = res.get("description", "")
            else:
                success = False
                error = res.get("error", "Không thể lấy nội dung")
                desc = ""
        elif not item.url and not desc:
            success = False
            error = "Chưa có Link truyện"

        final_prompt = prompt_builder.build_final_prompt(
            code=item.code,
            story_desc=desc,
            template=template,
            header_format=header_fmt,
            story_format=story_fmt
        )
        
        return {
            "id": item.id,
            "code": item.code,
            "url": item.url,
            "description": desc,
            "success": success,
            "error": error,
            "final_prompt": final_prompt
        }

@app.post("/api/generate-batch")
async def generate_batch_api(req: BatchRequest):
    items: List[StoryItem] = []
    if req.raw_text:
        items = parse_raw_input(req.raw_text)
    elif req.items:
        items = req.items
        for idx, item in enumerate(items, 1):
            if not item.id:
                item.id = idx

    if not items:
        return {"items": [], "total": 0, "success_count": 0}

    settings = config.get_settings()
    template = req.template_override if req.template_override else config.get_template()
    header_fmt = req.header_format if req.header_format is not None else settings.get("header_format", "{code}\n\n")
    story_fmt = req.story_format if req.story_format is not None else settings.get("story_format", "\n{story}")
    auto_clean = settings.get("auto_clean_ads", True)
    target_words = req.target_words if req.target_words else 500

    sem = asyncio.Semaphore(5)
    tasks = [process_single_item(item, sem, template, header_fmt, story_fmt, auto_clean, target_words) for item in items]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r["success"])
    return {
        "items": results,
        "total": len(results),
        "success_count": success_count,
        "error_count": len(results) - success_count
    }

# Mount static files
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
def serve_index():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return HTMLResponse(index_file.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>Trang web đang được khởi tạo...</h1>")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

