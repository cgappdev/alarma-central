import os

def replace_in_file(filename, old_str, new_str):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old_str, new_str)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('version.json', '4.6.30', '4.6.31')
replace_in_file('index.html', '4.6.30', '4.6.31')
replace_in_file('app.js', '4.6.30', '4.6.31')
replace_in_file('sw.js', '4.6.30', '4.6.31')
print("Version updated to 4.6.31")
