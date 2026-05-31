import urllib.request
import json

API_KEY = 'AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk'
url = f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}'
data = json.dumps({'email': 'admin@alarmalg.com', 'password': '110500', 'returnSecureToken': True}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    resp = urllib.request.urlopen(req)
    print("Success creating admin:", resp.read().decode('utf-8'))
except Exception as e:
    print("Error:", e.read().decode('utf-8'))

# Also create user hilda
data2 = json.dumps({'email': 'hilda@alarmalg.com', 'password': '110600', 'returnSecureToken': True}).encode('utf-8')
req2 = urllib.request.Request(url, data=data2, headers={'Content-Type': 'application/json'})
try:
    resp2 = urllib.request.urlopen(req2)
    print("Success creating hilda:", resp2.read().decode('utf-8'))
except Exception as e:
    print("Error creating hilda:", getattr(e, 'read', lambda: str(e))().decode('utf-8') if hasattr(e, 'read') else e)
