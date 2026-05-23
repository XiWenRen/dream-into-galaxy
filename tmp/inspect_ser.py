import json

with open("tmp/constellations.json", "r", encoding="utf-8") as f:
    const_data = json.load(f)

ser_meta = [feat for feat in const_data["features"] if feat["id"] == "Ser"]
print(f"Number of Ser features in metadata: {len(ser_meta)}")
for idx, feat in enumerate(ser_meta):
    print(f"\nMetadata {idx}:")
    print(feat.get("properties", {}).get("name"), feat.get("properties", {}).get("zh"))

with open("tmp/constellations.lines.json", "r", encoding="utf-8") as f:
    lines_data = json.load(f)

ser_lines = [feat for feat in lines_data["features"] if feat["id"] == "Ser"]
print(f"Number of Ser features in lines: {len(ser_lines)}")
for idx, feat in enumerate(ser_lines):
    print(f"\nLine {idx}:")
    print(len(feat.get("geometry", {}).get("coordinates", [])))
