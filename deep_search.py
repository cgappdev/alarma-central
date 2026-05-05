
import json

def find_data(filename, search_term):
    print(f"Searching for '{search_term}' in {filename}...")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        # Try different encoding or if it's a JS file
        try:
            with open(filename, 'r', encoding='utf-16') as f:
                content = f.read()
                # If it's a JS file like 'const initialData = { ... };'
                if ' = ' in content:
                    json_str = content.split(' = ', 1)[1].rsplit(';', 1)[0]
                    data = json.loads(json_str)
                else:
                    data = json.loads(content)
        except Exception as e2:
             print(f"Error loading {filename}: {e2}")
             return

    # Search in centrales
    for c in data.get('centrales', []):
        if search_term.lower() in str(c).lower():
            print(f"Found in central: {c.get('name')} (ID: {c.get('id')})")
            
    # Search in devices
    found_devices = []
    for d in data.get('devices', []):
        if search_term.lower() in str(d).lower():
            found_devices.append(d)
    
    if found_devices:
        print(f"Found {len(found_devices)} devices.")
        for d in found_devices[:5]:
            print(f"  Device: {d.get('location')} (CentralID: {d.get('centralId')})")
    else:
        print("No devices found.")

if __name__ == "__main__":
    import sys
    files = ['data.json', 'data_backup.json', 'initial-data.js', 'old_initial.js', 'before_my_script.js']
    terms = ['Quirurgicos', 'Ortopedia', 'Uci', 'Piso 2']
    
    for filename in files:
        for term in terms:
            find_data(filename, term)
            print("-" * 20)
