
import json

def check_orphans(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    central_ids = {c['id'] for c in data['centrales']}
    device_central_ids = {d['centralId'] for d in data['devices']}
    
    print(f"Centrals in {filename}: {len(central_ids)}")
    print(f"Central IDs used in devices: {len(device_central_ids)}")
    
    orphans = device_central_ids - central_ids
    if orphans:
        print(f"Found {len(orphans)} Central IDs used in devices but not defined in centrales:")
        for o in orphans:
            count = len([d for d in data['devices'] if d['centralId'] == o])
            print(f"  - {o} ({count} devices)")
    else:
        print("No orphan device central IDs found.")

    # Also check if any central has 0 devices
    for c in data['centrales']:
        count = len([d for d in data['devices'] if d['centralId'] == c['id']])
        if count == 0:
            print(f"Central {c['name']} (ID: {c['id']}) has 0 devices.")

if __name__ == "__main__":
    check_orphans('data.json')
