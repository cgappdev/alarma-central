import os
import re

file_path = r"c:\Users\Soportelg\.gemini\antigravity\scratch\alarma-central\terapias\app.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Firebase Config at the top
firebase_init = """// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk",
  authDomain: "alarma-pro-a903d.firebaseapp.com",
  projectId: "alarma-pro-a903d",
  storageBucket: "alarma-pro-a903d.firebasestorage.app",
  messagingSenderId: "408079567330",
  appId: "1:408079567330:web:a453dbce735dc7fa1ed1bb"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// """

content = content.replace("// App State and Local Storage Keys", firebase_init + "// App State and Local Storage Keys")

# 2. Update constructor to fetch from Firebase instead of localStorage
constructor_target = """  constructor() {
    this.patients = (JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS)) || []).map(p => {
      if (!p.authorizedSessions) p.authorizedSessions = 23;
      return p;
    });
    this.sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS)) || [];
    
    // Seed data if empty
    if (this.patients.length === 0 && this.sessions.length === 0) {
      this.patients = INITIAL_PATIENTS;
      this.sessions = INITIAL_SESSIONS;
      this.saveToStorage();
    }
    
    // Calendar State
    this.currentDate = new Date();
    this.selectedDateStr = this.formatDateISO(this.currentDate);
    
    this.initDOMRefs();
    this.initTheme();
    this.initEvents();
    this.registerServiceWorker();
    this.checkOnlineStatus();
    
    // Initial Render
    this.navigate('dashboard');
    this.updateStats();
    this.renderPatientsList();
    this.renderDatePicker();
    this.renderAgendaForSelectedDay();
    this.populatePatientDropdowns();
  }"""

constructor_replace = """  constructor() {
    this.patients = [];
    this.sessions = [];
    
    // Calendar State
    this.currentDate = new Date();
    this.selectedDateStr = this.formatDateISO(this.currentDate);
    
    this.initDOMRefs();
    this.initTheme();
    this.initEvents();
    this.registerServiceWorker();
    this.checkOnlineStatus();
    
    // Initial Render
    this.navigate('dashboard');
    
    // Initialize Firebase Listeners
    this.initFirebaseListeners();
  }

  initFirebaseListeners() {
    db.collection('therapy_patients').onSnapshot(snapshot => {
      this.patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.updateUI();
    });

    db.collection('therapy_sessions').onSnapshot(snapshot => {
      this.sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.updateUI();
    });
  }

  updateUI() {
    this.updateStats();
    this.renderPatientsList();
    this.renderDatePicker();
    this.renderAgendaForSelectedDay();
    this.populatePatientDropdowns();
    if(this.currentView === 'dashboard') {
        this.renderDashboardTimeline();
        this.renderRecentPatients();
    } else if(this.currentView === 'progress') {
        this.handleProgressPatientChange();
    }
  }"""

content = content.replace(constructor_target, constructor_replace)

# 3. Modify handlePatientSubmit
patient_submit_target = """    const newPatient = {
      id: 'p-' + Date.now(),
      name,
      phone,
      email,
      dob,
      gender,
      authorizedSessions,
      diagnosis
    };

    this.patients.push(newPatient);
    this.saveToStorage();
    this.closePatientModal();
    this.populatePatientDropdowns();
    this.renderPatientsList();
    this.updateStats();
    this.showToast(`Paciente "${name}" registrado correctamente.`, 'success');"""

patient_submit_replace = """    const newPatient = {
      name,
      phone,
      email,
      dob,
      gender,
      authorizedSessions,
      diagnosis,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('therapy_patients').add(newPatient).then(() => {
      this.closePatientModal();
      this.showToast(`Paciente "${name}" registrado correctamente.`, 'success');
    }).catch(error => {
      console.error("Error adding patient: ", error);
      this.showToast(`Error al guardar paciente.`, 'error');
    });"""

content = content.replace(patient_submit_target, patient_submit_replace)

# 4. Modify handleSessionSubmit
session_submit_target = """    const sessionData = {
      id: 's-' + Date.now(),
      patientId,
      date,
      time,
      isCompleted
    };

    if (isCompleted) {
      sessionData.pain = parseInt(document.getElementById('s-pain').value);
      sessionData.mobility = parseInt(document.getElementById('s-mobility').value);
      sessionData.mood = parseInt(document.getElementById('s-mood').value);
      sessionData.notes = document.getElementById('s-notes').value;
    } else {
      sessionData.notes = document.getElementById('s-notes').value; // appointment metadata
    }

    this.sessions.push(sessionData);
    this.saveToStorage();
    this.closeSessionModal();
    
    // Refresh screens
    this.updateStats();
    this.renderDashboardTimeline();
    this.renderAgendaForSelectedDay();
    this.renderDatePicker();
    
    if (this.currentView === 'progress' && this.progressPatientSelect.value === patientId) {
      this.handleProgressPatientChange();
    }
    this.showToast(isCompleted ? 'Sesión guardada con éxito.' : 'Sesión programada en la agenda.', 'success');"""

session_submit_replace = """    const sessionData = {
      patientId,
      date,
      time,
      isCompleted,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isCompleted) {
      sessionData.pain = parseInt(document.getElementById('s-pain').value);
      sessionData.mobility = parseInt(document.getElementById('s-mobility').value);
      sessionData.mood = parseInt(document.getElementById('s-mood').value);
      sessionData.notes = document.getElementById('s-notes').value;
    } else {
      sessionData.notes = document.getElementById('s-notes').value;
    }

    db.collection('therapy_sessions').add(sessionData).then(() => {
      this.closeSessionModal();
      this.showToast(isCompleted ? 'Sesión guardada con éxito.' : 'Sesión programada en la agenda.', 'success');
    }).catch(error => {
      console.error("Error adding session: ", error);
      this.showToast(`Error al guardar sesión.`, 'error');
    });"""

content = content.replace(session_submit_target, session_submit_replace)

# 5. Fix Chart.js rendering
chart_target = """  renderEvolutionChart() {
    // Implementation needed
  }"""
  
chart_replace = """  renderEvolutionChart() {
    const patientId = this.progressPatientSelect.value;
    if (!patientId) return;

    const patientSessions = this.sessions
        .filter(s => s.patientId === patientId && s.isCompleted)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = patientSessions.map((s, index) => `S${index + 1} (${s.date})`);
    const painData = patientSessions.map(s => s.pain || 0);
    const mobilityData = patientSessions.map(s => s.mobility || 0);

    const ctx = document.getElementById('evolution-chart');
    if (!ctx) return;

    if (this.evolutionChartInstance) {
        this.evolutionChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';

    this.evolutionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nivel de Dolor (1-10)',
                    data: painData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                    fill: true
                },
                {
                    label: 'Movilidad (%)',
                    data: mobilityData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: 0,
                    max: 10,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    grid: { drawOnChartArea: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
  }"""

if "renderEvolutionChart()" in content and not "evolutionChartInstance =" in content:
    content = content.replace(chart_target, chart_replace)
else:
    # If renderEvolutionChart() is missing or already implemented, we'll try to insert it or replace its body.
    # We can use regex to replace the function body
    content = re.sub(r'renderEvolutionChart\(\)\s*\{[^}]*\}', chart_replace, content, count=1)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("app.js updated successfully.")
