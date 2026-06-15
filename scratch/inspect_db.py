import requests
import json
import sys

API_KEY     = "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk"
PROJECT_ID  = "alarma-pro-a903d"
ADMIN_EMAIL = "admin@terapias.com"
ADMIN_PASS  = "tera2026"

FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

print("Autenticando en Firebase...")
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

# Obtener todos los pacientes
print("\n--- PACIENTES ---")
patients_url = f"{FIRESTORE_BASE}/therapy_patients?pageSize=1000"
resp_patients = requests.get(patients_url, headers=HEADERS)
patients_data = resp_patients.json()

patients_list = []
if "documents" in patients_data:
    for doc in patients_data["documents"]:
        doc_name = doc["name"]
        patient_id = doc_name.split("/")[-1]
        fields = doc.get("fields", {})
        name = fields.get("name", {}).get("stringValue", "Sin Nombre")
        patients_list.append((patient_id, name))
        print(f"ID: {patient_id} | Nombre: {name}")
else:
    print("No se encontraron pacientes.")

# Obtener todas las sesiones/citas
print("\n--- CITAS ---")
sessions_url = f"{FIRESTORE_BASE}/therapy_sessions?pageSize=1000"
resp_sessions = requests.get(sessions_url, headers=HEADERS)
sessions_data = resp_sessions.json()

if "documents" in sessions_data:
    for doc in sessions_data["documents"]:
        doc_name = doc["name"]
        session_id = doc_name.split("/")[-1]
        fields = doc.get("fields", {})
        
        patient_id_val = None
        if "patientId" in fields:
            patient_id_val = fields["patientId"].get("stringValue") or fields["patientId"].get("integerValue")
        if not patient_id_val and "pacienteId" in fields:
            patient_id_val = fields["pacienteId"].get("stringValue") or fields["pacienteId"].get("integerValue")
            
        paciente_nombre = fields.get("pacienteNombre", {}).get("stringValue", "")
        time_val = fields.get("time", {}).get("stringValue", "")
        date_val = fields.get("date", {}).get("stringValue", "")
        is_completed = fields.get("isCompleted", {}).get("booleanValue", False)
        
        print(f"Session ID: {session_id} | Date: {date_val} | Time: {time_val} | Patient ID: {patient_id_val} | Name (Field): {paciente_nombre} | Completed: {is_completed}")
else:
    print("No se encontraron citas.")
