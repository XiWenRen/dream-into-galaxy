import json
import os

log_path = r"C:\Users\dom_zhou\AppData\Roaming\..\.gemini\antigravity\brain\f4dfbef9-cba0-4b5d-8f68-6cff9aa43e15\.system_generated\logs\transcript.jsonl"
# Resolve AppData expansion or use the absolute path
if not os.path.exists(log_path):
    log_path = r"C:\Users\dom_zhou\.gemini\antigravity\brain\f4dfbef9-cba0-4b5d-8f68-6cff9aa43e15\.system_generated\logs\transcript.jsonl"

print("Reading from:", log_path)
with open(log_path, encoding='utf-8') as f:
    for line in f:
        x = json.loads(line)
        if x.get('tool_calls'):
            for tc in x['tool_calls']:
                if tc.get('name') == 'write_to_file':
                    args = tc.get('args', {})
                    tf = args.get('TargetFile', '').strip('"')
                    if 'implementation_plan' in tf:
                        cc = args.get('CodeContent', '')
                        if cc.startswith('"') and cc.endswith('"'):
                            try:
                                cc = json.loads(cc)
                            except Exception:
                                pass
                        print(f"=== STEP {x['step_index']} ===")
                        print(cc)
                        print("======================")
