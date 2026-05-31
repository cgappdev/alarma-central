import json
data = json.load(open(r'C:\Users\Soportelg\Downloads\respaldo_alarmas_2026-05-21 (1).json', encoding='utf-8'))
devices = data.get('devices', [])
counts = {}
for d in devices:
    counts[d['centralId']] = counts.get(d['centralId'], 0) + 1
for c in data.get('centrales', []):
    print(f"{c['name']}: {counts.get(c['id'], 0)}")
