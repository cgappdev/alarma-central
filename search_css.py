import os

path = r"c:\Users\Soportelg\.gemini\antigravity\scratch\terapias\style.css"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if "overflow" in line or "scroll" in line or "::-webkit-scrollbar" in line:
        print(f"L{idx}: {line.strip()}")
