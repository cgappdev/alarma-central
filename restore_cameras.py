
import json

def restore_cameras():
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        with open('data_backup.json', 'r', encoding='utf-8') as f:
            backup = json.load(f)
    except Exception as e:
        print(f"Error loading files: {e}")
        return

    cameras = backup.get('cameras', [])
    if not cameras:
        print("No cameras found in backup.")
        return

    print(f"Found {len(cameras)} cameras in backup. Restoring...")
    data['cameras'] = cameras

    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Also update initial-data.js
    with open('initial-data.js', 'w', encoding='utf-8') as f:
        f.write("const initialData = ")
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(";")

    print("Restoration complete.")

if __name__ == "__main__":
    restore_cameras()
