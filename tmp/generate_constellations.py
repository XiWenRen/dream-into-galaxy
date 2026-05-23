import json
import math
import re
import os

def parse_bright_stars(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    array_match = re.search(r"export const BRIGHT_STARS: DetailedStar\[\] = \[(.*?)\];", content, re.DOTALL)
    if not array_match:
        return []
    
    array_content = array_match.group(1)
    star_blocks = re.findall(r"\{([^{}]+)\}", array_content)
    
    stars = []
    for block in star_blocks:
        star = {}
        for field in ["id", "nameKey", "ra", "dec", "mag", "color", "dist", "nameZh", "nameEn", "constellZh", "constellEn"]:
            match = re.search(fr"\b{field}\s*:\s*([^,\n]+)", block)
            if match:
                val = match.group(1).strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                elif field in ["id", "ra", "dec", "mag", "dist"]:
                    val = float(val) if "." in val else int(val)
                elif field == "color":
                    if val.startswith("0x"):
                        val = int(val, 16)
                    else:
                        val = int(val)
                star[field] = val
        if star:
            stars.append(star)
    return stars

def bv_to_rgb(bv):
    t = max(-0.4, min(bv, 2.5))
    if t < -0.25:
        r, g, b = 0.65, 0.78, 1.0
    elif t < 0.0:
        p = (t + 0.25) / 0.25
        r = 0.65 + p * 0.20
        g = 0.78 + p * 0.12
        b = 1.0
    elif t < 0.3:
        p = t / 0.3
        r = 0.85 + p * 0.12
        g = 0.90 + p * 0.03
        b = 1.0 - p * 0.08
    elif t < 0.6:
        p = (t - 0.3) / 0.3
        r = 0.97
        g = 0.93 - p * 0.05
        b = 0.92 - p * 0.25
    elif t < 0.9:
        p = (t - 0.6) / 0.3
        r = 0.97
        g = 0.88 - p * 0.10
        b = 0.67 - p * 0.27
    elif t < 1.4:
        p = (t - 0.9) / 0.5
        r = 0.97
        g = 0.78 - p * 0.28
        b = 0.40 - p * 0.22
    else:
        p = min((t - 1.4) / 0.6, 1.0)
        r = 0.97
        g = 0.50 - p * 0.20
        b = 0.18 - p * 0.10
    return r, g, b

def main():
    # 1. Load Hipparcos
    with open("public/data/hipparcos_65.json", "r", encoding="utf-8") as f:
        hipparcos_raw = json.load(f)
    print(f"Loaded {len(hipparcos_raw)} Hipparcos stars.")
    
    # Precompute Hipparcos unit vectors
    hip_stars = []
    for idx, row in enumerate(hipparcos_raw):
        ra_hrs = row[0]
        dec_deg = row[1]
        mag = row[2]
        bv = row[3] if len(row) > 3 else 0.6
        dist = row[4] if len(row) > 4 else 100.0
        
        ra_rad = ra_hrs * 15.0 * math.pi / 180.0
        dec_rad = dec_deg * math.pi / 180.0
        
        x = math.cos(dec_rad) * math.cos(ra_rad)
        y = math.cos(dec_rad) * math.sin(ra_rad)
        z = math.sin(dec_rad)
        
        hip_stars.append({
            "idx": idx,
            "ra": ra_hrs,
            "dec": dec_deg,
            "mag": mag,
            "bv": bv,
            "dist": dist,
            "vec": (x, y, z)
        })

    # 2. Parse existing bright stars
    existing_stars = parse_bright_stars("src/engine/StarDatabase.ts")
    print(f"Parsed {len(existing_stars)} existing stars from StarDatabase.ts")
    
    # Precompute existing stars unit vectors
    existing_lookup = []
    for s in existing_stars:
        ra_hrs = s["ra"]
        dec_deg = s["dec"]
        ra_rad = ra_hrs * 15.0 * math.pi / 180.0
        dec_rad = dec_deg * math.pi / 180.0
        x = math.cos(dec_rad) * math.cos(ra_rad)
        y = math.cos(dec_rad) * math.sin(ra_rad)
        z = math.sin(dec_rad)
        
        existing_lookup.append({
            "id": s["id"],
            "nameZh": s["nameZh"],
            "nameEn": s["nameEn"],
            "vec": (x, y, z)
        })

    # 3. Load constellations lines and metadata
    with open("tmp/constellations.lines.json", "r", encoding="utf-8") as f:
        lines_data = json.load(f)
    
    with open("tmp/constellations.json", "r", encoding="utf-8") as f:
        const_data = json.load(f)
    
    # Map abbreviation to metadata
    const_meta = {}
    for feat in const_data["features"]:
        abbr = feat["id"]
        props = feat["properties"]
        name_en = props.get("name")
        name_zh = props.get("zh")
        if not name_zh:
            name_zh = name_en
        const_meta[abbr] = {
            "nameEn": name_en,
            "nameZh": name_zh
        }
    
    # Merge the two Serpens features in lines
    # Map abbr -> list of lines (coordinates)
    constell_lines = {}
    for feat in lines_data["features"]:
        abbr = feat["id"]
        coords = feat["geometry"]["coordinates"] # MultiLineString or LineString
        geom_type = feat["geometry"]["type"]
        
        if geom_type == "LineString":
            lines = [coords]
        else:
            lines = coords
            
        if abbr not in constell_lines:
            constell_lines[abbr] = []
        constell_lines[abbr].extend(lines)
        
    print(f"Loaded {len(constell_lines)} unique constellations from lines.")

    # 4. Processing and mapping points to stars
    # We will accumulate extra stars in a list
    extra_stars = []
    next_star_id = len(existing_stars) # Starts from 47
    
    # Track stars by coordinate in a spatial index to avoid duplicates
    # List of all stars (existing + extra) with their unit vectors and IDs
    all_stars = list(existing_lookup) # Starts with existing stars
    
    def find_close_star(px, py, pz, threshold_deg=0.05):
        threshold_rad = threshold_deg * math.pi / 180.0
        # Euclidean distance threshold on unit sphere: 2 * sin(theta/2)
        dist_threshold = 2.0 * math.sin(threshold_rad / 2.0)
        
        best_star = None
        min_dist = dist_threshold
        for s in all_stars:
            sx, sy, sz = s["vec"]
            dist = math.sqrt((px - sx)**2 + (py - sy)**2 + (pz - sz)**2)
            if dist < min_dist:
                min_dist = dist
                best_star = s
        return best_star
        
    def find_closest_hip_star(px, py, pz):
        best_star = None
        min_dist = 9999.0
        for hs in hip_stars:
            hx, hy, hz = hs["vec"]
            dist = math.sqrt((px - hx)**2 + (py - hy)**2 + (pz - hz)**2)
            if dist < min_dist:
                min_dist = dist
                best_star = hs
        return best_star

    # For each constellation:
    # 1. Map all its points to stars (either existing or new)
    # 2. Track which stars belong to which constellation
    constell_star_maps = {} # abbr -> set of star IDs
    constell_lines_mapped = {} # abbr -> list of (star_id_a, star_id_b) pairs
    
    for abbr, lines in constell_lines.items():
        if abbr not in const_meta:
            print(f"Warning: No metadata for constellation {abbr}")
            continue
            
        meta = const_meta[abbr]
        constell_zh = meta["nameZh"]
        constell_en = meta["nameEn"]
        
        constell_star_maps[abbr] = set()
        constell_lines_mapped[abbr] = []
        
        for line in lines:
            line_star_ids = []
            for pt in line:
                ra_deg, dec_deg = pt
                ra_deg = ra_deg % 360.0
                
                ra_rad = ra_deg * math.pi / 180.0
                dec_rad = dec_deg * math.pi / 180.0
                
                px = math.cos(dec_rad) * math.cos(ra_rad)
                py = math.cos(dec_rad) * math.sin(ra_rad)
                pz = math.sin(dec_rad)
                
                # Try to find if we already mapped this star
                matched_star = find_close_star(px, py, pz, threshold_deg=0.08)
                if matched_star:
                    star_id = matched_star["id"]
                else:
                    # Not mapped yet. Find the closest in Hipparcos
                    hs = find_closest_hip_star(px, py, pz)
                    
                    # Double check if this Hipparcos star was already added to all_stars
                    # (since we might match it to another point later)
                    already_added = False
                    for s in all_stars:
                        if s.get("hip_idx") == hs["idx"]:
                            star_id = s["id"]
                            already_added = True
                            break
                            
                    if not already_added:
                        # Add a new extra star!
                        star_id = next_star_id
                        next_star_id += 1
                        
                        r, g, b = bv_to_rgb(hs["bv"])
                        color_hex = (int(r * 255) << 16) + (int(g * 255) << 8) + int(b * 255)
                        
                        new_star = {
                            "id": star_id,
                            "hip_idx": hs["idx"],
                            "nameKey": f"{abbr}_star_{star_id}",
                            "ra": round(hs["ra"], 4),
                            "dec": round(hs["dec"], 4),
                            "mag": round(hs["mag"], 2),
                            "color": color_hex,
                            "dist": round(hs["dist"], 1),
                            "nameZh": f"{constell_zh}恒星",
                            "nameEn": f"{constell_en} Star",
                            "constellZh": constell_zh,
                            "constellEn": constell_en,
                            "vec": hs["vec"]
                        }
                        
                        extra_stars.append(new_star)
                        all_stars.append({
                            "id": star_id,
                            "nameZh": new_star["nameZh"],
                            "nameEn": new_star["nameEn"],
                            "vec": hs["vec"],
                            "hip_idx": hs["idx"]
                        })
                
                line_star_ids.append(star_id)
                constell_star_maps[abbr].add(star_id)
                
            # Create connection pairs
            for i in range(len(line_star_ids) - 1):
                constell_lines_mapped[abbr].append((line_star_ids[i], line_star_ids[i+1]))
                
    print(f"Total extra stars generated: {len(extra_stars)}")
    
    # 5. Name the new stars using Greek letters based on brightness in each constellation
    greek_letters_zh = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"]
    greek_letters_en = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"]
    
    # We will go through each constellation, find all its stars (both existing and extra),
    # sort them by magnitude, and assign Bayer designation name to extra stars that don't have custom names.
    # Note: an extra star might be shared by multiple constellations. If so, its name will be based on its brightest constellation rank.
    
    # Let's map star_id to all its constellations and their ranks
    star_constell_ranks = {} # star_id -> list of (abbr, mag, rank)
    
    for abbr, star_ids in constell_star_maps.items():
        # Get all stars in this constellation
        constell_stars = []
        for sid in star_ids:
            if sid < len(existing_stars):
                # Existing star
                mag = existing_stars[sid]["mag"]
            else:
                # Extra star
                mag = extra_stars[sid - len(existing_stars)]["mag"]
            constell_stars.append((sid, mag))
            
        # Sort by magnitude (brightest first, i.e., lowest mag value first)
        constell_stars.sort(key=lambda x: x[1])
        
        for rank, (sid, mag) in enumerate(constell_stars):
            if sid not in star_constell_ranks:
                star_constell_ranks[sid] = []
            star_constell_ranks[sid].append((abbr, mag, rank))
            
    # Now update extra stars names
    for star in extra_stars:
        sid = star["id"]
        # Find the constellation where this star has the best rank (minimum rank number)
        ranks = star_constell_ranks.get(sid, [])
        if not ranks:
            continue
        # Sort by rank
        ranks.sort(key=lambda x: x[2])
        best_abbr, best_mag, best_rank = ranks[0]
        
        meta = const_meta[best_abbr]
        constell_zh = meta["nameZh"]
        constell_en = meta["nameEn"]
        
        # If the rank is within Greek letters count
        if best_rank < len(greek_letters_zh):
            greek_zh = greek_letters_zh[best_rank]
            greek_en = greek_letters_en[best_rank]
            
            # e.g., 仙女座α
            star["nameZh"] = f"{constell_zh}{greek_zh}"
            star["nameEn"] = f"{constell_en} {greek_en}"
            star["nameKey"] = f"{best_abbr}_{greek_en}"
        else:
            # e.g., 仙女座恒星 25
            star["nameZh"] = f"{constell_zh}恒星 {best_rank + 1}"
            star["nameEn"] = f"{constell_en} Star {best_rank + 1}"
            star["nameKey"] = f"{best_abbr}_Star_{best_rank + 1}"
            
        # Also update the constellation info in the star object to match the best one
        star["constellZh"] = constell_zh
        star["constellEn"] = constell_en

    # 6. Generate the TypeScript output file content
    output_lines = []
    output_lines.append("/**")
    output_lines.append(" * @license")
    output_lines.append(" * SPDX-License-Identifier: Apache-2.0")
    output_lines.append(" *")
    output_lines.append(" * Auto-generated Extra Stars and Constellations Database.")
    output_lines.append(" * Contains stars and connections for all 88 modern constellations.")
    output_lines.append(" */")
    output_lines.append("")
    output_lines.append("import { DetailedStar } from './StarDatabase';")
    output_lines.append("")
    output_lines.append("export const EXTRA_STARS: DetailedStar[] = [")
    
    for s in extra_stars:
        color_str = f"0x{s['color']:06x}"
        output_lines.append("  {")
        output_lines.append(f'    id: {s["id"]},')
        output_lines.append(f'    nameKey: "{s["nameKey"]}",')
        output_lines.append(f'    ra: {s["ra"]},')
        output_lines.append(f'    dec: {s["dec"]},')
        output_lines.append(f'    mag: {s["mag"]},')
        output_lines.append(f'    color: {color_str},')
        output_lines.append(f'    dist: {s["dist"]},')
        output_lines.append(f'    nameZh: "{s["nameZh"]}",')
        output_lines.append(f'    nameEn: "{s["nameEn"]}",')
        output_lines.append(f'    constellZh: "{s["constellZh"]}",')
        output_lines.append(f'    constellEn: "{s["constellEn"]}"')
        output_lines.append("  },")
        
    # Remove trailing comma from last element if list is not empty
    if extra_stars:
        output_lines[-1] = "  }"
        
    output_lines.append("];")
    output_lines.append("")
    
    output_lines.append("export const EXTRA_CONSTELLATIONS: { id: string; nameZh: string; nameEn: string; seq: [number, number][] }[] = [")
    
    # Sort constellations by ID to be neat
    sorted_abbrs = sorted(constell_lines_mapped.keys())
    for abbr in sorted_abbrs:
        meta = const_meta[abbr]
        lines = constell_lines_mapped[abbr]
        if not lines:
            continue
            
        # Convert lines to string
        seq_str = ", ".join([f"[{a}, {b}]" for a, b in lines])
        output_lines.append("  {")
        output_lines.append(f'    id: "{abbr.lower()}",')
        output_lines.append(f'    nameZh: "{meta["nameZh"]}",')
        output_lines.append(f'    nameEn: "{meta["nameEn"]}",')
        output_lines.append(f'    seq: [ {seq_str} ]')
        output_lines.append("  },")
        
    if sorted_abbrs:
        output_lines[-1] = "  }"
        
    output_lines.append("];")
    
    # Write to file
    os.makedirs("src/engine", exist_ok=True)
    with open("src/engine/ExtraStarsDatabase.ts", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines) + "\n")
        
    print("Successfully wrote src/engine/ExtraStarsDatabase.ts")

if __name__ == "__main__":
    main()
