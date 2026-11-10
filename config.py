import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

TEMPLATE_FILE = DATA_DIR / "template.txt"
SETTINGS_FILE = DATA_DIR / "settings.json"

DEFAULT_TEMPLATE = """You are an expert at converting written stories into a single photorealistic image.
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
Story:"""

DEFAULT_SETTINGS = {
    "header_format": "{code} + \n",  # How code is joined with template
    "story_format": "\n{story}",    # How story description is joined after 'Story:'
    "auto_clean_ads": True,
    "max_desc_length": 3000
}

def get_template() -> str:
    if not TEMPLATE_FILE.exists():
        TEMPLATE_FILE.write_text(DEFAULT_TEMPLATE.strip(), encoding="utf-8")
        return DEFAULT_TEMPLATE.strip()
    return TEMPLATE_FILE.read_text(encoding="utf-8").strip()

def save_template(template_str: str) -> None:
    TEMPLATE_FILE.write_text(template_str.strip(), encoding="utf-8")

def reset_template() -> str:
    TEMPLATE_FILE.write_text(DEFAULT_TEMPLATE.strip(), encoding="utf-8")
    return DEFAULT_TEMPLATE.strip()

def get_settings() -> dict:
    if not SETTINGS_FILE.exists():
        SETTINGS_FILE.write_text(json.dumps(DEFAULT_SETTINGS, indent=2, ensure_ascii=False), encoding="utf-8")
        return DEFAULT_SETTINGS.copy()
    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        settings = DEFAULT_SETTINGS.copy()
        settings.update(data)
        return settings
    except Exception:
        return DEFAULT_SETTINGS.copy()

def save_settings(settings: dict) -> None:
    current = get_settings()
    current.update(settings)
    SETTINGS_FILE.write_text(json.dumps(current, indent=2, ensure_ascii=False), encoding="utf-8")

