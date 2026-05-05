
import json
import re

def extract_devices(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        with open(filename, 'r', encoding='utf-16') as f:
            content = f.read()
    
    id_matches = list(re.finditer(r'"id":\s*"(\d+)"', content))
    devices = {}
    for i, m in enumerate(id_matches):
        start = m.start()
        end = id_matches[i+1].start() if i+1 < len(id_matches) else len(content)
        chunk = content[start:end]
        device_id = m.group(1)
        cid_match = re.search(r'"centralId":\s*"(\d+)"', chunk)
        if cid_match:
            devices[device_id] = cid_match.group(1)
    return devices

if __name__ == "__main__":
    old = extract_devices('old_initial.js')
    current = extract_devices('data.json')
    
    print(f"Old devices: {len(old)}")
    print(f"Current devices: {len(current)}")
    
    changed = []
    for did, cid in current.items():
        if did in old and old[did] != cid:
            changed.append((did, old[did], cid))
    
    print(f"Devices that changed central: {len(changed)}")
    for did, old_cid, new_cid in changed:
        print(f"  Device {did}: {old_cid} -> {new_cid}")
