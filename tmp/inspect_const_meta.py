import json

with open("tmp/constellations.json", "r", encoding="utf-8") as f:
    const_data = json.load(f)

print("constellations.json type:", type(const_data))
features = const_data.get("features", [])
print("Number of features:", len(features))

# Print first 5 features with ASCII-only representation of keys
for i in range(min(5, len(features))):
    feat = features[i]
    print(f"\nFeature {i}:")
    print("  ID:", feat.get("id"))
    props = feat.get("properties", {})
    print("  Properties keys:", list(props.keys()))
    # Safely print properties
    for k, v in props.items():
        try:
            print(f"    {k}: {v}")
        except Exception:
            print(f"    {k}: {repr(v)}")
