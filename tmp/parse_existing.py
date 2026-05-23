import re
import json

def parse_bright_stars(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find the BRIGHT_STARS array content
    array_match = re.search(r"export const BRIGHT_STARS: DetailedStar\[\] = \[(.*?)\];", content, re.DOTALL)
    if not array_match:
        print("Could not find BRIGHT_STARS array in file.")
        return []
    
    array_content = array_match.group(1)
    
    # Parse individual star blocks
    # Blocks look like: { id: ..., ra: ..., dec: ... }
    star_blocks = re.findall(r"\{([^{}]+)\}", array_content)
    
    stars = []
    for block in star_blocks:
        star = {}
        # Extract fields
        for field in ["id", "nameKey", "ra", "dec", "mag", "color", "dist", "nameZh", "nameEn", "constellZh", "constellEn"]:
            # Match field: value (handle string quotes and hex numbers)
            match = re.search(fr"\b{field}\s*:\s*([^,\n]+)", block)
            if match:
                val = match.group(1).strip()
                # Remove quotes if string
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                # Convert to float/int if numeric
                elif field in ["id", "ra", "dec", "mag", "dist"]:
                    val = float(val) if "." in val else int(val)
                elif field == "color":
                    # Handle hex numbers like 0xfff9e6
                    if val.startswith("0x"):
                        val = int(val, 16)
                    else:
                        val = int(val)
                star[field] = val
        if star:
            stars.append(star)
            
    return stars

existing_stars = parse_bright_stars("src/engine/StarDatabase.ts")
print(f"Parsed {len(existing_stars)} stars from StarDatabase.ts")
print("First star:")
print(existing_stars[0])
print("Last star:")
print(existing_stars[-1])
