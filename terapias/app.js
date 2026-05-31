// App State and Local Storage Keys
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
  constructor() {
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
  }

  checkOnlineStatus() {
    if (navigator.onLine) {
      this.offlineIndicator.classList.remove('visible');
    } else {
      this.offlineIndicator.classList.add('visible');
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
      const patient = this.patients.find(p => p.id === session.patientId) || { name: 'Paciente Desconocido', diagnosis: 'No especificado' };
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

  viewPatientEvolution(patientId) {
    this.navigate('progress');
    this.progressPatientSelect.value = patientId;
    this.handleProgressPatientChange();
  }

  // Patients Management
  renderPatientsList() {
    const searchVal = this.patientSearchInput.value.toLowerCase();
    
    const filtered = this.patients.filter(p => 
      p.name.toLowerCase().includes(searchVal) ||
      p.diagnosis.toLowerCase().includes(searchVal) ||
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
      const initial = p.name.charAt(0).toUpperCase();
      const completedSessions = this.sessions.filter(s => s.patientId === p.id && s.isCompleted).length;
      const totalSessions = this.sessions.filter(s => s.patientId === p.id).length;
      const authorized = p.authorizedSessions || 23;
      
      const exceeded = totalSessions > authorized;
      const indicatorColor = exceeded ? 'var(--danger)' : (totalSessions === authorized ? 'var(--accent-amber)' : 'var(--text-secondary)');
      const badgeExceeded = exceeded ? `<span class="badge-status" style="background-color: var(--danger-light); color: var(--danger); font-size: 0.75rem; padding: 0.15rem 0.5rem; margin-left: 0.5rem; border-radius: 50px; font-weight: 700;">Excedido</span>` : '';
      
      return `
        <div class="patient-card">
          <div class="patient-card-header">
            <div class="p-avatar">${initial}</div>
            <div>
              <h3>${p.name}</h3>
              <p class="subtitle" style="font-size:0.85rem;">Ingreso: Paciente registrado</p>
            </div>
          </div>
          
          <div class="patient-detail-body">
            <div class="detail-item">
              <span class="material-symbols-rounded">medical_information</span>
              <p style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${p.diagnosis}
              </p>
            </div>
            ${p.phone ? `
            <div class="detail-item">
              <span class="material-symbols-rounded">call</span>
              <p>${p.phone}</p>
            </div>` : ''}
            <div class="detail-item" style="color: ${indicatorColor};">
              <span class="material-symbols-rounded" style="color: ${indicatorColor};">event_available</span>
              <p>
                <strong>${totalSessions}</strong> / ${authorized} sesiones
                ${badgeExceeded}
              </p>
            </div>
            <div class="detail-item">
              <span class="material-symbols-rounded">check_circle</span>
              <p>${completedSessions} de ellas ya realizadas</p>
            </div>
          </div>
          
          <div class="patient-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.openSessionModal('${p.id}', true)">
              <span class="material-symbols-rounded">add</span>
              <span>Registrar Sesión</span>
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
  openPatientModal() {
    this.formPatient.reset();
    this.modalPatient.classList.add('active');
  }

  closePatientModal() {
    this.modalPatient.classList.remove('active');
  }

  handlePatientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value;
    const phone = document.getElementById('p-phone').value;
    const email = document.getElementById('p-email').value;
    const dob = document.getElementById('p-dob').value;
    const gender = document.getElementById('p-gender').value;
    const authorizedSessions = parseInt(document.getElementById('p-authorized').value) || 23;
    const diagnosis = document.getElementById('p-diagnosis').value;

    const newPatient = {
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
  }

  // Session & Appointment Modals
  openSessionModal(patientId = null, preMarkCompleted = true) {
    this.formSession.reset();
    document.getElementById('session-modal-title').textContent = preMarkCompleted ? 'Registrar Sesión Realizada' : 'Programar Nueva Sesión';
    
    // Set default date and time
    const today = new Date();
    document.getElementById('s-date').value = this.formatDateISO(today);
    document.getElementById('s-time').value = today.toTimeString().substring(0, 5);
    
    if (patientId) {
      document.getElementById('s-patient').value = patientId;
    }
    
    this.sIsCompleted.checked = preMarkCompleted;
    this.toggleSessionModalFields();
    
    // Reset badges
    document.getElementById('s-pain').value = 5;
    document.getElementById('pain-badge').textContent = '5';
    document.getElementById('s-mobility').value = 50;
    document.getElementById('mobility-badge').textContent = '50%';
    document.getElementById('s-mood').value = 3;
    document.getElementById('mood-badge').textContent = '3';

    this.modalSession.classList.add('active');
  }

  closeSessionModal() {
    this.modalSession.classList.remove('active');
  }

  handleSessionSubmit(e) {
    e.preventDefault();
    const patientId = document.getElementById('s-patient').value;
    const date = document.getElementById('s-date').value;
    const time = document.getElementById('s-time').value;
    const isCompleted = this.sIsCompleted.checked;
    
    const sessionData = {
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
      const patient = this.patients.find(p => p.id === session.patientId) || { name: 'Paciente Desconocido', diagnosis: 'No especificado' };
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
          <div class="agenda-card-actions">
            <span class="badge-status ${badgeClass}">${statusText}</span>
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

    const pSessions = this.sessions.filter(s => s.patientId === patientId && s.isCompleted);
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
          </div>
        </div>`;
    }).join('');

    // Draw Chart
    this.renderEvolutionChart(pSessions);
  }

  renderEvolutionChart(pSessions = null) {
    if (!pSessions) {
      const patientId = this.progressPatientSelect.value;
      pSessions = this.sessions.filter(s => s.patientId === patientId && s.isCompleted);
      pSessions.sort((a, b) => a.date.localeCompare(b.date));
    }

    const canvas = document.getElementById('evolution-chart');
    const ctx = canvas.getContext('2d');
    
    // Responsive Canvas Resizing
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth;
    const height = 300;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    if (pSessions.length === 0) return;

    // Draw Background Grid
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Y Axis Grid lines (0 to 10 scale)
    for (let i = 0; i <= 5; i++) {
      const y = paddingTop + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Axis label (left side: Pain 10 to 0)
      ctx.fillStyle = labelColor;
      ctx.font = '500 11px Outfit';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((10 - i * 2).toString(), paddingLeft - 8, y);
    }

    // X Axis positioning
    const pointsCount = pSessions.length;
    const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

    // Pain Data coordinates
    const painPoints = pSessions.map((s, index) => {
      const x = paddingLeft + index * xStep;
      // Pain is 0-10 scale
      const y = paddingTop + chartHeight - (s.pain / 10) * chartHeight;
      return { x, y };
    });

    // Mobility Data coordinates
    const mobilityPoints = pSessions.map((s, index) => {
      const x = paddingLeft + index * xStep;
      // Mobility is 0-100 scale
      const y = paddingTop + chartHeight - (s.mobility / 100) * chartHeight;
      return { x, y };
    });

    // Draw Mobility Line (Teal/Green)
    this.drawTrendLine(ctx, mobilityPoints, '#14b8a6', '#2dd4bf', 3);

    // Draw Pain Line (Red/Coral)
    this.drawTrendLine(ctx, painPoints, '#ef4444', '#f87171', 3);

    // Draw X labels (Sessions)
    pSessions.forEach((s, index) => {
      const x = paddingLeft + index * xStep;
      ctx.fillStyle = labelColor;
      ctx.font = '600 10px Outfit';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`S${index + 1}`, x, height - paddingBottom + 8);
    });

    // Draw Legend
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px Outfit';
    
    // Pain Indicator dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(width - 150, 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText('Dolor (0-10)', width - 140, 10);

    // Mobility Indicator dot
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath(); ctx.arc(width - 70, 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText('Movilidad %', width - 60, 10);
  }

  drawTrendLine(ctx, points, color, glowColor, lineWidth) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    points.forEach((pt, index) => {
      if (index === 0) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    });
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw dots
    points.forEach((pt) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Utilities
  formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // PWA SW Registration
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
          .catch(err => console.error('Error al registrar el Service Worker:', err));
      });
    }
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
      alert('Clave API de Gemini guardada correctamente.');
      this.closeGeminiModal();
    }
  }

  async optimizeNotesWithAI() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert('Por favor, configura tu API Key de Gemini primero.');
      this.openGeminiModal();
      return;
    }

    const patientId = document.getElementById('s-patient').value;
    if (!patientId) {
      alert('Por favor, selecciona un paciente primero.');
      return;
    }

    const notesField = document.getElementById('s-notes');
    const notesText = notesField.value.trim();
    if (!notesText) {
      alert('Por favor, escribe algunas notas rápidas o palabras clave primero.');
      return;
    }

    const patient = this.patients.find(p => p.id === patientId);
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

Por favor, redacta de forma profesional y clínica, estructurando claramente:
S (Subjetivo): Estado y síntomas percibidos/expresados por el paciente.
O (Objetivo): Mediciones objetivas de dolor, rango de movimiento y detalles de los ejercicios realizados.
A (Análisis): Comparación clínica con el diagnóstico y evolución del paciente.
P (Plan): Indicaciones y enfoque para las siguientes sesiones.

Redacta directamente la nota SOAP estructurada sin comentarios introductorios ni de despedida. Sé profesional, técnico y conciso en español.`;

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
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        const generatedSOAP = data.candidates[0].content.parts[0].text.trim();
        notesField.value = generatedSOAP;
      } else {
        throw new Error('La respuesta de la IA no tiene el formato esperado.');
      }

    } catch (error) {
      console.error(error);
      alert('Ocurrió un error al optimizar las notas con IA: ' + error.message);
    } finally {
      // Restore button state
      btn.classList.remove('loading');
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }
}

// Global instantiation
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new TherapyApp();
  window.app = app;
});
