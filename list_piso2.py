
import json

def get_piso_2_devices(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    piso_2_devices = [d for d in data.get('devices', []) if d.get('piso') == '2' or 'Piso 2' in d.get('location', '')]
    
    print(f"Devices on Piso 2 in {filename}: {len(piso_2_devices)}")
    for d in piso_2_devices:
        cid = d['centralId']
        cname = next((c['name'] for c in data['centrales'] if c['id'] == cid), "Unknown")
        print(f"  - {d.get('location')} (ID: {d.get('id')}, Current Central: {cname})")

if __name__ == "__main__":
    get_piso_2_devices('data.json')
