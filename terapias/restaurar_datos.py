"""
Restaura el respaldo de terapias a Firebase Firestore.
Se autentica via Firebase Auth REST API y sube todos los datos.
"""
import json
import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')

# ─── Configuracion ───────────────────────────────────────────
API_KEY     = "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk"
PROJECT_ID  = "alarma-pro-a903d"
BACKUP_FILE = r"C:\Users\Soportelg\Downloads\RespaldoTerapias\respaldo_terapias_2026-06-02 (1).json"
ADMIN_EMAIL = "admin@terapias.com"
ADMIN_PASS  = "tera2026"

FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

# ─── 1. Autenticacion ────────────────────────────────────────
print("=" * 60)
print("  Restaurando datos en Firestore")
print("=" * 60)

resp = requests.post(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    json={"email": ADMIN_EMAIL, "password": ADMIN_PASS, "returnSecureToken": True}
)
auth_data = resp.json()
if "error" in auth_data:
    print(f"[ERROR] Autenticacion fallida: {auth_data['error']['message']}")
    sys.exit(1)

ID_TOKEN = auth_data["idToken"]
HEADERS  = {"Authorization": f"Bearer {ID_TOKEN}", "Content-Type": "application/json"}
print(f"[OK] Autenticado como {ADMIN_EMAIL}")

# ─── 2. Leer respaldo ─────────────────────────────────────────
with open(BACKUP_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

pacientes     = data.get("pacientes",     [])
terapeutas    = data.get("terapeutas",    [])
citas         = data.get("citas",         [])
autorizaciones= data.get("autorizaciones",[])

print(f"\nDatos en el respaldo:")
print(f"  Pacientes:     {len(pacientes)}")
print(f"  Terapeutas:    {len(terapeutas)}")
print(f"  Citas:         {len(citas)}")
print(f"  Autorizaciones:{len(autorizaciones)}")

# ─── 3. Funciones auxiliares ──────────────────────────────────

def to_firestore_value(value):
    """Convierte un valor Python al formato de valor de Firestore."""
    if value is None:
        return {"nullValue": None}
    elif isinstance(value, bool):
        return {"booleanValue": value}
    elif isinstance(value, int):
        return {"integerValue": str(value)}
    elif isinstance(value, float):
        return {"doubleValue": value}
    elif isinstance(value, str):
        return {"stringValue": value}
    elif isinstance(value, dict):
        return {"mapValue": {"fields": {k: to_firestore_value(v) for k, v in value.items()}}}
    elif isinstance(value, list):
        return {"arrayValue": {"values": [to_firestore_value(i) for i in value]}}
    else:
        return {"stringValue": str(value)}

def to_firestore_doc(obj):
    """Convierte un diccionario completo al formato de documento Firestore."""
    return {"fields": {k: to_firestore_value(v) for k, v in obj.items()}}

def upload_document(collection, doc_id, obj):
    """Sube un documento a Firestore con un ID especifico."""
    url = f"{FIRESTORE_BASE}/{collection}/{doc_id}"
    # Usamos PATCH para crear/reemplazar con ID especifico
    doc = to_firestore_doc(obj)
    r = requests.patch(url, headers=HEADERS, json=doc)
    return r.status_code in (200, 201)

# ─── 4. Subir Pacientes ───────────────────────────────────────
print("\n[1/4] Subiendo pacientes...")
ok_p = 0
for p in pacientes:
    doc_id = str(p["id"])
    nombre_completo = f"{p.get('nombres','')} {p.get('apellidos','')}".strip()
    # Enriquecemos con campos que espera la app actual
    p["name"]              = nombre_completo
    p["phone"]             = p.get("telefono", "")
    p["email"]             = p.get("contacto", "")
    p["dob"]               = p.get("fechaNacimiento", "")
    p["gender"]            = p.get("genero", "")
    p["authorizedSessions"]= 23  # valor por defecto
    p["diagnosis"]         = f"EPS: {p.get('epsNombre','')} | Doc: {p.get('tipoDocumento','')}-{p.get('numeroDocumento','')}"
    if upload_document("therapy_patients", doc_id, p):
        print(f"  [OK] {nombre_completo}")
        ok_p += 1
    else:
        print(f"  [!!] Error en paciente {doc_id}")

# ─── 5. Subir Terapeutas ──────────────────────────────────────
print(f"\n[2/4] Subiendo terapeutas...")
ok_t = 0
for t in terapeutas:
    doc_id = str(t["id"])
    if upload_document("therapy_terapeutas", doc_id, t):
        print(f"  [OK] {t.get('nombres','')} {t.get('apellidos','')}")
        ok_t += 1

# ─── 6. Subir Citas/Sesiones ──────────────────────────────────
print(f"\n[3/4] Subiendo citas/sesiones...")
ok_c = 0
for c in citas:
    doc_id = str(c["id"])
    # Enriquecemos con campos que espera la app actual
    c["patientId"]    = str(c.get("pacienteId", ""))
    c["date"]         = c.get("fecha", "")
    c["time"]         = c.get("hora", "")
    c["isCompleted"]  = c.get("estado", "") == "Atendida"
    c["notes"]        = (
        c.get("evolucionNotas","") or
        "\n".join(filter(None, [
            c.get("soapS",""), c.get("soapO",""),
            c.get("soapA",""), c.get("soapP","")
        ]))
    )
    c["therapistId"]   = str(c.get("terapeutaId",""))
    c["therapistName"] = c.get("terapeutaNombre","")
    if upload_document("therapy_sessions", doc_id, c):
        estado = "OK" if c["isCompleted"] else "Programada"
        print(f"  [OK] Cita#{doc_id} | {c.get('pacienteNombre','')} | {c.get('fecha','')} [{estado}]")
        ok_c += 1
    else:
        print(f"  [!!] Error en cita {doc_id}")

# ─── 7. Subir Autorizaciones ──────────────────────────────────
print(f"\n[4/4] Subiendo autorizaciones...")
ok_a = 0
for a in autorizaciones:
    doc_id = str(a["id"])
    a["patientId"] = str(a.get("pacienteId",""))
    if upload_document("therapy_autorizaciones", doc_id, a):
        print(f"  [OK] Auth#{a.get('numeroAutorizacion','')} | {a.get('pacienteNombre','')}")
        ok_a += 1

# ─── Resumen ──────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"  RESTAURACION COMPLETA")
print(f"  Pacientes subidos:      {ok_p}/{len(pacientes)}")
print(f"  Terapeutas subidos:     {ok_t}/{len(terapeutas)}")
print(f"  Citas subidas:          {ok_c}/{len(citas)}")
print(f"  Autorizaciones subidas: {ok_a}/{len(autorizaciones)}")
print("=" * 60)
print("Verifica en: https://console.firebase.google.com/project/alarma-pro-a903d/firestore")
