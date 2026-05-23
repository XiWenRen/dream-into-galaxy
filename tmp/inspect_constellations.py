import json

with open("tmp/constellations.lines.json", "r", encoding="utf-8") as f:
    lines_data = json.load(f)

print("constellations.lines.json keys/type:")
print(type(lines_data))
if isinstance(lines_data, dict):
    print("Keys:", list(lines_data.keys()))
    if "features" in lines_data:
        print("Number of features:", len(lines_data["features"]))
        print("First feature example:")
        print(json.dumps(lines_data["features"][0], indent=2, ensure_ascii=False))
elif isinstance(lines_data, list):
    print("Length:", len(lines_data))
    print("First item:")
    print(json.dumps(lines_data[0], indent=2, ensure_ascii=False))

with open("tmp/constellations.json", "r", encoding="utf-8") as f:
    const_data = json.load(f)

print("\nconstellations.json keys/type:")
print(type(const_data))
if isinstance(const_data, dict):
    print("Keys:", list(const_data.keys()))
    if "features" in const_data:
        print("Number of features:", len(const_data["features"]))
        print("First feature example:")
        print(json.dumps(const_data["features"][0], indent=2, ensure_ascii=False))
elif isinstance(const_data, list):
    print("Length:", len(const_data))
    print("First item:")
    print(json.dumps(const_data[0], indent=2, ensure_ascii=False))
