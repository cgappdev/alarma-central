import urllib.request
import json

API_KEY = 'AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk'
url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}'
data = json.dumps({'email': 'admin@alarmalg.com', 'password': '1105', 'returnSecureToken': True}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    urllib.request.urlopen(req)
    print("Success")
except Exception as e:
    print(e.read().decode('utf-8'))
