import urllib.request
import urllib.parse
import json
import sys

API_KEY = "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk"
DB_URL = "https://alarma-pro-a903d-default-rtdb.firebaseio.com/alarmState.json"

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
        print("Auth error:", e)
        return None

def push_data(id_token, data):
    url = f"{DB_URL}?auth={id_token}"
    data_bytes = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers={'Content-Type': 'application/json'}, method='PUT')
    try:
        resp = urllib.request.urlopen(req)
        print("Data pushed successfully")
    except Exception as e:
        print("Push error:", e)

if __name__ == "__main__":
    token = get_id_token('admin@alarma.com', '1105') # The admin username might not be an email! 
    print("Token:", token[:10] if token else "None")
