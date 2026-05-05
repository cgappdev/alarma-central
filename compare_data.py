
import json

def compare_data():
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    with open('data_backup.json', 'r', encoding='utf-8') as f:
        backup = json.load(f)
    
    print(f"Data - Centrales: {len(data['centrales'])}")
    print(f"Backup - Centrales: {len(backup['centrales'])}")
    
    print(f"Data - Devices: {len(data['devices'])}")
    print(f"Backup - Devices: {len(backup['devices'])}")
    
    print(f"Data - Cameras: {len(data.get('cameras', []))}")
    print(f"Backup - Cameras: {len(backup.get('cameras', []))}")
    
    # Check specific centrales
    h_quirurgicos_id = '1774831229527'
    uci_abc_id = '1774220918042'
    
    h_quirurgicos_data = [d for d in data['devices'] if d.get('centralId') == h_quirurgicos_id]
    h_quirurgicos_backup = [d for d in backup['devices'] if d.get('centralId') == h_quirurgicos_id]
    
    uci_abc_data = [d for d in data['devices'] if d.get('centralId') == uci_abc_id]
    uci_abc_backup = [d for d in backup['devices'] if d.get('centralId') == uci_abc_id]
    
    print(f"HQuirurgicosOrtopedia - Data Devices: {len(h_quirurgicos_data)}")
    print(f"HQuirurgicosOrtopedia - Backup Devices: {len(h_quirurgicos_backup)}")
    
    print(f"Uci A-B-C Piso 2 - Data Devices: {len(uci_abc_data)}")
    print(f"Uci A-B-C Piso 2 - Backup Devices: {len(uci_abc_backup)}")

if __name__ == "__main__":
    compare_data()
