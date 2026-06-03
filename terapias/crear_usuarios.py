import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')

API_KEY = "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk"

usuarios = [
    {"nombre": "Administrador", "email": "admin@terapias.com",    "password": "tera2026"},
    {"nombre": "Liliana",        "email": "liliana@terapias.com",  "password": "tera2026"},
    {"nombre": "Sandra",         "email": "sandra@terapias.com",   "password": "terapias2026"},
]

print("=" * 55)
print("  Creando usuarios en Firebase Authentication")
print("=" * 55)

for u in usuarios:
    signup_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    resp = requests.post(signup_url, json={
        "email":             u["email"],
        "password":          u["password"],
        "returnSecureToken": True
    })
    data = resp.json()

    if "error" in data:
        code = data["error"]["message"]
        if code == "EMAIL_EXISTS":
            print(f"[!] {u['email']} ya existe en Firebase.")
        elif code == "OPERATION_NOT_ALLOWED":
            print("[-] DEBES habilitar Email/Password en Firebase Console > Authentication > Sign-in method")
            break
        elif "WEAK_PASSWORD" in code:
            print(f"[-] Contrasena muy corta para {u['email']}")
        else:
            print(f"[-] Error en {u['email']}: {code}")
        continue

    id_token = data.get("idToken")

    update_url = f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={API_KEY}"
    resp2 = requests.post(update_url, json={
        "idToken":           id_token,
        "displayName":       u["nombre"],
        "returnSecureToken": False
    })
    data2 = resp2.json()

    if "error" in data2:
        print(f"[~] {u['email']} creado pero sin nombre: {data2['error']['message']}")
    else:
        print(f"[OK] {u['nombre']:15s} | {u['email']:30s} | creado OK")

print("=" * 55)
print("Verifica en: Firebase Console > Authentication > Users")
