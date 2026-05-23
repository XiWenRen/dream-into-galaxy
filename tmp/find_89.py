import json

with open("tmp/constellations.json", "r", encoding="utf-8") as f:
    const_data = json.load(f)

const_ids = sorted([feat["id"] for feat in const_data["features"]])
print(const_ids)
