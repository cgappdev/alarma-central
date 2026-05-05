
import json

def check_populated(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    central_names = {c['id']: c['name'] for c in data['centrales']}
    
    counts = {}
    for d in data.get('devices', []):
        cid = d['centralId']
        counts[cid] = counts.get(cid, 0) + 1
    
    print(f"Populated Centrales in {filename}:")
    for cid, count in counts.items():
        name = central_names.get(cid, f"Unknown ID: {cid}")
        print(f"  - {name} (ID: {cid}): {count} devices")
    
    camera_counts = {}
    for cam in data.get('cameras', []):
        cid = cam['centralId']
        camera_counts[cid] = camera_counts.get(cid, 0) + 1
    
    if camera_counts:
        print(f"Populated Cameras in {filename}:")
        for cid, count in camera_counts.items():
            name = central_names.get(cid, f"Unknown ID: {cid}")
            print(f"  - {name} (ID: {cid}): {count} cameras")

if __name__ == "__main__":
    import sys
    filename = sys.argv[1] if len(sys.argv) > 1 else 'data.json'
    check_populated(filename)
