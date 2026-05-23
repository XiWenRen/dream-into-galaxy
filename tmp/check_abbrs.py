import json

with open("tmp/constellations.lines.json", "r", encoding="utf-8") as f:
    lines_data = json.load(f)

lines_ids = [feat["id"] for feat in lines_data["features"]]
print(f"Number of constellations in lines: {len(lines_ids)}")
print("First 10 IDs in lines:", lines_ids[:10])

with open("tmp/constellations.json", "r", encoding="utf-8") as f:
    const_data = json.load(f)

const_ids = [feat["id"] for feat in const_data["features"]]
print(f"Number of constellations in metadata: {len(const_ids)}")
print("First 10 IDs in metadata:", const_ids[:10])

# Find differences
diff_lines_const = set(lines_ids) - set(const_ids)
diff_const_lines = set(const_ids) - set(lines_ids)
print("IDs in lines but not metadata:", diff_lines_const)
print("IDs in metadata but not lines:", diff_const_lines)
