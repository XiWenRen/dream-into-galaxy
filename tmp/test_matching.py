import json
import math

# Load Hipparcos
with open("public/data/hipparcos_65.json", "r", encoding="utf-8") as f:
    hipparcos_raw = json.load(f)

print(f"Loaded {len(hipparcos_raw)} Hipparcos stars.")

# Precompute Hipparcos unit vectors
# Format: [ra, dec, mag, bv, dist] where ra is hours, dec is degrees
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

# Load constellation lines
with open("tmp/constellations.lines.json", "r", encoding="utf-8") as f:
    lines_data = json.load(f)

# Find Andromeda
and_feature = None
for feat in lines_data["features"]:
    if feat["id"] == "And":
        and_feature = feat
        break

if and_feature:
    print("Found Andromeda!")
    coords = and_feature["geometry"]["coordinates"]
    # coords is a MultiLineString (list of lists of [ra_deg, dec_deg])
    for line_idx, line in enumerate(coords):
        print(f"Line {line_idx} (length {len(line)}):")
        for pt in line[:3]: # print first 3 points
            ra_deg, dec_deg = pt
            ra_deg = ra_deg % 360.0
            
            ra_rad = ra_deg * math.pi / 180.0
            dec_rad = dec_deg * math.pi / 180.0
            
            px = math.cos(dec_rad) * math.cos(ra_rad)
            py = math.cos(dec_rad) * math.sin(ra_rad)
            pz = math.sin(dec_rad)
            
            # Find closest hip star
            best_star = None
            min_dist = 99999.0
            for hs in hip_stars:
                hx, hy, hz = hs["vec"]
                dist_val = math.sqrt((px - hx)**2 + (py - hy)**2 + (pz - hz)**2)
                if dist_val < min_dist:
                    min_dist = dist_val
                    best_star = hs
            
            # Angular separation in degrees
            angle_deg = 2.0 * math.asin(min_dist / 2.0) * 180.0 / math.pi
            print(f"  Point: RA={ra_deg/15.0:.4f}h, Dec={dec_deg:.4f}° -> Closest Star: RA={best_star['ra']:.4f}h, Dec={best_star['dec']:.4f}°, Mag={best_star['mag']:.2f}, Dist={best_star['dist']:.1f}ly, Separation={angle_deg:.4f}°")
else:
    print("Andromeda feature not found!")
