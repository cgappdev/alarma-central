
import json
import re

def raw_search(filename, terms):
    print(f"--- Searching in {filename} ---")
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

    for term in terms:
        matches = [m.start() for m in re.finditer(re.escape(term), content, re.IGNORECASE)]
        print(f"Term '{term}': {len(matches)} matches")
        if matches:
            # Show snippets of first 3 matches
            for i in range(min(3, len(matches))):
                idx = matches[i]
                start = max(0, idx - 100)
                end = min(len(content), idx + 200)
                print(f"  Snippet {i+1}: {content[start:end]}")

if __name__ == "__main__":
    files = ['data.json', 'data_backup.json', 'initial-data.js', 'old_initial.js', 'before_my_script.js']
    terms = ['Piso 2', 'piso\": \"2\"', 'piso: \"2\"']
    for f in files:
        raw_search(f, terms)
