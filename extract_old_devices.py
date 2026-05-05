
import json
import re

def extract_devices(filename):
    print(f"--- Extracting devices from {filename} ---")
    content = ""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        try:
            with open(filename, 'r', encoding='utf-16') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            return

    # Split into potential device blocks
    # Each device block starts with { and contains "id" and "centralId"
    # I'll find all "id": "..." matches and then look around them
    id_matches = list(re.finditer(r'"id":\s*"(\d+)"', content))
    print(f"Found {len(id_matches)} ID matches.")
    
    devices = []
    for i, m in enumerate(id_matches):
        # Get a chunk of text around the ID
        start = m.start()
        # Find the next ID match to define the end of this block
        end = id_matches[i+1].start() if i+1 < len(id_matches) else len(content)
        chunk = content[start:end]
        
        # Extract fields from chunk
        device_id = m.group(1)
        
        # Only interested in chunks that look like devices (have centralId)
        cid_match = re.search(r'"centralId":\s*"(\d+)"', chunk)
        if cid_match:
            central_id = cid_match.group(1)
            loc_match = re.search(r'"location":\s*"([^"]+)"', chunk)
            location = loc_match.group(1) if loc_match else "Unknown"
            
            devices.append({
                "id": device_id,
                "centralId": central_id,
                "location": location
            })

    print(f"Extracted {len(devices)} potential devices.")
    return devices

if __name__ == "__main__":
    import sys
    # Use utf-8 for stdout to avoid encoding errors
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    old_devices = extract_devices('old_initial.js')
    if old_devices:
        by_central = {}
        for d in old_devices:
            cid = d['centralId']
            if cid not in by_central: by_central[cid] = []
            by_central[cid].append(d)
        
        for cid, devices in by_central.items():
            print(f"CentralID {cid}: {len(devices)} devices")
            for d in devices[:5]:
                print(f"  - {d['location']} (ID: {d['id']})")
            if len(devices) > 5:
                print(f"    ... and {len(devices)-5} more")
