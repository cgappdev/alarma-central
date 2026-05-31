import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

dir_path = r"c:\Users\Soportelg\.gemini\antigravity\scratch"
query = "No se encontraron citas"

for root, dirs, files in os.walk(dir_path):
    # Skip .git directories
    if '.git' in dirs:
        dirs.remove('.git')
    for file in files:
        if file.endswith(('.js', '.html')):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for idx, line in enumerate(f, 1):
                        if query.lower() in line.lower():
                            print(f"{file_path} L{idx}: {line.strip()}")
            except Exception as e:
                pass
