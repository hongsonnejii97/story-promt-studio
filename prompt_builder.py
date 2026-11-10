def build_final_prompt(code: str, story_desc: str, template: str, header_format: str = "{code}\n\n", story_format: str = "\n{story}") -> str:
    """
    Builds the final prompt combining Story Code, Template, and Story Description.
    Supports placeholders {code} / {ma_truyen} and {story} / {mo_ta}.
    If placeholders are not present in template, intelligently prepends code and appends story description.
    """
    code = (code or "").strip()
    story_desc = (story_desc or "").strip()
    template = (template or "").strip()
    
    has_code_placeholder = "{code}" in template or "{ma_truyen}" in template
    has_story_placeholder = "{story}" in template or "{mo_ta}" in template

    result = template

    # Handle Story Code
    if has_code_placeholder:
        result = result.replace("{code}", code).replace("{ma_truyen}", code)
    else:
        # Prepend code if provided
        if code:
            if header_format:
                prefix = header_format.replace("{code}", code).replace("{ma_truyen}", code)
                result = prefix + result
            else:
                result = f"{code}\n\n" + result

    # Handle Story Description
    if has_story_placeholder:
        result = result.replace("{story}", story_desc).replace("{mo_ta}", story_desc)
    else:
        if story_desc:
            # Check if template ends with "Story:"
            if result.rstrip().endswith("Story:"):
                # Append directly
                if story_format:
                    suffix = story_format.replace("{story}", story_desc).replace("{mo_ta}", story_desc)
                    result = result + suffix
                else:
                    result = result + "\n" + story_desc
            else:
                if "\nStory:" in result or result.startswith("Story:"):
                    # Already has Story: inside, append at end
                    result = result + "\n" + story_desc
                else:
                    result = result + "\n\nStory:\n" + story_desc

    return result.strip()

