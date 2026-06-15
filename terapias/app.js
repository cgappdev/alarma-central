import { generarAF, generarAP, generarCT, descargarTxt } from './rips.js';

// Firebase Configuration
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

// Habilitar persistencia offline con IndexedDB
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
      console.warn("Firestore offline persistence status:", err.code);
  });

const auth = firebase.auth();

// // App State and Local Storage Keys
const STORAGE_KEYS = {
  PATIENTS: 'therapy_app_patients',
  SESSIONS: 'therapy_app_sessions',
  THEME: 'therapy_app_theme'
};

// Initial/Mock Data if empty (to give a rich initial experience)
const INITIAL_PATIENTS = [
  {
    id: 'p-1',
    name: 'Juan Pérez Medina',
    phone: '+52 55 1234 5678',
    email: 'juan.perez@email.com',
    dob: '1985-06-15',
    gender: 'M',
    authorizedSessions: 23,
    diagnosis: 'Rehabilitación post-quirúrgica de manguito rotador derecho. Dolor al levantar el brazo y rango de movimiento reducido (abducción a 95°).'
  },
  {
    id: 'p-2',
    name: 'Sofía Valenzuela Castro',
    phone: '+52 55 9876 5432',
    email: 'sofia.val@email.com',
    dob: '1992-11-23',
    gender: 'F',
    authorizedSessions: 23,
    diagnosis: 'Hernia discal L4-L5. Dolor lumbar crónico irradiado a pierna izquierda. Limitación en flexión de columna y bipedestación prolongada.'
  }
];

const INITIAL_SESSIONS = [
  {
    id: 's-1',
    patientId: 'p-1',
    date: '2026-05-10',
    time: '09:00',
    pain: 8,
    mobility: 30,
    mood: 2,
    notes: 'Primera sesión. Valoración inicial del manguito rotador. Rango de movimiento pasivo limitado, dolor agudo. Se inicia terapia con termoterapia, ultrasonido y movilizaciones pasivas suaves.',
    isCompleted: true
  },
  {
    id: 's-2',
    patientId: 'p-1',
    date: '2026-05-15',
    time: '09:00',
    pain: 6,
    mobility: 45,
    mood: 3,
    notes: 'Segunda sesión. Reducción ligera del dolor post-tratamiento. Se añade fortalecimiento isométrica leve de rotadores y estiramientos.',
    isCompleted: true
  },
  {
    id: 's-3',
    patientId: 'p-1',
    date: '2026-05-22',
    time: '09:00',
    pain: 4,
    mobility: 60,
    mood: 4,
    notes: 'Tercera sesión. Excelente tolerancia. Rango activo de abducción mejoró a 120°. Ejercicios con bandas elásticas suaves.',
    isCompleted: true
  },
  {
    id: 's-4',
    patientId: 'p-1',
    date: '2026-05-30',
    time: '10:00',
    pain: 3,
    mobility: 75,
    mood: 5,
    notes: 'Sesión de hoy. Paciente refiere mínima molestia. Ejercicios de fortalecimiento concéntrico y propiocepción sin dolor.',
    isCompleted: true
  },
  {
    id: 's-5',
    patientId: 'p-2',
    date: '2026-05-28',
    time: '11:30',
    pain: 7,
    mobility: 40,
    mood: 2,
    notes: 'Valoración inicial. Dolor intenso en zona lumbar. Terapia manual descontracturante, electroestimulación TENS y estiramientos de cadena posterior.',
    isCompleted: true
  },
  {
    id: 's-6',
    patientId: 'p-2',
    date: '2026-05-30',
    time: '12:00',
    pain: 5,
    mobility: 55,
    mood: 3,
    notes: 'Sesión programada para hoy. Paciente refiere alivio tras primera sesión. Continuamos protocolo de fortalecimiento de CORE (ejercicios de Williams modificados).',
    isCompleted: false
  }
];

class TherapyApp {
  constructor(user) {
    this.currentUser = user;
    this.patients = [];
    this.sessions = [];
    this.autorizaciones = [];
    this.terapeutas = [];
    
    // Flags de carga
    this.loadingPatients = true;
    this.loadingSessions = true;
    this.loadingAutorizaciones = true;
    this.loadingTerapeutas = true;

    // Estado de sincronización (escrituras offline pendientes)
    this.pendingWritesPatients = false;
    this.pendingWritesSessions = false;
    this.pendingWritesAutorizaciones = false;
    this.pendingWritesTerapeutas = false;
    
    this.currentDate = new Date();
    this.selectedDateStr = this.formatDateISO(this.currentDate);
    
    this.initDOMRefs();
    this.initTheme();
    this.initEvents();
    this.checkOnlineStatus();
    this.updateProfileUI();
    
    this.navigate('dashboard');
    this.initFirebaseListeners();
  }

  initFirebaseListeners() {
    this.loadingPatients = true;
    this.loadingSessions = true;
    this.loadingAutorizaciones = true;
    this.loadingTerapeutas = true;

    db.collection('therapy_patients').onSnapshot(snapshot => {
      this.patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loadingPatients = false;
      this.pendingWritesPatients = snapshot.metadata.hasPendingWrites;
      this.updateSyncStatusIndicator();
      this.updateUI();
    }, error => {
      console.error(error);
      this.loadingPatients = false;
      this.updateUI();
    });

    db.collection('therapy_sessions').onSnapshot(snapshot => {
      this.sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loadingSessions = false;
      this.pendingWritesSessions = snapshot.metadata.hasPendingWrites;
      this.updateSyncStatusIndicator();
      this.updateUI();
    }, error => {
      console.error(error);
      this.loadingSessions = false;
      this.updateUI();
    });

    db.collection('therapy_autorizaciones').onSnapshot(snapshot => {
      this.autorizaciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loadingAutorizaciones = false;
      this.pendingWritesAutorizaciones = snapshot.metadata.hasPendingWrites;
      this.updateSyncStatusIndicator();
      this.updateUI();
    }, error => {
      console.error(error);
      this.loadingAutorizaciones = false;
      this.updateUI();
    });

    db.collection('therapy_terapeutas').onSnapshot(snapshot => {
      this.terapeutas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.loadingTerapeutas = false;
      this.pendingWritesTerapeutas = snapshot.metadata.hasPendingWrites;
      this.updateSyncStatusIndicator();
      this.updateUI();
    }, error => {
      console.error(error);
      this.loadingTerapeutas = false;
      this.updateUI();
    });
  }

  updateUI() {
    // Eliminar automáticamente citas de pacientes desconocidos si la lista de pacientes y citas ya se cargó
    if (!this.loadingPatients && !this.loadingSessions && this.patients.length > 0 && this.sessions.length > 0) {
      this.sessions.forEach(session => {
        const patientExists = this.patients.some(p => String(p.id) === String(session.patientId));
        if (!patientExists) {
          console.warn(`Eliminando cita huérfana de paciente desconocido: ${session.id}`);
          db.collection('therapy_sessions').doc(session.id).delete().catch(e => console.error(e));
        }
      });
    }

    this.updateStats();
    this.renderPatientsList();
    this.renderDatePicker();
    this.renderAgendaForSelectedDay();
    this.populatePatientDropdowns();
    this.renderTerapeutasList();
    if (this.currentView === 'dashboard') {
      this.renderDashboardTimeline();
      this.renderRecentPatients();
    } else if (this.currentView === 'progress') {
      this.handleProgressPatientChange();
    } else if (this.currentView === 'autorizaciones') {
      this.renderAutorizaciones();
    } else if (this.currentView === 'terapeutas') {
      this.renderTerapeutasList();
    }
  }

  updateProfileUI() {
    const user = this.currentUser;
    if (!user) return;

    // Determine display name: use displayName, or part before @ in email
    const displayName = user.displayName || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();
    const email = user.email;

    // Sidebar profile
    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl = document.getElementById('sidebar-name');
    const emailEl = document.getElementById('sidebar-email');
    const greetingEl = document.getElementById('dashboard-greeting-name');

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (greetingEl) greetingEl.textContent = displayName.split(' ')[0];
  }

  saveToStorage() {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(this.patients));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
  }

  initDOMRefs() {
    // Navigation
    this.menuItems = document.querySelectorAll('.menu-item');
    this.views = document.querySelectorAll('.content-view');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // General Search
    this.globalSearch = document.getElementById('global-search');
    
    // Dashboard elements
    this.statTotalPatients = document.getElementById('stat-total-patients');
    this.statTodaySessions = document.getElementById('stat-today-sessions');
    this.statCompletedPct = document.getElementById('stat-completed-pct');
    this.statPendingCitas = document.getElementById('stat-pending-citas');
    this.todayTimeline = document.getElementById('today-timeline');
    this.recentPatientsContainer = document.getElementById('recent-patients-container');
    
    // Shortcuts
    document.getElementById('link-to-agenda').addEventListener('click', () => this.navigate('agenda'));
    document.getElementById('link-to-patients').addEventListener('click', () => this.navigate('patients'));
    document.getElementById('btn-quick-session').addEventListener('click', () => this.openSessionModal());
    
    // Patients View elements
    this.patientsGridContainer = document.getElementById('patients-grid-container');
    this.patientSearchInput = document.getElementById('patient-search-input');
    this.btnAddPatient = document.getElementById('btn-add-patient');
    this.modalPatient = document.getElementById('modal-patient');
    this.formPatient = document.getElementById('form-patient');
    this.closeModalPatient = document.getElementById('close-modal-patient');
    this.btnCancelPatient = document.getElementById('btn-cancel-patient');

    // Terapeutas View elements
    this.terapeutasGridContainer = document.getElementById('terapeutas-grid-container');
    this.terapeutaSearchInput = document.getElementById('terapeuta-search-input');
    this.btnAddTerapeuta = document.getElementById('btn-add-terapeuta');
    this.modalTerapeuta = document.getElementById('modal-terapeuta');
    this.formTerapeuta = document.getElementById('form-terapeuta');
    this.closeModalTerapeuta = document.getElementById('close-modal-terapeuta');
    this.btnCancelTerapeuta = document.getElementById('btn-cancel-terapeuta');
    
    // Agenda View elements
    this.btnAddAppointment = document.getElementById('btn-add-appointment');
    this.modalSession = document.getElementById('modal-session');
    this.formSession = document.getElementById('form-session');
    this.closeModalSession = document.getElementById('close-modal-session');
    this.btnCancelSession = document.getElementById('btn-cancel-session');
    this.dpMonthTitle = document.getElementById('dp-month-title');
    this.dpDaysGrid = document.getElementById('dp-days-grid');
    this.dpPrevMonth = document.getElementById('dp-prev-month');
    this.dpNextMonth = document.getElementById('dp-next-month');
    this.selectedDayTitle = document.getElementById('selected-day-title');
    this.selectedDayCount = document.getElementById('selected-day-count');
    this.agendaSessionsList = document.getElementById('agenda-sessions-list');
    
    // Range badge dynamic displays
    this.initRangeBadge('s-pain', 'pain-badge', '');
    this.initRangeBadge('s-mobility', 'mobility-badge', '%');
    this.initRangeBadge('s-mood', 'mood-badge', '');
    
    // Completed Checkbox toggle
    this.sIsCompleted = document.getElementById('s-is-completed');
    this.sIsCompleted.addEventListener('change', () => this.toggleSessionModalFields());
    
    // Progress View elements
    this.progressPatientSelect = document.getElementById('progress-patient-select');
    this.evolutionContent = document.getElementById('evolution-content');
    this.evolutionEmptyPrompt = document.getElementById('evolution-empty-prompt');
    this.valDolor = document.getElementById('val-dolor');
    this.valMovilidad = document.getElementById('val-movilidad');
    this.valAnimo = document.getElementById('val-animo');
    this.valSesiones = document.getElementById('val-sesiones');
    this.notesEvolutionTimeline = document.getElementById('notes-evolution-timeline');
    
    // Gemini AI elements
    this.geminiConfigBtn = document.getElementById('gemini-config-btn');
    this.modalGeminiConfig = document.getElementById('modal-gemini-config');
    this.formGeminiConfig = document.getElementById('form-gemini-config');
    this.closeModalGemini = document.getElementById('close-modal-gemini');
    this.btnCancelGemini = document.getElementById('btn-cancel-gemini');
    this.geminiApiKeyInput = document.getElementById('gemini-api-key');
    this.btnOptimizeNotes = document.getElementById('btn-optimize-notes');

    // Offline indicator
    this.offlineIndicator = document.getElementById('offline-indicator');

    // Backup elements
    this.btnExportBackup = document.getElementById('btn-export-backup');
    this.btnImportBackup = document.getElementById('btn-import-backup');
    this.importBackupFile = document.getElementById('import-backup-file');
  }

  initRangeBadge(inputId, badgeId, suffix) {
    const input = document.getElementById(inputId);
    const badge = document.getElementById(badgeId);
    if (input && badge) {
      input.addEventListener('input', (e) => {
        badge.textContent = e.target.value + suffix;
      });
    }
  }

  toggleSessionModalFields() {
    const fields = document.querySelectorAll('.s-completed-only');
    fields.forEach(el => {
      el.style.display = this.sIsCompleted.checked ? 'block' : 'none';
    });
    
    const notesLabel = document.getElementById('notes-label');
    if (this.sIsCompleted.checked) {
      notesLabel.textContent = 'Notas de la Sesión / Ejercicios Realizados';
    } else {
      notesLabel.textContent = 'Indicaciones para el Paciente / Notas de Programación';
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeBtnUI(savedTheme);
  }

  updateThemeBtnUI(theme) {
    const textEl = this.themeToggleBtn.querySelector('.toggle-text');
    if (theme === 'dark') {
      textEl.textContent = 'Tema Claro';
    } else {
      textEl.textContent = 'Tema Oscuro';
    }
  }

  initEvents() {
    // Theme toggle
    this.themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      this.updateThemeBtnUI(newTheme);
      // Redraw charts if in progress view
      if (this.currentView === 'progress') {
        this.renderEvolutionChart();
      }
    });

    // Logout button
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.handleLogout());
    }

    // View Switching Navigation
    this.menuItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;
        this.navigate(viewName);
      });
    });

    // Global Search
    this.globalSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      if (query.trim() !== '') {
        // Simple search auto-switch or highlight
        this.patientSearchInput.value = query;
        this.navigate('patients');
        this.renderPatientsList();
      }
    });

    // Patient search input
    this.patientSearchInput.addEventListener('input', () => this.renderPatientsList());

    // Modals Open/Close
    this.btnAddPatient.addEventListener('click', () => this.openPatientModal());
    this.closeModalPatient.addEventListener('click', () => this.closePatientModal());
    this.btnCancelPatient.addEventListener('click', () => this.closePatientModal());
    
    this.btnAddAppointment.addEventListener('click', () => this.openSessionModal(null, false));
    this.closeModalSession.addEventListener('click', () => this.closeSessionModal());
    this.btnCancelSession.addEventListener('click', () => this.closeSessionModal());

    // Form Submissions
    this.formPatient.addEventListener('submit', (e) => this.handlePatientSubmit(e));
    this.formSession.addEventListener('submit', (e) => this.handleSessionSubmit(e));

    // Calendar Navigation
    this.dpPrevMonth.addEventListener('click', () => this.changeMonth(-1));
    this.dpNextMonth.addEventListener('click', () => this.changeMonth(1));

    // Progress Patient Select
    this.progressPatientSelect.addEventListener('change', () => this.handleProgressPatientChange());

    // Terapeutas search input
    this.terapeutaSearchInput.addEventListener('input', () => this.renderTerapeutasList());

    // Terapeutas Modals Open/Close
    this.btnAddTerapeuta.addEventListener('click', () => this.openTerapeutaModal());
    this.closeModalTerapeuta.addEventListener('click', () => this.closeTerapeutaModal());
    this.btnCancelTerapeuta.addEventListener('click', () => this.closeTerapeutaModal());

    // Terapeutas Form Submission
    this.formTerapeuta.addEventListener('submit', (e) => this.handleTerapeutaSubmit(e));

    // Gemini AI Modal Events
    if (this.geminiConfigBtn) {
      this.geminiConfigBtn.addEventListener('click', () => this.openGeminiModal());
    }
    if (this.closeModalGemini) {
      this.closeModalGemini.addEventListener('click', () => this.closeGeminiModal());
    }
    if (this.btnCancelGemini) {
      this.btnCancelGemini.addEventListener('click', () => this.closeGeminiModal());
    }
    if (this.formGeminiConfig) {
      this.formGeminiConfig.addEventListener('submit', (e) => this.handleGeminiConfigSubmit(e));
    }
    if (this.btnOptimizeNotes) {
      this.btnOptimizeNotes.addEventListener('click', () => this.optimizeNotesWithAI());
    }

    // Listen to network status
    window.addEventListener('online', () => this.checkOnlineStatus());
    window.addEventListener('offline', () => this.checkOnlineStatus());

    // Backup events
    if (this.btnExportBackup) {
      this.btnExportBackup.addEventListener('click', () => this.exportData());
    }
    if (this.btnImportBackup) {
      this.btnImportBackup.addEventListener('click', () => this.importBackupFile.click());
    }
    if (this.importBackupFile) {
      this.importBackupFile.addEventListener('change', (e) => this.handleImport(e));
    }

    // RIPS Events
    const btnGenerarRips = document.getElementById('btn-generar-rips');
    if (btnGenerarRips) {
      btnGenerarRips.addEventListener('click', () => this.openRipsModal());
    }
    const btnCloseRips = document.getElementById('btn-close-rips');
    if (btnCloseRips) {
      btnCloseRips.addEventListener('click', () => this.closeRipsModal());
    }
    const btnRipsPreview = document.getElementById('btn-rips-preview');
    if (btnRipsPreview) {
      btnRipsPreview.addEventListener('click', () => this.generateRipsPreview());
    }
    const btnDlCt = document.getElementById('btn-dl-ct');
    if (btnDlCt) btnDlCt.addEventListener('click', () => this.downloadRipsFile('CT'));
    const btnDlAf = document.getElementById('btn-dl-af');
    if (btnDlAf) btnDlAf.addEventListener('click', () => this.downloadRipsFile('AF'));
    const btnDlAp = document.getElementById('btn-dl-ap');
    if (btnDlAp) btnDlAp.addEventListener('click', () => this.downloadRipsFile('AP'));
    const btnDlAll = document.getElementById('btn-dl-all');
    if (btnDlAll) btnDlAll.addEventListener('click', () => this.downloadRipsAll());
  }

  checkOnlineStatus() {
    this.updateSyncStatusIndicator();
  }

  updateSyncStatusIndicator() {
    const isOnline = navigator.onLine;
    const hasPending = this.pendingWritesPatients || this.pendingWritesSessions || this.pendingWritesAutorizaciones;
    const indicator = this.offlineIndicator;
    if (!indicator) return;

    if (!isOnline) {
      indicator.innerHTML = `<span class="material-symbols-rounded">wifi_off</span><span>Sin conexión (Local)</span>`;
      indicator.style.backgroundColor = 'var(--danger-light)';
      indicator.style.color = 'var(--danger)';
      indicator.style.display = 'flex';
      indicator.classList.add('visible');
    } else if (hasPending) {
      indicator.innerHTML = `<span class="material-symbols-rounded" style="animation: spin-pulse 1.5s infinite linear;">sync</span><span>Sincronizando...</span>`;
      indicator.style.backgroundColor = 'var(--accent-amber-light)';
      indicator.style.color = 'var(--accent-amber)';
      indicator.style.display = 'flex';
      indicator.classList.add('visible');
    } else {
      indicator.innerHTML = `<span class="material-symbols-rounded">cloud_done</span><span>Sincronizado</span>`;
      indicator.style.backgroundColor = 'var(--accent-emerald-light)';
      indicator.style.color = 'var(--accent-emerald)';
      indicator.style.display = 'flex';
      indicator.classList.add('visible');
      
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        const stillPending = this.pendingWritesPatients || this.pendingWritesSessions || this.pendingWritesAutorizaciones;
        if (navigator.onLine && !stillPending) {
          indicator.classList.remove('visible');
          indicator.style.display = 'none';
        }
      }, 3000);
    }
  }

  navigate(viewName) {
    this.currentView = viewName;
    this.menuItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.views.forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Sub-view updates when entering a view
    if (viewName === 'dashboard') {
      this.updateStats();
      this.renderDashboardTimeline();
      this.renderRecentPatients();
    } else if (viewName === 'patients') {
      this.renderPatientsList();
    } else if (viewName === 'agenda') {
      this.renderDatePicker();
      this.renderAgendaForSelectedDay();
    } else if (viewName === 'progress') {
      this.populatePatientDropdowns();
      this.handleProgressPatientChange();
    } else if (viewName === 'autorizaciones') {
      this.renderAutorizaciones();
    }
  }

  // Statistics Calculation
  updateStats() {
    const todayStr = this.formatDateISO(new Date());
    
    // Total Active Patients
    this.statTotalPatients.textContent = this.patients.length;
    
    // Today's sessions
    const todaySessions = this.sessions.filter(s => s.date === todayStr);
    this.statTodaySessions.textContent = todaySessions.length;
    
    // Pending today
    const pendingToday = todaySessions.filter(s => !s.isCompleted).length;
    this.statPendingCitas.textContent = pendingToday;
    
    // Completion percentage
    if (todaySessions.length === 0) {
      this.statCompletedPct.textContent = '100%';
    } else {
      const completedToday = todaySessions.filter(s => s.isCompleted).length;
      const pct = Math.round((completedToday / todaySessions.length) * 100);
      this.statCompletedPct.textContent = `${pct}%`;
    }
  }

  // Dashboard Visual lists
  renderDashboardTimeline() {
    const todayStr = this.formatDateISO(new Date());
    const todaySessions = this.sessions.filter(s => s.date === todayStr);
    
    // Sort by time ascending
    todaySessions.sort((a, b) => a.time.localeCompare(b.time));
    
    if (todaySessions.length === 0) {
      this.todayTimeline.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">event_busy</span>
          <p>No tienes sesiones agendadas para hoy.</p>
        </div>`;
      return;
    }

    this.todayTimeline.innerHTML = todaySessions.map(session => {
      const patient = this.patients.find(p => String(p.id) === String(session.patientId)) || { name: 'Paciente Desconocido', diagnosis: 'No especificado' };
      const statusClass = session.isCompleted ? 'completed' : 'pending';
      const statusText = session.isCompleted ? 'Completada' : 'Pendiente';
      const badgeClass = session.isCompleted ? 'status-completed' : 'status-pending';

      return `
        <div class="timeline-item ${statusClass}">
          <div class="timeline-time">${session.time}</div>
          <div class="timeline-line"></div>
          <div class="timeline-card">
            <div class="card-detail">
              <div class="card-title">${patient.name}</div>
              <div class="card-subtitle">${patient.diagnosis.substring(0, 50)}...</div>
            </div>
            <span class="badge-status ${badgeClass}">${statusText}</span>
          </div>
        </div>`;
    }).join('');
  }

  renderRecentPatients() {
    if (this.patients.length === 0) {
      this.recentPatientsContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">person_search</span>
          <p>Aún no has registrado pacientes.</p>
        </div>`;
      return;
    }

    // Sort by order of array reverse (most recently created)
    const recents = [...this.patients].reverse().slice(0, 4);
    
    this.recentPatientsContainer.innerHTML = recents.map(patient => {
      const initial = patient.name.charAt(0).toUpperCase();
      return `
        <div class="recent-patient-row" style="cursor: pointer;" onclick="app.viewPatientEvolution('${patient.id}')">
          <div class="patient-info-left">
            <div class="p-avatar">${initial}</div>
            <div class="patient-meta">
              <h4>${patient.name}</h4>
              <p>${patient.diagnosis.substring(0, 35)}...</p>
            </div>
          </div>
          <span class="material-symbols-rounded" style="color: var(--primary);">arrow_forward</span>
        </div>`;
    }).join('');
  }

  // =============================================
  // HISTORIAL DE SESIONES
  // =============================================
  openHistorial(patientId) {
    const patient = this.patients.find(p => String(p.id) === String(patientId));
    if (!patient) return;

    // Header
    document.getElementById('historial-avatar').textContent = (patient.name || '?').charAt(0).toUpperCase();
    document.getElementById('historial-patient-name').textContent = patient.name || 'Paciente';
    document.getElementById('historial-patient-eps').textContent =
      patient.epsNombre ? `${patient.epsNombre} | Doc: ${patient.tipoDocumento || ''}-${patient.numeroDocumento || ''}` : 'Sin EPS registrada';

    // Render sessions
    this.renderHistorial(patientId);

    // Show modal
    const modal = document.getElementById('modal-historial');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    // Close handlers
    document.getElementById('btn-close-historial').onclick = () => this.closeHistorial();
    modal.addEventListener('click', (e) => { if (e.target === modal) this.closeHistorial(); }, { once: true });
  }

  closeHistorial() {
    const modal = document.getElementById('modal-historial');
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }

  renderHistorial(patientId) {
    const pSessions = this.sessions
      .filter(s => String(s.patientId) === String(patientId))
      .sort((a, b) => {
        const da = new Date((a.date || '2000-01-01') + 'T' + (a.time || '00:00'));
        const db = new Date((b.date || '2000-01-01') + 'T' + (b.time || '00:00'));
        return db - da; // newest first
      });

    const total      = pSessions.length;
    const realizadas = pSessions.filter(s => s.isCompleted).length;
    const pendientes = total - realizadas;
    const auth       = this.autorizaciones.find(a => String(a.pacienteId || a.patientId) === String(patientId));
    const authNum    = auth ? auth.numeroAutorizacion : '—';

    // Summary
    document.getElementById('historial-summary').innerHTML = `
      <div class="hist-stat"><strong>${total}</strong><small>Total citas</small></div>
      <div class="hist-stat"><strong style="color:var(--accent-emerald)">${realizadas}</strong><small>Realizadas</small></div>
      <div class="hist-stat"><strong style="color:var(--accent-amber)">${pendientes}</strong><small>Pendientes</small></div>
      <div class="hist-stat"><strong style="color:var(--text-secondary)">${authNum}</strong><small>N° Autorización</small></div>`;

    if (pSessions.length === 0) {
      document.getElementById('historial-sessions-list').innerHTML = `
        <div class="empty-state"><span class="material-symbols-rounded">event_busy</span><p>No hay sesiones registradas para este paciente.</p></div>`;
      return;
    }

    document.getElementById('historial-sessions-list').innerHTML = pSessions.map((s, idx) => {
      const displayDate = s.date
        ? new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
        : 'Fecha desconocida';

      const isAtendida = s.isCompleted || s.estado === 'Atendida';
      const statusClass = isAtendida ? 'hist-badge-done' : 'hist-badge-pending';
      const statusLabel = isAtendida ? 'Atendida' : 'Programada';

      const notes  = s.notes || s.evolucionNotas || '';
      const soapS  = s.soapS || '';
      const soapO  = s.soapO || '';
      const soapA  = s.soapA || '';
      const soapP  = s.soapP || '';
      const hasSoap = soapS || soapO || soapA || soapP;

      const diagCode = s.diagnosticoCodigo || '';
      const diagName = s.diagnosticoNombre || '';
      const cups     = s.cupsNombre || s.cupsCodigo || '';
      const copago   = s.copago != null ? `$${Number(s.copago).toLocaleString('es-CO')}` : null;
      const sesNum   = s.sesionNumero ? `Sesión #${s.sesionNumero}` : `Sesión #${total - idx}`;
      const therapist = s.therapistName || s.terapeutaNombre || '';

      return `
        <div class="hist-session-card ${isAtendida ? '' : 'hist-pending'}">
          <div class="hist-session-header">
            <div class="hist-session-meta">
              <span class="hist-session-num">${sesNum}</span>
              <span class="hist-date">
                <span class="material-symbols-rounded" style="font-size:1rem;">calendar_today</span>
                ${displayDate}${s.time ? ' — ' + s.time : ''}
              </span>
              ${therapist ? `<span class="hist-therapist"><span class="material-symbols-rounded" style="font-size:1rem;">person</span>${therapist}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="hist-badge ${statusClass}">${statusLabel}</span>
              <button class="btn-icon-sm" onclick="app.openSessionModal(null, ${isAtendida}, '${s.id}'); app.closeHistorial();" title="Editar Sesión" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 0.2rem; border-radius: 4px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deleteSession('${s.id}')" title="Eliminar Sesión" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; padding: 0.2rem; border-radius: 4px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1rem;">delete</span>
              </button>
            </div>
          </div>

          ${cups || diagCode ? `
          <div class="hist-session-tags">
            ${cups ? `<span class="hist-tag hist-tag-cups"><span class="material-symbols-rounded">local_hospital</span>${cups}</span>` : ''}
            ${diagCode ? `<span class="hist-tag hist-tag-diag"><span class="material-symbols-rounded">diagnosis</span>${diagCode}${diagName ? ' - ' + diagName : ''}</span>` : ''}
            ${copago ? `<span class="hist-tag"><span class="material-symbols-rounded">payments</span>Copago: ${copago}</span>` : ''}
          </div>` : ''}

          ${notes ? `<div class="hist-notes"><p><strong>Notas de evolución:</strong></p><p>${notes}</p></div>` : ''}

          ${hasSoap ? `
          <details class="hist-soap">
            <summary>Ver nota SOAP completa</summary>
            ${soapS ? `<div class="soap-section"><strong>S — Subjetivo</strong><p>${soapS}</p></div>` : ''}
            ${soapO ? `<div class="soap-section"><strong>O — Objetivo</strong><p>${soapO}</p></div>` : ''}
            ${soapA ? `<div class="soap-section"><strong>A — Análisis</strong><p>${soapA}</p></div>` : ''}
            ${soapP ? `<div class="soap-section"><strong>P — Plan</strong><p>${soapP}</p></div>` : ''}
          </details>` : ''}
        </div>`;
    }).join('');
  }

  viewPatientEvolution(patientId) {
    this.navigate('progress');
    this.progressPatientSelect.value = patientId;
    this.handleProgressPatientChange();
  }

  renderPatientsList() {
    if (this.loadingPatients) {
      this.patientsGridContainer.innerHTML = Array(3).fill(0).map(() => `
        <div class="patient-card skeleton">
          <div class="patient-card-header">
            <div class="p-avatar skeleton-shimmer" style="background: var(--border-color); animation: pulse 1.5s infinite ease-in-out;"></div>
            <div style="flex: 1;">
              <div class="skeleton-line skeleton-shimmer" style="height: 1.25rem; width: 70%; background: var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; animation: pulse 1.5s infinite ease-in-out;"></div>
              <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 40%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
            </div>
          </div>
          <div class="patient-detail-body" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
            <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 85%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
            <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 60%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
            <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 75%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
          </div>
          <div class="patient-card-actions" style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; gap: 0.5rem; margin-top: 1.25rem;">
            <div class="skeleton-line skeleton-shimmer" style="height: 2rem; flex: 1; background: var(--border-color); border-radius: 8px; animation: pulse 1.5s infinite ease-in-out;"></div>
            <div class="skeleton-line skeleton-shimmer" style="height: 2rem; flex: 1; background: var(--border-color); border-radius: 8px; animation: pulse 1.5s infinite ease-in-out;"></div>
            <div class="skeleton-line skeleton-shimmer" style="height: 2rem; flex: 1; background: var(--border-color); border-radius: 8px; animation: pulse 1.5s infinite ease-in-out;"></div>
          </div>
        </div>
      `).join('');
      return;
    }

    const searchVal = this.patientSearchInput.value.toLowerCase();
    
    const filtered = this.patients.filter(p =>
      (p.name || '').toLowerCase().includes(searchVal) ||
      (p.diagnosis || '').toLowerCase().includes(searchVal) ||
      (p.phone && p.phone.includes(searchVal))
    );

    if (filtered.length === 0) {
      this.patientsGridContainer.innerHTML = `
        <div class="empty-state col-12" style="grid-column: span 3;">
          <span class="material-symbols-rounded">person_search</span>
          <p>No se encontraron pacientes que coincidan con tu búsqueda.</p>
        </div>`;
      return;
    }

    this.patientsGridContainer.innerHTML = filtered.map(p => {
      const initial = (p.name || '?').charAt(0).toUpperCase();
      const completedSessions = this.sessions.filter(s => String(s.patientId) === String(p.id) && s.isCompleted).length;
      const totalSessions    = this.sessions.filter(s => String(s.patientId) === String(p.id)).length;

      // Buscar autorizacion real del paciente
      const auth = this.autorizaciones.find(a => String(a.pacienteId) === String(p.id) || String(a.patientId) === String(p.id));
      const authorized      = auth ? (auth.totalSesiones || auth.authorizedSessions || 23) : (p.authorizedSessions || 23);
      const authNumero      = auth ? auth.numeroAutorizacion : null;
      const authEps         = auth ? auth.epsNombre : null;
      const authCups        = auth ? auth.cupsNombre : null;

      const exceeded        = totalSessions > authorized;
      const remaining       = authorized - totalSessions;
      const indicatorColor  = exceeded ? 'var(--danger)' : (remaining <= 3 ? 'var(--accent-amber)' : 'var(--text-secondary)');
      
      let badgeStatus = '';
      if (exceeded) {
        badgeStatus = `<span class="badge-status" style="background-color:var(--danger-light);color:var(--danger);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Excedido</span>`;
      } else if (remaining <= 3 && remaining > 0) {
        badgeStatus = `<span class="badge-status" style="background-color:var(--accent-amber-light);color:var(--accent-amber);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Últimas ${remaining} sesiones</span>`;
      } else if (remaining === 0) {
        badgeStatus = `<span class="badge-status" style="background-color:var(--accent-amber-light);color:var(--accent-amber);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Agotadas</span>`;
      }

      const pct             = Math.min(100, Math.round((totalSessions / authorized) * 100));
      const barColor        = exceeded ? 'var(--danger)' : (pct >= 85 ? 'var(--accent-amber)' : 'var(--accent-emerald)');

      return `
        <div class="patient-card">
          <div class="patient-card-header" style="position: relative;">
            <div class="p-avatar">${initial}</div>
            <div style="flex: 1; padding-right: 3.5rem;">
              <h3>${p.name || 'Sin nombre'}</h3>
              <p class="subtitle" style="font-size:0.85rem;">${p.epsNombre || 'Sin EPS registrada'}</p>
            </div>
            <div class="patient-actions-top" style="position: absolute; right: 0; top: 0; display: flex; gap: 0.25rem;">
              <button class="btn-icon-sm" onclick="app.openPatientModal('${p.id}')" title="Editar Paciente" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deletePatient('${p.id}')" title="Eliminar Paciente" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">delete</span>
              </button>
            </div>
          </div>
          
          <div class="patient-detail-body">
            <div class="detail-item">
              <span class="material-symbols-rounded">medical_information</span>
              <p style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                ${p.diagnosis || (p.diagnosticoCodigo ? p.diagnosticoCodigo : 'Sin diagnóstico')}
              </p>
            </div>
            ${p.phone ? `
            <div class="detail-item">
              <span class="material-symbols-rounded">call</span>
              <p>${p.phone}</p>
            </div>` : ''}
            ${authNumero ? `
            <div class="detail-item">
              <span class="material-symbols-rounded">assignment_turned_in</span>
              <p>Auth: <strong>${authNumero}</strong> &bull; ${authEps || ''}</p>
            </div>` : ''}
            ${authCups ? `
            <div class="detail-item">
              <span class="material-symbols-rounded">local_hospital</span>
              <p style="display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${authCups}</p>
            </div>` : ''}
            <div class="detail-item" style="color:${indicatorColor};flex-direction:column;align-items:flex-start;gap:0.4rem;">
              <div style="display:flex;align-items:center;gap:0.5rem;width:100%;">
                <span class="material-symbols-rounded" style="color:${indicatorColor};">event_available</span>
                <p><strong>${totalSessions}</strong> / ${authorized} sesiones ${badgeStatus}</p>
              </div>
              <div style="width:100%;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.5s;"></div>
              </div>
            </div>
            <div class="detail-item">
              <span class="material-symbols-rounded">check_circle</span>
              <p>${completedSessions} sesiones ya realizadas</p>
            </div>
          </div>
          
          <div class="patient-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="app.openHistorial('${p.id}')">
              <span class="material-symbols-rounded">history</span>
              <span>Historial</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.openSessionModal('${p.id}', true)">
              <span class="material-symbols-rounded">add</span>
              <span>Nueva Sesión</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.viewPatientEvolution('${p.id}')">
              <span class="material-symbols-rounded">monitoring</span>
              <span>Evolución</span>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  populatePatientDropdowns() {
    const patientsOpts = this.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    // Modal Session patient select
    const selectSession = document.getElementById('s-patient');
    const prevSessionVal = selectSession.value;
    selectSession.innerHTML = '<option value="">Seleccione un paciente...</option>' + patientsOpts;
    if (prevSessionVal) selectSession.value = prevSessionVal;
    
    // Progress patient select
    const selectProgress = document.getElementById('progress-patient-select');
    const prevProgressVal = selectProgress.value;
    selectProgress.innerHTML = '<option value="">Selecciona un paciente...</option>' + patientsOpts;
    if (prevProgressVal) selectProgress.value = prevProgressVal;
  }

  // Patient Modals
  openPatientModal(patientId = null) {
    this.formPatient.reset();
    const titleEl = document.querySelector('#modal-patient .modal-header h2');
    
    if (patientId) {
      this.editingPatientId = patientId;
      if (titleEl) titleEl.textContent = 'Editar Paciente';
      
      const patient = this.patients.find(p => String(p.id) === String(patientId));
      if (patient) {
        document.getElementById('p-name').value = patient.name || '';
        document.getElementById('p-tipo-doc').value = patient.tipoDocumento || 'CC';
        document.getElementById('p-doc-num').value = patient.numeroDocumento || '';
        document.getElementById('p-phone').value = patient.phone || '';
        document.getElementById('p-email').value = patient.email || '';
        document.getElementById('p-dob').value = patient.dob || '';
        document.getElementById('p-gender').value = patient.gender || 'M';
        document.getElementById('p-authorized').value = patient.authorizedSessions || 23;
        document.getElementById('p-diagnosis').value = patient.diagnosis || '';
      }
    } else {
      this.editingPatientId = null;
      if (titleEl) titleEl.textContent = 'Registrar Nuevo Paciente';
    }
    
    this.modalPatient.classList.add('active');
  }

  closePatientModal() {
    this.modalPatient.classList.remove('active');
    this.editingPatientId = null;
  }

  handlePatientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value;
    const tipoDocumento = document.getElementById('p-tipo-doc').value;
    const numeroDocumento = document.getElementById('p-doc-num').value;
    const phone = document.getElementById('p-phone').value;
    const email = document.getElementById('p-email').value;
    const dob = document.getElementById('p-dob').value;
    const gender = document.getElementById('p-gender').value;
    const authorizedSessions = parseInt(document.getElementById('p-authorized').value) || 23;
    const diagnosis = document.getElementById('p-diagnosis').value;

    const patientData = {
      name,
      tipoDocumento,
      numeroDocumento,
      phone,
      email,
      dob,
      gender,
      authorizedSessions,
      diagnosis,
      assignedTherapistId: this.currentUser ? this.currentUser.uid : null,
      assignedTherapistName: this.currentUser ? (this.currentUser.displayName || this.currentUser.email) : 'Desconocido',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (this.editingPatientId) {
      db.collection('therapy_patients').doc(this.editingPatientId).update(patientData).then(() => {
        this.closePatientModal();
        this.showToast(`Paciente "${name}" actualizado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error updating patient: ", error);
        this.showToast(`Error al actualizar paciente.`, 'error');
      });
    } else {
      patientData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('therapy_patients').add(patientData).then(() => {
        this.closePatientModal();
        this.showToast(`Paciente "${name}" registrado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error adding patient: ", error);
        this.showToast(`Error al guardar paciente.`, 'error');
      });
    }
  }

  deletePatient(patientId) {
    const patient = this.patients.find(p => String(p.id) === String(patientId));
    if (!patient) return;
    if (confirm(`¿Estás seguro de que deseas eliminar al paciente "${patient.name}"? Esta acción no se puede deshacer y conservará su historial de sesiones.`)) {
      db.collection('therapy_patients').doc(patientId).delete().then(() => {
        this.showToast(`Paciente "${patient.name}" eliminado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error deleting patient: ", error);
        this.showToast(`Error al eliminar el paciente.`, 'error');
      });
    }
  }

  renderTerapeutasList() {
    if (this.loadingTerapeutas) {
      this.terapeutasGridContainer.innerHTML = Array(3).fill(0).map(() => `
        <div class="patient-card skeleton">
          <div class="patient-card-header">
            <div class="p-avatar skeleton-shimmer" style="background: var(--border-color); animation: pulse 1.5s infinite ease-in-out;"></div>
            <div style="flex: 1;">
              <div class="skeleton-line skeleton-shimmer" style="height: 1.25rem; width: 70%; background: var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; animation: pulse 1.5s infinite ease-in-out;"></div>
              <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 40%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
            </div>
          </div>
        </div>
      `).join('');
      return;
    }

    const searchVal = this.terapeutaSearchInput.value.toLowerCase();
    
    const filtered = this.terapeutas.filter(t =>
      (t.nombres || '').toLowerCase().includes(searchVal) ||
      (t.apellidos || '').toLowerCase().includes(searchVal) ||
      (t.especialidad || '').toLowerCase().includes(searchVal) ||
      (t.registro && t.registro.toLowerCase().includes(searchVal))
    );

    if (filtered.length === 0) {
      this.terapeutasGridContainer.innerHTML = `
        <div class="empty-state col-12" style="grid-column: span 3;">
          <span class="material-symbols-rounded">person_search</span>
          <p>No se encontraron terapeutas que coincidan con tu búsqueda.</p>
        </div>`;
      return;
    }

    this.terapeutasGridContainer.innerHTML = filtered.map(t => {
      const nombreCompleto = `${t.nombres || ''} ${t.apellidos || ''}`.trim();
      const initial = (t.nombres || '?').charAt(0).toUpperCase();

      return `
        <div class="patient-card">
          <div class="patient-card-header" style="position: relative;">
            <div class="p-avatar" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); color: white;">${initial}</div>
            <div style="flex: 1; padding-right: 3.5rem;">
              <h3>${nombreCompleto}</h3>
              <p class="subtitle" style="font-size:0.85rem;">${t.especialidad || 'Sin especialidad'}</p>
            </div>
            <div class="patient-actions-top" style="position: absolute; right: 0; top: 0; display: flex; gap: 0.25rem;">
              <button class="btn-icon-sm" onclick="app.openTerapeutaModal('${t.id}')" title="Editar Terapeuta" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deleteTerapeuta('${t.id}')" title="Eliminar Terapeuta" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">delete</span>
              </button>
            </div>
          </div>
          
          <div class="patient-detail-body">
            <div class="detail-item">
              <span class="material-symbols-rounded">badge</span>
              <p>Documento: <strong>${t.tipoDocumento || 'CC'}-${t.numeroDocumento || ''}</strong></p>
            </div>
            <div class="detail-item">
              <span class="material-symbols-rounded">license</span>
              <p>Registro: <strong>${t.registro || 'No registrado'}</strong></p>
            </div>
            <div class="detail-item">
              <span class="material-symbols-rounded">mail</span>
              <p>${t.contacto || 'Sin contacto'}</p>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  openTerapeutaModal(terapeutaId = null) {
    this.formTerapeuta.reset();
    const titleEl = document.querySelector('#modal-terapeuta .modal-header h2');
    
    if (terapeutaId) {
      this.editingTerapeutaId = terapeutaId;
      if (titleEl) titleEl.textContent = 'Editar Terapeuta';
      
      const terapeuta = this.terapeutas.find(t => String(t.id) === String(terapeutaId));
      if (terapeuta) {
        document.getElementById('t-nombres').value = terapeuta.nombres || '';
        document.getElementById('t-apellidos').value = terapeuta.apellidos || '';
        document.getElementById('t-tipo-doc').value = terapeuta.tipoDocumento || 'CC';
        document.getElementById('t-doc-num').value = terapeuta.numeroDocumento || '';
        document.getElementById('t-especialidad').value = terapeuta.especialidad || '';
        document.getElementById('t-registro').value = terapeuta.registro || '';
        document.getElementById('t-contacto').value = terapeuta.contacto || '';
      }
    } else {
      this.editingTerapeutaId = null;
      if (titleEl) titleEl.textContent = 'Registrar Nuevo Terapeuta';
    }
    
    this.modalTerapeuta.classList.add('active');
  }

  closeTerapeutaModal() {
    this.modalTerapeuta.classList.remove('active');
    this.editingTerapeutaId = null;
  }

  handleTerapeutaSubmit(e) {
    e.preventDefault();
    const nombres = document.getElementById('t-nombres').value;
    const apellidos = document.getElementById('t-apellidos').value;
    const tipoDocumento = document.getElementById('t-tipo-doc').value;
    const numeroDocumento = document.getElementById('t-doc-num').value;
    const especialidad = document.getElementById('t-especialidad').value;
    const registro = document.getElementById('t-registro').value;
    const contacto = document.getElementById('t-contacto').value;

    const terapeutaData = {
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      especialidad,
      registro,
      contacto,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (this.editingTerapeutaId) {
      db.collection('therapy_terapeutas').doc(this.editingTerapeutaId).update(terapeutaData).then(() => {
        this.closeTerapeutaModal();
        this.showToast(`Terapeuta "${nombres}" actualizado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error updating therapist: ", error);
        this.showToast(`Error al actualizar terapeuta.`, 'error');
      });
    } else {
      terapeutaData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('therapy_terapeutas').add(terapeutaData).then(() => {
        this.closeTerapeutaModal();
        this.showToast(`Terapeuta "${nombres}" registrado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error adding therapist: ", error);
        this.showToast(`Error al guardar terapeuta.`, 'error');
      });
    }
  }

  deleteTerapeuta(terapeutaId) {
    const terapeuta = this.terapeutas.find(t => String(t.id) === String(terapeutaId));
    if (!terapeuta) return;
    if (confirm(`¿Estás seguro de que deseas eliminar al terapeuta "${terapeuta.nombres} ${terapeuta.apellidos}"? Esta acción no se puede deshacer.`)) {
      db.collection('therapy_terapeutas').doc(terapeutaId).delete().then(() => {
        this.showToast(`Terapeuta "${terapeuta.nombres}" eliminado correctamente.`, 'success');
      }).catch(error => {
        console.error("Error deleting therapist: ", error);
        this.showToast(`Error al eliminar terapeuta.`, 'error');
      });
    }
  }

  // Session & Appointment Modals
  openSessionModal(patientId = null, preMarkCompleted = true, sessionId = null) {
    this.formSession.reset();
    this.tempSoapData = null; // Reiniciar datos SOAP temporales
    
    // Set default date and time
    const today = new Date();
    document.getElementById('s-date').value = this.formatDateISO(today);
    document.getElementById('s-time').value = today.toTimeString().substring(0, 5);
    
    // Reset badges
    document.getElementById('s-pain').value = 5;
    document.getElementById('pain-badge').textContent = '5';
    document.getElementById('s-mobility').value = 50;
    document.getElementById('mobility-badge').textContent = '50%';
    document.getElementById('s-mood').value = 3;
    document.getElementById('mood-badge').textContent = '3';

    if (sessionId) {
      this.editingSessionId = sessionId;
      document.getElementById('session-modal-title').textContent = 'Editar Sesión / Cita';
      
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        document.getElementById('s-patient').value = session.patientId || '';
        document.getElementById('s-date').value = session.date || '';
        document.getElementById('s-time').value = session.time || '';
        this.sIsCompleted.checked = session.isCompleted || false;
        document.getElementById('s-notes').value = session.notes || '';
        
        // Cargar datos SOAP existentes para edición
        this.tempSoapData = {
          soapS: session.soapS || '',
          soapO: session.soapO || '',
          soapA: session.soapA || '',
          soapP: session.soapP || ''
        };

        if (session.isCompleted) {
          document.getElementById('s-pain').value = session.pain ?? 5;
          document.getElementById('pain-badge').textContent = session.pain ?? 5;
          document.getElementById('s-mobility').value = session.mobility ?? 50;
          document.getElementById('mobility-badge').textContent = (session.mobility ?? 50) + '%';
          document.getElementById('s-mood').value = session.mood ?? 3;
          document.getElementById('mood-badge').textContent = session.mood ?? 3;
        }
      }
    } else {
      this.editingSessionId = null;
      document.getElementById('session-modal-title').textContent = preMarkCompleted ? 'Registrar Sesión Realizada' : 'Programar Nueva Sesión';
      if (patientId) {
        document.getElementById('s-patient').value = patientId;
      }
      this.sIsCompleted.checked = preMarkCompleted;
    }
    
    this.toggleSessionModalFields();
    this.modalSession.classList.add('active');
  }

  closeSessionModal() {
    this.modalSession.classList.remove('active');
    this.editingSessionId = null;
    this.tempSoapData = null; // Limpiar al cerrar
  }

  handleSessionSubmit(e) {
    e.preventDefault();
    const patientId = document.getElementById('s-patient').value;
    const date = document.getElementById('s-date').value;
    const time = document.getElementById('s-time').value;
    const isCompleted = this.sIsCompleted.checked;
    
    const sessionData = {
      patientId,
      date,
      time,
      isCompleted,
      therapistId: this.currentUser ? this.currentUser.uid : null,
      therapistName: this.currentUser ? (this.currentUser.displayName || this.currentUser.email) : 'Desconocido',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isCompleted) {
      sessionData.pain = parseInt(document.getElementById('s-pain').value);
      sessionData.mobility = parseInt(document.getElementById('s-mobility').value);
      sessionData.mood = parseInt(document.getElementById('s-mood').value);
      sessionData.notes = document.getElementById('s-notes').value;

      // Adjuntar datos SOAP estructurados
      if (this.tempSoapData) {
        sessionData.soapS = this.tempSoapData.soapS || '';
        sessionData.soapO = this.tempSoapData.soapO || '';
        sessionData.soapA = this.tempSoapData.soapA || '';
        sessionData.soapP = this.tempSoapData.soapP || '';
      }
    } else {
      sessionData.notes = document.getElementById('s-notes').value;
    }

    if (this.editingSessionId) {
      db.collection('therapy_sessions').doc(this.editingSessionId).update(sessionData).then(() => {
        this.closeSessionModal();
        this.showToast('Sesión actualizada con éxito.', 'success');
      }).catch(error => {
        console.error("Error updating session: ", error);
        this.showToast(`Error al actualizar sesión.`, 'error');
      });
    } else {
      sessionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('therapy_sessions').add(sessionData).then(() => {
        this.closeSessionModal();
        this.showToast(isCompleted ? 'Sesión guardada con éxito.' : 'Sesión programada en la agenda.', 'success');
      }).catch(error => {
        console.error("Error adding session: ", error);
        this.showToast(`Error al guardar sesión.`, 'error');
      });
    }
  }

  deleteSession(sessionId) {
    if (confirm("¿Estás seguro de que deseas eliminar esta sesión/cita? Esta acción no se puede deshacer.")) {
      db.collection('therapy_sessions').doc(sessionId).delete().then(() => {
        this.showToast("Sesión eliminada correctamente.", "success");
      }).catch(error => {
        console.error("Error deleting session: ", error);
        this.showToast("Error al eliminar la sesión.", "error");
      });
    }
  }

  // Calendar Engine
  changeMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderDatePicker();
  }

  renderDatePicker() {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    this.dpMonthTitle.textContent = `${monthNames[month]} ${year}`;
    this.dpDaysGrid.innerHTML = '';
    
    // First day of month
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('span');
      cell.classList.add('dp-day', 'dp-day-empty');
      this.dpDaysGrid.appendChild(cell);
    }
    
    const todayStr = this.formatDateISO(new Date());
    
    // Populate calendar days
    for (let day = 1; day <= totalDays; day++) {
      const btn = document.createElement('button');
      btn.classList.add('dp-day');
      btn.textContent = day;
      
      const dayDate = new Date(year, month, day);
      const dayDateStr = this.formatDateISO(dayDate);
      
      if (dayDateStr === todayStr) {
        btn.classList.add('today');
      }
      
      if (dayDateStr === this.selectedDateStr) {
        btn.classList.add('selected');
      }
      
      // Events indicator dot
      const hasEvents = this.sessions.some(s => s.date === dayDateStr);
      if (hasEvents) {
        btn.classList.add('has-events');
      }
      
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dp-day.selected').forEach(d => d.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedDateStr = dayDateStr;
        this.renderAgendaForSelectedDay();
      });
      
      this.dpDaysGrid.appendChild(btn);
    }
  }

  renderAgendaForSelectedDay() {
    // Format visual header date
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateObj = new Date(this.selectedDateStr + 'T00:00:00');
    
    const capitalizedDay = dateObj.toLocaleDateString('es-ES', options);
    this.selectedDayTitle.textContent = capitalizedDay.charAt(0).toUpperCase() + capitalizedDay.slice(1);

    if (this.loadingSessions) {
      this.selectedDayCount.textContent = 'Cargando...';
      this.agendaSessionsList.innerHTML = Array(2).fill(0).map(() => `
        <div class="agenda-item-card skeleton" style="display: flex; gap: 1rem; align-items: center; padding: 1.25rem;">
          <div class="agenda-card-time skeleton-shimmer" style="height: 3.5rem; width: 4.5rem; background: var(--border-color); border-radius: 12px; animation: pulse 1.5s infinite ease-in-out;"></div>
          <div class="agenda-card-detail" style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
            <div class="skeleton-line skeleton-shimmer" style="height: 1.15rem; width: 50%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
            <div class="skeleton-line skeleton-shimmer" style="height: 0.85rem; width: 85%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
          </div>
          <div class="agenda-card-actions" style="width: 5rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div class="skeleton-line skeleton-shimmer" style="height: 1.5rem; width: 100%; background: var(--border-color); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
          </div>
        </div>
      `).join('');
      return;
    }

    const daySessions = this.sessions.filter(s => s.date === this.selectedDateStr);
    daySessions.sort((a, b) => a.time.localeCompare(b.time));
    
    this.selectedDayCount.textContent = `${daySessions.length} Cita${daySessions.length === 1 ? '' : 's'}`;

    if (daySessions.length === 0) {
      this.agendaSessionsList.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">calendar_today</span>
          <p>No hay citas registradas en este día.</p>
        </div>`;
      return;
    }

    this.agendaSessionsList.innerHTML = daySessions.map(session => {
      const patient = this.patients.find(p => String(p.id) === String(session.patientId)) || { name: 'Paciente Desconocido', diagnosis: 'No especificado' };
      const statusText = session.isCompleted ? 'Completada' : 'Pendiente';
      const badgeClass = session.isCompleted ? 'status-completed' : 'status-pending';

      return `
        <div class="agenda-item-card">
          <div class="agenda-card-time">
            ${session.time}
            <span>Hora</span>
          </div>
          <div class="agenda-card-detail">
            <h3>${patient.name}</h3>
            <p><strong>Diagnóstico:</strong> ${patient.diagnosis.substring(0, 90)}...</p>
            ${session.isCompleted ? `<p class="notes-preview"><strong>Evolución:</strong> ${session.notes || 'Sin notas'}</p>` : ''}
          </div>
          <div class="agenda-card-actions" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="badge-status ${badgeClass}">${statusText}</span>
              <button class="btn-icon-sm" onclick="app.openSessionModal(null, ${session.isCompleted}, '${session.id}')" title="Editar Sesión" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 0.25rem; border-radius: 6px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.1rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deleteSession('${session.id}')" title="Eliminar Sesión" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; padding: 0.25rem; border-radius: 6px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.1rem;">delete</span>
              </button>
            </div>
            ${!session.isCompleted ? `
            <button class="btn btn-secondary btn-sm" onclick="app.completeSessionDirectly('${session.id}')" title="Marcar como realizada">
              <span class="material-symbols-rounded">check</span>
            </button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  completeSessionDirectly(sessionId) {
    const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      const session = this.sessions[sessionIndex];
      // Open modal prefilled to fill note/ranges
      this.openSessionModal(session.patientId, true);
      // Remove original non-completed session so the new registration replaces it
      this.sessions.splice(sessionIndex, 1);
      this.saveToStorage();
    }
  }

  // Progress/Evolution View Visualizer & Canvas Graph
  handleProgressPatientChange() {
    const patientId = this.progressPatientSelect.value;
    if (!patientId) {
      this.evolutionContent.style.display = 'none';
      this.evolutionEmptyPrompt.style.display = 'flex';
      return;
    }

    this.evolutionContent.style.display = 'block';
    this.evolutionEmptyPrompt.style.display = 'none';

    const pSessions = this.sessions.filter(s => String(s.patientId) === String(patientId) && s.isCompleted);
    // Sort chronologically
    pSessions.sort((a, b) => a.date.localeCompare(b.date));

    // Stats calculations
    if (pSessions.length === 0) {
      this.valDolor.textContent = '--';
      this.valMovilidad.textContent = '--';
      this.valAnimo.textContent = '--';
      this.valSesiones.textContent = '0';
      this.notesEvolutionTimeline.innerHTML = `<div class="empty-state"><p>Este paciente no tiene sesiones completadas registradas.</p></div>`;
      
      // Clear chart
      const canvas = document.getElementById('evolution-chart');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const latest = pSessions[pSessions.length - 1];
    
    // Color dolor
    this.valDolor.textContent = latest.pain;
    this.valDolor.className = 'metric-num ' + (latest.pain > 6 ? 'text-danger' : latest.pain > 3 ? 'text-warning' : 'text-success');
    
    this.valMovilidad.textContent = latest.mobility;
    this.valAnimo.textContent = latest.mood;
    this.valSesiones.textContent = pSessions.length;

    // Timeline notes list
    this.notesEvolutionTimeline.innerHTML = [...pSessions].reverse().map((s, idx) => {
      const displayDate = new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      const therapist = s.therapistName || s.terapeutaNombre || 'Desconocido';
      return `
        <div class="note-item">
          <div class="note-header">
            <span>Sesión #${pSessions.length - idx} - ${displayDate} (${s.time})</span>
            <span>Ánimo: ${s.mood}/5</span>
          </div>
          <div class="note-body">
            ${s.notes || 'Sin anotaciones clínicas.'}
          </div>
          <div class="note-metrics">
            <span style="color: var(--danger)">Dolor: ${s.pain}/10</span>
            <span style="color: var(--accent-emerald)">Movilidad: ${s.mobility}%</span>
            <span style="color: var(--text-secondary); margin-left: auto; display: flex; align-items: center; gap: 0.25rem; font-weight: 500;">
              <span class="material-symbols-rounded" style="font-size: 1rem;">person</span>
              ${therapist}
            </span>
          </div>
        </div>`;
    }).join('');

    // Draw Chart
    this.renderEvolutionChart(pSessions);
  }

  async renderEvolutionChart(pSessions = null) {
    const canvas = document.getElementById('evolution-chart');
    const { default: drawChart } = await import('./evolutionChart.js');
    drawChart(canvas, this.progressPatientSelect.value, this.sessions, pSessions);
  }

  // Utilities
  formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }



  // RIPS Generator Modals & Logic
  openRipsModal() {
    const modal = document.getElementById('modal-rips');
    if (!modal) return;
    
    // Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('rips-fecha-inicio').value = this.formatDateISO(firstDay);
    document.getElementById('rips-fecha-fin').value = this.formatDateISO(today);
    
    // Set default Nit & Prestador
    document.getElementById('rips-nit').value = '900123456-1';
    document.getElementById('rips-prestador').value = 'Kallpa Terapias SAS';
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }

  closeRipsModal() {
    const modal = document.getElementById('modal-rips');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  }

  generateRipsPreview() {
    const nit = document.getElementById('rips-nit').value.trim();
    const prestador = document.getElementById('rips-prestador').value.trim();
    const fechaInicio = document.getElementById('rips-fecha-inicio').value;
    const fechaFin = document.getElementById('rips-fecha-fin').value;

    if (!nit || !prestador || !fechaInicio || !fechaFin) {
      this.showToast('Por favor complete todos los campos de configuración de RIPS.', 'warning');
      return;
    }

    // Filter sessions
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');
    
    const validSessions = this.sessions.filter(s => {
      if (!s.isCompleted && s.estado !== 'Atendida') return false;
      const d = new Date((s.date || '2000-01-01') + 'T00:00:00');
      return d >= inicio && d <= fin;
    });

    const activePatientIds = [...new Set(validSessions.map(s => s.patientId || s.pacienteId))];
    const validPatients = this.patients.filter(p => activePatientIds.includes(p.id));

    // Calculate total value
    const totalVal = validSessions.reduce((sum, s) => sum + Number(s.valor || 0), 0);

    // Update preview container
    const previewEl = document.getElementById('rips-preview');
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.75rem; font-weight: 700; color: var(--primary);">Resumen de Registros a Generar</h4>
          <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="padding: 0.5rem 0;">Archivo</th>
                <th style="padding: 0.5rem 0;">Descripción</th>
                <th style="padding: 0.5rem 0; text-align: right;">Registros</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.5rem 0; font-weight: 600;">CT.txt</td>
                <td style="padding: 0.5rem 0; color: var(--text-secondary);">Archivo de Control</td>
                <td style="padding: 0.5rem 0; text-align: right; font-weight: 700;">1</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.5rem 0; font-weight: 600;">AF.txt</td>
                <td style="padding: 0.5rem 0; color: var(--text-secondary);">Archivo de Transacciones (Usuarios)</td>
                <td style="padding: 0.5rem 0; text-align: right; font-weight: 700;">${validPatients.length}</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.5rem 0; font-weight: 600;">AP.txt</td>
                <td style="padding: 0.5rem 0; color: var(--text-secondary);">Archivo de Procedimientos (Terapias)</td>
                <td style="padding: 0.5rem 0; text-align: right; font-weight: 700;">${validSessions.length}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; font-weight: 700;">
            <span>Valor Total Facturado:</span>
            <span style="color: var(--accent-emerald);">$${totalVal.toLocaleString('es-CO')}</span>
          </div>
        </div>`;
    }

    // Enable download buttons
    ['btn-dl-ct', 'btn-dl-af', 'btn-dl-ap', 'btn-dl-all'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.removeAttribute('disabled');
    });

    this.showToast('Previsualización de RIPS generada.', 'success');
  }

  downloadRipsFile(type) {
    const nit = document.getElementById('rips-nit').value.trim();
    const fechaInicio = document.getElementById('rips-fecha-inicio').value;
    const fechaFin = document.getElementById('rips-fecha-fin').value;

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');

    const validSessions = this.sessions.filter(s => {
      if (!s.isCompleted && s.estado !== 'Atendida') return false;
      const d = new Date((s.date || '2000-01-01') + 'T00:00:00');
      return d >= inicio && d <= fin;
    });

    const activePatientIds = [...new Set(validSessions.map(s => s.patientId || s.pacienteId))];
    const validPatients = this.patients.filter(p => activePatientIds.includes(p.id));
    const totalVal = validSessions.reduce((sum, s) => sum + Number(s.valor || 0), 0);

    if (type === 'AF') {
      const content = generarAF(validPatients, this.autorizaciones, nit, fechaInicio, fechaFin);
      descargarTxt(content, `AF${fechaInicio.replace(/-/g,'')}.txt`);
    } else if (type === 'AP') {
      const content = generarAP(validSessions, validPatients, this.autorizaciones, nit, fechaInicio, fechaFin);
      descargarTxt(content, `AP${fechaInicio.replace(/-/g,'')}.txt`);
    } else if (type === 'CT') {
      const content = generarCT(nit, fechaInicio, fechaFin, validPatients.length, validSessions.length, totalVal);
      descargarTxt(content, `CT${fechaInicio.replace(/-/g,'')}.txt`);
    }
    
    this.showToast(`Archivo ${type}.txt descargado.`, 'success');
  }

  downloadRipsAll() {
    this.downloadRipsFile('CT');
    setTimeout(() => this.downloadRipsFile('AF'), 300);
    setTimeout(() => this.downloadRipsFile('AP'), 600);
  }

  // Gemini AI Modals & Logic
  openGeminiModal() {
    const key = localStorage.getItem('gemini_api_key') || '';
    this.geminiApiKeyInput.value = key;
    this.modalGeminiConfig.classList.add('active');
  }

  closeGeminiModal() {
    this.modalGeminiConfig.classList.remove('active');
  }

  handleGeminiConfigSubmit(e) {
    e.preventDefault();
    const key = this.geminiApiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('gemini_api_key', key);
      this.showToast('API Key de Gemini guardada correctamente.', 'success');
      this.closeGeminiModal();
    }
  }

  async optimizeNotesWithAI() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      this.showToast('Por favor, configura tu API Key de Gemini.', 'warning');
      this.openGeminiModal();
      return;
    }

    const patientId = document.getElementById('s-patient').value;
    if (!patientId) {
      this.showToast('Por favor, selecciona un paciente primero.', 'warning');
      return;
    }

    const notesField = document.getElementById('s-notes');
    const notesText = notesField.value.trim();
    if (!notesText) {
      this.showToast('Escribe notas rápidas o palabras clave primero.', 'warning');
      return;
    }

    const patient = this.patients.find(p => String(p.id) === String(patientId));
    const diagnosis = patient ? patient.diagnosis : 'No especificado';
    const pain = document.getElementById('s-pain').value;
    const mobility = document.getElementById('s-mobility').value;
    const mood = document.getElementById('s-mood').value;

    const btn = this.btnOptimizeNotes;
    const originalContent = btn.innerHTML;
    
    // Set loading state
    btn.classList.add('loading');
    btn.disabled = true;
    
    const iconSpan = btn.querySelector('span');
    const textSpan = btn.querySelector('span').nextElementSibling;
    if (iconSpan) iconSpan.textContent = 'sync';
    if (textSpan) textSpan.textContent = 'Procesando...';

    try {
      const prompt = `Eres un asistente experto en redacción clínica para fisioterapia y terapia ocupacional.
Tu tarea es convertir las notas rápidas de una sesión clínica en una nota formal estructurada en el formato estándar SOAP (Subjetivo, Objetivo, Análisis, Plan).

Contexto del Paciente:
- Diagnóstico: ${diagnosis}
- Dolor en esta sesión: ${pain}/10
- Rango de movilidad: ${mobility}%
- Estado de ánimo del paciente: ${mood}/5

Notas rápidas del terapeuta:
"${notesText}"

Debes devolver obligatoriamente un objeto JSON con las siguientes claves:
- "soapS": Notas subjetivas (lo que refiere el paciente, sensaciones, dolor autoinformado).
- "soapO": Mediciones objetivas, rango de movilidad, ejercicios realizados en la sesión, sets, repeticiones y observaciones cuantitativas.
- "soapA": Análisis clínico comparativo y evolución respecto a sesiones anteriores.
- "soapP": Plan detallado y enfoque terapéutico para las siguientes sesiones.
- "notes": Texto consolidado y formateado de la nota SOAP completa para visualización rápida.

Por favor, redacta de forma muy profesional y técnica en español.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const jsonText = data.candidates[0].content.parts[0].text.trim();
        const soapObj = JSON.parse(jsonText);
        
        this.tempSoapData = {
          soapS: soapObj.soapS || '',
          soapO: soapObj.soapO || '',
          soapA: soapObj.soapA || '',
          soapP: soapObj.soapP || ''
        };

        notesField.value = soapObj.notes || `${soapObj.soapS}\n\n${soapObj.soapO}\n\n${soapObj.soapA}\n\n${soapObj.soapP}`;
        this.showToast('Notas clínicas optimizadas con IA.', 'success');
      } else {
        throw new Error('La respuesta de la IA no tiene el formato esperado.');
      }

    } catch (error) {
      console.error(error);
      this.showToast('Error al optimizar con IA: ' + error.message, 'error');
    } finally {
      // Restore button state
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'warning') icon = 'warning';
    else if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-rounded toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.9)';
      setTimeout(() => toast.remove(), 300);
    }, 3700);
  }

  exportData() {
    const data = JSON.stringify({
      patients: this.patients,
      sessions: this.sessions
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_terapias_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Copia de seguridad exportada con éxito.', 'info');
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.patients || !data.sessions) {
          throw new Error('El archivo no contiene la estructura requerida.');
        }
        this.patients = data.patients;
        this.sessions = data.sessions;
        this.saveToStorage();
        this.navigate(this.currentView || 'dashboard');
        this.updateStats();
        this.renderPatientsList();
        this.renderDatePicker();
        this.renderAgendaForSelectedDay();
        this.populatePatientDropdowns();
        this.showToast('Importación exitosa. Datos restaurados.', 'success');
      } catch (err) {
        console.error('Error al importar:', err);
        this.showToast('El archivo no es un respaldo válido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // =============================================
  // AUTORIZACIONES VIEW
  // =============================================
  renderAutorizaciones() {
    const container = document.getElementById('autorizaciones-grid');
    if (!container) return;

    if (this.autorizaciones.length === 0) {
      container.innerHTML = `
        <div class="auth-empty-state">
          <span class="material-symbols-rounded">assignment_late</span>
          <p>No hay autorizaciones registradas.</p>
        </div>`;
      return;
    }

    // Stats summary
    const totalAuths   = this.autorizaciones.length;
    const totalSes     = this.autorizaciones.reduce((s, a) => s + (a.totalSesiones || 0), 0);
    const usedSes      = this.autorizaciones.reduce((s, a) => {
      const count = this.sessions.filter(se =>
        String(se.patientId) === String(a.pacienteId || a.patientId) &&
        String(se.autorizacionId) === String(a.id)
      ).length;
      return s + count;
    }, 0);
    const remaining    = totalSes - usedSes;

    const summaryEl = document.getElementById('auth-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">assignment</span>
          <div><strong>${totalAuths}</strong><small>Autorizaciones</small></div>
        </div>
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">event_note</span>
          <div><strong>${totalSes}</strong><small>Sesiones totales</small></div>
        </div>
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">check_circle</span>
          <div><strong>${usedSes}</strong><small>Realizadas</small></div>
        </div>
        <div class="auth-stat-card ${remaining <= 0 ? 'auth-stat-danger' : remaining <= 3 ? 'auth-stat-warn' : ''}">
          <span class="material-symbols-rounded">hourglass_bottom</span>
          <div><strong>${remaining}</strong><small>Restantes</small></div>
        </div>`;
    }

    // Authorization cards
    container.innerHTML = this.autorizaciones.map(auth => {
      const pacienteId   = auth.pacienteId || auth.patientId;
      const patient      = this.patients.find(p => String(p.id) === String(pacienteId));
      const nombre       = auth.pacienteNombre || (patient ? patient.name : 'Paciente desconocido');
      const initial      = nombre.charAt(0).toUpperCase();

      const sesUsadas    = this.sessions.filter(s =>
        String(s.patientId) === String(pacienteId) &&
        String(s.autorizacionId) === String(auth.id)
      ).length;

      // Fallback: contar todas las sesiones del paciente si no hay autorizacionId
      const sesCount     = sesUsadas > 0 ? sesUsadas :
        this.sessions.filter(s => String(s.patientId) === String(pacienteId) && s.isCompleted).length;

      const total        = auth.totalSesiones || 10;
      const restantes    = Math.max(0, total - sesCount);
      const pct          = Math.min(100, Math.round((sesCount / total) * 100));
      const isExceeded   = sesCount > total;
      const isAlmostDone = !isExceeded && pct >= 80;
      const barColor     = isExceeded ? 'var(--danger)' : isAlmostDone ? 'var(--accent-amber)' : 'var(--accent-emerald)';

      let statusBadge;
      if (isExceeded)        statusBadge = `<span class="auth-badge auth-badge-danger">Excedida</span>`;
      else if (pct >= 100)   statusBadge = `<span class="auth-badge auth-badge-done">Completada</span>`;
      else if (isAlmostDone) statusBadge = `<span class="auth-badge auth-badge-warn">Por agotar</span>`;
      else                   statusBadge = `<span class="auth-badge auth-badge-active">Activa</span>`;

      return `
        <div class="auth-card">
          <div class="auth-card-header">
            <div class="p-avatar">${initial}</div>
            <div class="auth-card-info">
              <h3>${nombre}</h3>
              <p>${auth.epsNombre || 'Sin EPS'}</p>
            </div>
            ${statusBadge}
          </div>

          <div class="auth-card-body">
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">tag</span>
              <div>
                <small>N° Autorización</small>
                <strong>${auth.numeroAutorizacion || auth.id}</strong>
              </div>
            </div>
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">local_hospital</span>
              <div>
                <small>Código CUPS</small>
                <strong>${auth.cupsCodigo || '—'}</strong>
              </div>
            </div>
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">description</span>
              <div>
                <small>Procedimiento</small>
                <span style="font-size:0.82rem;">${auth.cupsNombre || '—'}</span>
              </div>
            </div>
          </div>

          <div class="auth-progress-section">
            <div class="auth-progress-labels">
              <span>${sesCount} de ${total} sesiones realizadas</span>
              <span style="color:${barColor};font-weight:700;">${restantes} restantes</span>
            </div>
            <div class="auth-progress-bar">
              <div class="auth-progress-fill" style="width:${pct}%;background:${barColor};"></div>
            </div>
          </div>

          <div class="auth-card-footer">
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('patients')">
              <span class="material-symbols-rounded">person</span>
              <span>Ver Paciente</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.openSessionModal('${pacienteId}', true)">
              <span class="material-symbols-rounded">add</span>
              <span>Nueva Sesión</span>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  handleLogout() {
    if (!confirm('¿Deseas cerrar sesión?')) return;
    auth.signOut().then(() => {
      // La pantalla de login se mostrará automáticamente via onAuthStateChanged
    }).catch(err => {
      this.showToast('Error al cerrar sesión: ' + err.message, 'error');
    });
  }
}

// =============================================
// AUTH CONTROLLER — Gestión de Login / Logout
// =============================================

function initLoginEvents() {
  const formLogin = document.getElementById('form-login');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const btnLoginText = document.getElementById('btn-login-text');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnForgot = document.getElementById('btn-forgot-password');
  const forgotSuccess = document.getElementById('forgot-success');
  const btnTogglePass = document.getElementById('btn-toggle-password');
  const eyeIcon = document.getElementById('eye-icon');

  // Mostrar/ocultar contraseña
  if (btnTogglePass) {
    btnTogglePass.addEventListener('click', () => {
      const isPass = loginPassword.type === 'password';
      loginPassword.type = isPass ? 'text' : 'password';
      eyeIcon.textContent = isPass ? 'visibility_off' : 'visibility';
    });
  }

  // Submit login
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      loginError.style.display = 'none';
      btnLoginSubmit.disabled = true;
      btnLoginText.textContent = 'Verificando...';

      auth.signInWithEmailAndPassword(email, password)
        .catch((err) => {
          btnLoginSubmit.disabled = false;
          btnLoginText.textContent = 'Iniciar Sesión';
          let msg = 'Error al iniciar sesión. Inténtalo de nuevo.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = 'Correo o contraseña incorrectos.';
          } else if (err.code === 'auth/too-many-requests') {
            msg = 'Demasiados intentos. Espera unos minutos.';
          } else if (err.code === 'auth/invalid-email') {
            msg = 'El correo electrónico no es válido.';
          }
          loginError.textContent = msg;
          loginError.style.display = 'flex';
          loginPassword.value = '';
          loginPassword.focus();
        });
    });
  }

  // Olvidé mi contraseña
  if (btnForgot) {
    btnForgot.addEventListener('click', () => {
      const email = loginEmail.value.trim();
      if (!email) {
        loginError.textContent = 'Ingresa tu correo electrónico primero.';
        loginError.style.display = 'flex';
        loginEmail.focus();
        return;
      }
      auth.sendPasswordResetEmail(email)
        .then(() => {
          loginError.style.display = 'none';
          forgotSuccess.style.display = 'flex';
          setTimeout(() => forgotSuccess.style.display = 'none', 5000);
        })
        .catch((err) => {
          let msg = 'No se pudo enviar el correo de recuperación.';
          if (err.code === 'auth/user-not-found') msg = 'No existe una cuenta con ese correo.';
          loginError.textContent = msg;
          loginError.style.display = 'flex';
        });
    });
  }
}

// Global app instance
let app;

window.addEventListener('DOMContentLoaded', () => {
  initLoginEvents();

  const loginScreen = document.getElementById('login-screen');
  const appContainer = document.getElementById('app-container');

  auth.onAuthStateChanged((user) => {
    if (user) {
      // Usuario autenticado — mostrar la app
      loginScreen.classList.add('login-exit');
      setTimeout(() => {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'grid';
        if (!app) {
          app = new TherapyApp(user);
          window.app = app;
        } else {
          app.currentUser = user;
          app.updateProfileUI();
        }
      }, 400);
    } else {
      // No autenticado — mostrar login
      appContainer.style.display = 'none';
      loginScreen.style.display = 'flex';
      loginScreen.classList.remove('login-exit');
      app = null;
    }
  });
});
