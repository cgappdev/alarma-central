import os

path = r"c:\Users\Soportelg\.gemini\antigravity\scratch\terapias\app.js"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "db.transaction" in line or "objectStore" in line:
        # print around
        if "pacientes" in line or "citas" in line:
            print(f"L{idx}: {line.strip()}")
            start = max(0, idx - 5)
            end = min(len(lines), idx + 15)
            for i in range(start, end):
                print(f"  {i+1}: {lines[i].rstrip()}")
            print("-" * 50)
