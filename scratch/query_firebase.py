import urllib.request
import urllib.parse
import json

API_KEY = "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk"
DB_BASE = "https://alarma-pro-a903d-default-rtdb.firebaseio.com"

def get_id_token(email, password):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    data = json.dumps({
        "email": email,
        "password": password,
        "returnSecureToken": True
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read().decode('utf-8'))
        return result['idToken']
    except Exception as e:
        print(f"Auth error for {email}:", e)
        return None

def get_data(id_token, path):
    url = f"{DB_BASE}{path}.json?auth={id_token}"
    req = urllib.request.Request(url)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching path {path}:", e)
        return None

def main():
    credentials = [
        ('admin@alarmalg.com', '110500'),
        ('admin_pro@alarmalg.com', '110500'),
        ('admin@alarma.com', '1105'),
    ]
    token = None
    for email, pw in credentials:
        token = get_id_token(email, pw)
        if token:
            print(f"Authenticated successfully as {email}!")
            break

    if not token:
        print("Failed to authenticate with any credentials.")
        return

    # Check root keys
    root_data = get_data(token, "")
    if root_data:
        print("Root keys:", list(root_data.keys()))
        found = []
        def search_dict(d, current_path=""):
            if isinstance(d, dict):
                for k, v in d.items():
                    search_dict(v, f"{current_path}/{k}")
            elif isinstance(d, list):
                for idx, item in enumerate(d):
                    search_dict(item, f"{current_path}/{idx}")
            elif isinstance(d, str):
                if "sanitas" in d.lower() or "sura" in d.lower():
                    found.append((current_path, d))
        search_dict(root_data)
        print("Found items related to Sanitas or Sura:")
        for path, val in found:
            print(f"  {path}: {val}")

if __name__ == "__main__":
    main()
