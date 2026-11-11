import re
import json
import logging
import urllib.parse
from typing import Dict, Any, List
from bs4 import BeautifulSoup

logger = logging.getLogger("scraper")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
}

# Regex to strip common ads / novel website boilerplate
AD_PATTERNS = [
    r"truyện\s*được\s*(đăng|convert|dịch)\s*tại[^\n\.]*",
    r"chúc\s*bạn\s*đọc\s*truyện\s*vui\s*vẻ[^\n\.]*",
    r"nguồn\s*:\s*[^\n\.]*",
    r"theo\s*dõi\s*truyện\s*tại[^\n\.]*",
    r"ủng\s*hộ\s*tác\s*giả[^\n\.]*",
    r"xem\s*thêm\s*tại[^\n\.]*",
    r"bản\s*convert\s*thuộc\s*về[^\n\.]*",
]

def clean_paragraph_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[ \t]+", " ", text)
    for pat in AD_PATTERNS:
        text = re.sub(pat, "", text, flags=re.IGNORECASE)
    return text.strip()

def fetch_url_html(url: str, timeout: int = 12) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # Try curl_cffi first for TLS / anti-bot bypass
    try:
        from curl_cffi import requests as cffi_requests
        resp = cffi_requests.get(
            url,
            headers=HEADERS,
            impersonate="chrome120",
            timeout=timeout,
            verify=False
        )
        if resp.status_code == 200 and resp.text:
            return resp.text
    except Exception as e:
        logger.debug(f"curl_cffi failed for {url}: {e}")

    # Fallback to standard requests
    import requests
    resp = requests.get(
        url,
        headers=HEADERS,
        timeout=timeout,
        verify=False
    )
    resp.encoding = resp.apparent_encoding or "utf-8"
    if resp.status_code == 200:
        return resp.text
    raise RuntimeError(f"HTTP error {resp.status_code}")

def is_chapter_url(url: str, soup: BeautifulSoup) -> bool:
    """Check if the provided URL is already pointing to a chapter reader page."""
    url_lower = url.lower()
    if re.search(r"/(?:chuong|chap|chapter|hoi|tiet)[-_]?0*1(?:[-_/.]|$)", url_lower):
        return True
    reader = soup.find(id="chapter-c") or soup.find(class_="reading-content") or soup.find(id="vung_doc") or soup.find(id="chapter-content")
    if reader and len(reader.get_text(strip=True)) > 400:
        return True
    return False

def find_chapter_one_url(main_url: str, soup: BeautifulSoup) -> str:
    """Finds the link to Chapter 1 from a novel overview/table-of-contents page."""
    # 1. Check priority CTA texts (e.g. 'ĐỌC NGAY', 'BẮT ĐẦU ĐỌC')
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        if any(p in txt for p in ["đọc ngay", "bắt đầu đọc", "đọc từ đầu"]):
            return urllib.parse.urljoin(main_url, a["href"])
            
    # 2. Check chapter 1 text in links (e.g. 'Chương 1', 'Chương 01', 'Hồi 1')
    for a in soup.find_all("a", href=True):
        txt = a.get_text(strip=True).lower()
        if re.search(r"\b(?:chương|chap|chapter|hồi|tiết)\s*0*1\b", txt):
            return urllib.parse.urljoin(main_url, a["href"])
            
    # 3. Check chapter 1 patterns in href
    for a in soup.find_all("a", href=True):
        href = a["href"].lower()
        if re.search(r"/(?:chuong|chap|chapter)[-_]?0*1(?:[-_/.]|$)", href):
            return urllib.parse.urljoin(main_url, a["href"])
            
    return ""

def extract_chapter_content(html: str, target_words: int = 1000) -> str:
    """
    Extracts the first ~1000 words of chapter content cleanly, preserving paragraphs
    and ending cleanly at sentence boundaries.
    """
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "iframe", "noscript", "aside", "svg", "form"]):
        tag.decompose()
        
    content_elem = soup.find(id="chapter-c") or \
                   soup.find(class_="reading-content") or \
                   soup.find(class_="entry-content") or \
                   soup.find(class_="chapter-content") or \
                   soup.find(id="chapter-content") or \
                   soup.find(id="vung_doc") or \
                   soup.find(class_="box-chap") or \
                   soup.find("article") or \
                   soup.find("main")
                   
    if not content_elem:
        content_elem = soup.find("body")
        if not content_elem:
            return ""

    paragraphs: List[str] = []
    p_tags = content_elem.find_all("p")
    if len(p_tags) >= 2:
        for p in p_tags:
            txt = p.get_text(separator=" ", strip=True)
            txt = clean_paragraph_text(txt)
            if len(txt) > 8:
                paragraphs.append(txt)
    else:
        raw_text = content_elem.get_text(separator="\n", strip=True)
        for line in raw_text.split("\n"):
            line = clean_paragraph_text(line)
            if len(line) > 8:
                paragraphs.append(line)

    selected: List[str] = []
    w_count = 0
    for p in paragraphs:
        # Ignore ads / navigation
        if re.search(r"(chương trước|chương sau|mục lục|bình luận|chia sẻ|theo dõi|đọc tiếp|ủng hộ|bản quyền)", p, re.IGNORECASE):
            continue
        words = p.split()
        selected.append(p)
        w_count += len(words)
        if w_count >= target_words:
            break
            
    full_text = "\n\n".join(selected).strip()
    words = full_text.split()
    
    # If text is significantly longer than target_words, trim to nearest sentence ending around target_words
    if len(words) > target_words + 40:
        trimmed = " ".join(words[:target_words])
        last_punct = -1
        for punct in [".", "!", "?", "”", '"', "…"]:
            pos = trimmed.rfind(punct)
            if pos > last_punct:
                last_punct = pos
        if last_punct > len(trimmed) * 0.75:
            full_text = trimmed[:last_punct + 1]
        else:
            full_text = trimmed + "..."
            
    return full_text

def get_story_description(url: str, auto_clean_ads: bool = True, target_words: int = 1000) -> Dict[str, Any]:
    """
    Fetches ~1000 words from Chapter 1 of the novel.
    If given an overview URL, automatically finds and navigates to Chapter 1.
    """
    url = url.strip()
    if not url:
        return {"success": False, "error": "URL trống", "description": ""}
    
    try:
        html = fetch_url_html(url)
        soup = BeautifulSoup(html, "html.parser")
        
        # Check if URL is already Chapter 1
        if is_chapter_url(url, soup):
            chapter_text = extract_chapter_content(html, target_words=target_words)
            if chapter_text and len(chapter_text.split()) >= 30:
                return {
                    "success": True,
                    "error": None,
                    "description": chapter_text
                }

        # Otherwise, locate Chapter 1 link
        chap1_url = find_chapter_one_url(url, soup)
        if chap1_url:
            chap_html = fetch_url_html(chap1_url)
            chapter_text = extract_chapter_content(chap_html, target_words=target_words)
            if chapter_text and len(chapter_text.split()) >= 30:
                return {
                    "success": True,
                    "error": None,
                    "description": chapter_text
                }
                
        # Fallback: if no Chapter 1 link could be detected, extract reading content from current page
        fallback_text = extract_chapter_content(html, target_words=target_words)
        if fallback_text and len(fallback_text.split()) >= 30:
            return {
                "success": True,
                "error": None,
                "description": fallback_text
            }
            
        return {
            "success": False,
            "error": "Không tìm thấy nội dung Chương 1 (bạn có thể dán link trực tiếp chương 1 hoặc nhập tay)",
            "description": ""
        }
    except Exception as e:
        err_msg = str(e)
        if "timed out" in err_msg.lower() or "timeout" in err_msg.lower():
            err_msg = "Hết thời gian kết nối (Timeout)"
        elif "connection" in err_msg.lower():
            err_msg = "Không thể kết nối tới website"
        elif "http error" in err_msg.lower():
            err_msg = f"Lỗi trang web: {err_msg}"
        return {
            "success": False,
            "error": err_msg,
            "description": ""
        }
