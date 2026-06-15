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
print("[OK] Autenticado correctamente.")

# Obtener todos los pacientes
print("Obteniendo pacientes...")
patients_url = f"{FIRESTORE_BASE}/therapy_patients?pageSize=1000"
resp_patients = requests.get(patients_url, headers=HEADERS)
patients_data = resp_patients.json()

patient_ids = set()
if "documents" in patients_data:
    for doc in patients_data["documents"]:
        # El nombre del documento es completo, por ejemplo: projects/alarma-pro-a903d/databases/(default)/documents/therapy_patients/<id>
        doc_name = doc["name"]
        patient_id = doc_name.split("/")[-1]
        patient_ids.add(patient_id)
        # Tambien podemos agregar otros posibles IDs si estan dentro de los campos
        fields = doc.get("fields", {})
        if "id" in fields:
            val = fields["id"].get("stringValue") or fields["id"].get("integerValue")
            if val:
                patient_ids.add(str(val))

print(f"Total pacientes conocidos encontrados: {len(patient_ids)}")

# Obtener todas las sesiones/citas
print("Obteniendo citas...")
sessions_url = f"{FIRESTORE_BASE}/therapy_sessions?pageSize=1000"
resp_sessions = requests.get(sessions_url, headers=HEADERS)
sessions_data = resp_sessions.json()

sessions_to_delete = []
if "documents" in sessions_data:
    for doc in sessions_data["documents"]:
        doc_name = doc["name"]
        session_id = doc_name.split("/")[-1]
        fields = doc.get("fields", {})
        
        # Buscar patientId o pacienteId
        patient_id_val = None
        if "patientId" in fields:
            patient_id_val = fields["patientId"].get("stringValue") or fields["patientId"].get("integerValue")
        if not patient_id_val and "pacienteId" in fields:
            patient_id_val = fields["pacienteId"].get("stringValue") or fields["pacienteId"].get("integerValue")
            
        paciente_nombre = fields.get("pacienteNombre", {}).get("stringValue", "Sin Nombre")
        
        if not patient_id_val or str(patient_id_val) not in patient_ids:
            sessions_to_delete.append((session_id, patient_id_val, paciente_nombre))

print(f"Se encontraron {len(sessions_to_delete)} citas de pacientes desconocidos.")
for sid, pid, name in sessions_to_delete:
    print(f" - Cita ID: {sid}, Paciente ID: {pid}, Nombre: {name}")

if sessions_to_delete:
    confirm = input("¿Deseas eliminar estas citas de la base de datos de Firebase Firestore? (s/n): ")
    if confirm.lower() == 's':
        for sid, pid, name in sessions_to_delete:
            delete_url = f"{FIRESTORE_BASE}/therapy_sessions/{sid}"
            del_resp = requests.delete(delete_url, headers=HEADERS)
            if del_resp.status_code in (200, 204):
                print(f"[OK] Cita {sid} eliminada.")
            else:
                print(f"[ERROR] No se pudo eliminar la cita {sid}: {del_resp.status_code}")
    else:
        print("Operación cancelada.")
else:
    print("No hay citas para eliminar.")
