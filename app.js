class AlarmApp {
    constructor() {
        this.state = {
            user: null, // { username, role }
            centrales: [],
            devices: [],
            cameras: [],
            poeSwitches: [],
            nvrs: [],
            users: [], // { id, username, password, role }
            currentCentralId: null,
            centralSearch: '',
            deviceSearch: '',
            reorderMode: false,
            currentTab: 'home'
        };
        this.currentCameraPhoto = null;
        this.loadInitialData();
        this.initEventListeners();
        this.initFirebase();
        this.initConnectivityMonitor();
        
        // No bloqueamos el inicio por el chequeo de versión
        this.checkForUpdates().catch(e => console.warn('Actualización skip:', e.message));
    }

    initConnectivityMonitor() {
        window.addEventListener('firebase-connection-changed', (e) => {
            const connected = e.detail.connected;
            const cloudIcon = document.getElementById('cloud-status');
            if (cloudIcon) {
                cloudIcon.classList.toggle('online', connected);
                cloudIcon.classList.toggle('offline', !connected);
                cloudIcon.title = connected ? 'Nube Conectada 🟢' : 'Modo fuera de línea 🔴';
            }
        });
    }

    initFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            this.db = firebase.database();
            this.cloudRef = this.db.ref('alarmState');
            
            // Listener para cambios en la nube
            this.cloudRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const remoteResetId = data.resetId || null;
                    const localResetId = localStorage.getItem('last-reset-id');
                    
                    if (remoteResetId && remoteResetId !== localResetId) {
                        console.log('¡Sello de Reinicio Maestro detectado!');
                        this.state.centrales = data.centrales || [];
                        this.state.devices = data.devices || [];
                        this.state.cameras = data.cameras || [];
                        this.state.poeSwitches = data.poeSwitches || [];
                        this.state.nvrs = data.nvrs || [];
                        this.state.users = data.users || [];
                        localStorage.setItem('last-reset-id', remoteResetId);
                        this.saveState(true); 
                        this.render();
                        return;
                    }

                    console.log('Datos nube recibidos.');
                    this.state.centrales = data.centrales || [];
                    this.state.devices = data.devices || [];
                    this.state.cameras = data.cameras || [];
                    this.state.poeSwitches = data.poeSwitches || [];
                    this.state.nvrs = data.nvrs || [];
                    this.state.users = data.users || [];
                    this.saveState(true); 
                    this.render();
                    
                    const timestamp = new Date().toLocaleTimeString();
                    const debugFirebase = document.getElementById('debug-firebase');
                    if (debugFirebase) {
                        debugFirebase.innerHTML = `<span class="heartbeat"></span> Firebase: ✅ Sincronizado (${timestamp})`;
                    }
                    
                    const viewer = document.getElementById('cloud-json-viewer');
                    if (viewer) {
                        viewer.innerText = JSON.stringify({
                            centrales: this.state.centrales.length,
                            devices: this.state.devices.length,
                            resetId: data.resetId || "none"
                        }, null, 2);
                    }
                } else {
                    console.log('Firebase vacío.');
                    const debugFirebase = document.getElementById('debug-firebase');
                    if (debugFirebase) {
                        debugFirebase.innerHTML = `Firebase: ☁️ Vacío`;
                    }
                    const viewer = document.getElementById('cloud-json-viewer');
                    if (viewer) viewer.innerText = "NUBE VACÍA (Esperando datos del PC)";
                }
            }, (error) => {
                console.error('ERROR Firebase:', error.message);
                const debugFirebase = document.getElementById('debug-firebase');
                if (debugFirebase) {
                    debugFirebase.innerText = "Firebase: ❌ Error";
                }
                const viewer = document.getElementById('cloud-json-viewer');
                if (viewer) viewer.innerText = "ERROR: " + error.message;
            });
            this.isCloudEnabled = true;
            const debugFirebase = document.getElementById('debug-firebase');
            if (debugFirebase) {
                debugFirebase.innerText = "Firebase: ✅ DB Conectada";
            }
            console.log("Firebase DB Conectada");

            // --- Firebase Auth Listener ---
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log('Firebase Auth: Sesión activa ->', user.email);
                    const username = user.email.split('@')[0];
                    // Asegurar que state.user exista para evitar parpadeos
                    if (!this.state.user) {
                        this.state.user = { username: username, role: username === 'admin' ? 'admin' : 'user' };
                    }
                    document.getElementById('login-overlay').classList.add('hidden');
                    document.getElementById('app-container').classList.remove('hidden');
                    this.render();
                } else {
                    console.log('Firebase Auth: Ninguna sesión activa');
                    this.state.user = null;
                    document.getElementById('login-overlay').classList.remove('hidden');
                    document.getElementById('app-container').classList.add('hidden');
                }
            });

        } else {
            const debugFirebase = document.getElementById('debug-firebase');
            if (debugFirebase) {
                debugFirebase.innerText = "Firebase: ❌ No configurado";
            }
            console.warn("Firebase no inicializado: SDK no encontrado o configuración inválida.");
            this.isCloudEnabled = false;
        }
    }

    async syncCloud(silent = false) {
        if (!this.isCloudEnabled) return;
        
        const cloudIcon = document.getElementById('cloud-status');
        if (cloudIcon) cloudIcon.classList.add('syncing');

        const dataToSave = {
            centrales: this.state.centrales,
            devices: this.state.devices,
            cameras: this.state.cameras,
            poeSwitches: this.state.poeSwitches,
            nvrs: this.state.nvrs,
            users: this.state.users,
            currentCentralId: this.state.currentCentralId,
            resetId: localStorage.getItem('last-reset-id') || null
        };

        try {
            await this.cloudRef.set(dataToSave);
            console.log('✅ Datos sincronizados con la nube');
            
            if (cloudIcon) {
                cloudIcon.classList.remove('syncing');
                cloudIcon.classList.add('online');
            }

            const badge = document.getElementById('debug-firebase');
            if (badge) {
                const now = new Date().toLocaleTimeString();
                badge.innerHTML = `<span class="heartbeat"></span> Sincronizado (${now})`;
                badge.className = 'debug-badge connected';
            }
            if (!silent) alert('✅ Datos subidos correctamente.');
        } catch (e) {
            console.error('Error al sincronizar:', e);
            if (cloudIcon) cloudIcon.classList.remove('syncing');
            if (!silent) alert('❌ Error al subir: ' + e.message);
        }
    }


    async loadInitialData() {
        console.log('Cargando datos iniciales...');
        
        // 1. Cargar lo que haya en localStorage
        await this.loadState();
        
        // 2. Asegurar siempre usuarios básicos (admin/user) de inmediato
        this.bootstrapAdmin();

        // 3. SEEDING INTELIGENTE: Solo cargar de los archivos base si la app está vacía
        if (this.state.centrales.length === 0) {
            console.log('Aplicación vacía. Intentando cargar datos semilla desde data.json...');
            this.fetchDataFromServer().then(() => {
                console.log('Datos semilla de data.json cargados.');
                this.render();
            }).catch(e => {
                console.warn('data.json no disponible:', e.message);
                this.render();
            });
        } else {
            console.log('Cargados ' + this.state.centrales.length + ' centrales desde la memoria local.');
        }

        this.render();
    }

    bootstrapAdmin() {
        console.log('Verificando usuarios base...');
        
        // Aseguramos que el admin principal siempre exista
        const hasAdmin = this.state.users.find(u => u.username === 'admin');
        if (!hasAdmin) {
            console.log('Inyectando admin por defecto...');
            this.state.users.push({
                id: 'admin_initial',
                username: 'admin',
                password: '1105',
                role: 'admin'
            });
        }

        // Aseguramos usuario hilda
        const hasHilda = this.state.users.find(u => u.username.toLowerCase() === 'hilda');
        if (!hasHilda) {
            console.log('Inyectando hilda por defecto...');
            this.state.users.push({
                id: 'user_initial',
                username: 'hilda',
                password: '1106',
                role: 'user'
            });
        }
        
        this.saveState(true); // Guardar en local sin subir a la nube necesariamente
    }

    async checkForUpdates() {
        // 1. Chequeo manual via version.json
        try {
            const resp = await fetch('version.json?t=' + Date.now());
            const data = await resp.json();
            const currentVersion = localStorage.getItem('appVersion') || '1.0';
            
            if (data.version !== currentVersion) {
                console.log("Nueva versión detectada (JSON):", data.version);
                this.pendingVersion = data.version; 
                this.showUpdateBanner(data.version);
            }
        } catch (e) {
            console.warn("No se pudo comprobar actualización via JSON.");
        }

        // 2. Chequeo via Service Worker (PWA Standard)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nuevo Service Worker detectado (PWA Update)');
                            this.showUpdateBanner('PWA Optimized');
                        }
                    };
                };
            });
        }
    }

    showUpdateBanner(versionLabel) {
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.style.display = 'flex';
            const textEl = document.getElementById('new-version-text');
            if (textEl) textEl.innerText = versionLabel;
        }
    }

    applyUpdate() {
        const versionToSet = this.pendingVersion;
        
        // Si hay una versión de Service Worker esperando, se activará al recargar
        // debido a skipWaiting() en el sw.js.
        
        if (versionToSet) {
            localStorage.setItem('appVersion', versionToSet);
        } else {
            // Intentar obtenerla de nuevo si no estaba guardada
            fetch('version.json?t=' + Date.now())
                .then(r => r.json())
                .then(data => {
                    localStorage.setItem('appVersion', data.version);
                    this.reloadApp();
                })
                .catch(() => this.reloadApp());
            return;
        }
        this.reloadApp();
    }

    reloadApp() {
        // Redirigir con un parámetro aleatorio para FORZAR al navegador a recargar todo
        window.location.href = window.location.pathname + '?v=' + Date.now();
    }

    loadState() {
        try {
            const saved = localStorage.getItem('alarma-lg-state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.centrales = parsed.centrales || [];
                this.state.devices = parsed.devices || [];
                this.state.cameras = parsed.cameras || [];
                this.state.poeSwitches = parsed.poeSwitches || [];
                this.state.nvrs = parsed.nvrs || [];
                this.state.users = parsed.users || [];
                if (parsed.currentCentralId && this.state.centrales.find(c => c.id === parsed.currentCentralId)) {
                    this.state.currentCentralId = parsed.currentCentralId;
                }
                return true;
            }
        } catch (e) {
            console.error('Error al cargar estado:', e);
        }
        return false;
    }

    async fetchDataFromServer() {
        console.log('Intentando cargar datos desde servidor/memoria...');
        
        // 1. Intentar usar los datos precargados vía script (Solución CORS para local)
        if (window.initialData) {
            console.log('Datos detectados en memoria (initial-data.js). Cargando...');
            this.state.centrales = window.initialData.centrales || [];
            this.state.devices = window.initialData.devices || [];
            this.state.cameras = window.initialData.cameras || [];
            this.state.poeSwitches = window.initialData.poeSwitches || [];
            this.state.nvrs = window.initialData.nvrs || [];
            this.state.users = window.initialData.users || [];
            this.state.currentCentralId = window.initialData.currentCentralId || null;
            return;
        }

        // 2. Fallback: Intentar fetch si no hay initialData (ej. producción)
        try {
            const response = await fetch('data.json?v=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                this.state.centrales = data.centrales || [];
                this.state.devices = data.devices || [];
                this.state.cameras = data.cameras || [];
                this.state.poeSwitches = data.poeSwitches || [];
                this.state.nvrs = data.nvrs || [];
                this.state.users = data.users || [];
                this.state.currentCentralId = data.currentCentralId || null;
                console.log('Datos cargados vía fetch (data.json)');
            }
        } catch (e) {
            console.warn('No se pudo cargar data.json vía fetch (posible CORS).');
        }
    }

    saveState(skipCloud = false) {
        const dataToSave = {
            centrales: this.state.centrales,
            devices: this.state.devices,
            cameras: this.state.cameras,
            poeSwitches: this.state.poeSwitches,
            nvrs: this.state.nvrs,
            users: this.state.users,
            currentCentralId: this.state.currentCentralId
        };
        
        localStorage.setItem('alarma-lg-state', JSON.stringify(dataToSave));

        // SUBIDA INMEDIATA A LA NUBE: No opcional para evitar pérdida de datos
        if (this.isCloudEnabled && !skipCloud) {
            console.log('Sincronizando con la nube para evitar pérdida de datos...');
            this.syncCloud(true);
        }
    }

    async hardReset() {
        if (!confirm('⚠️ ¡PELIGRO! Esto borrará TODAS las centrales y dispositivos en TODOS los móviles y en la Nube de forma definitiva. ¿Continuar?')) return;
        
        const resetId = Date.now().toString();
        localStorage.setItem('last-reset-id', resetId);

        const resetState = {
            centrales: [],
            devices: [],
            users: [{
                id: 'admin_initial',
                username: 'admin',
                password: '1105',
                role: 'admin'
            }],
            currentCentralId: null,
            resetId: resetId // Sello Maestro
        };

        // Forzar limpieza en la Nube
        if (this.isCloudEnabled) {
            try {
                await this.cloudRef.set(resetState);
                console.log('Nube limpiada con Sello Maestro v' + resetId);
            } catch (e) {
                console.error('Error al limpiar nube:', e);
            }
        }

        // Limpiar Local
        localStorage.removeItem('alarma-lg-state');
        localStorage.setItem('alarma-lg-state', JSON.stringify(resetState));
        
        alert('Reinicio completado. El sello maestro ' + resetId + ' se ha enviado a la nube para limpiar todos los móviles.');
        location.reload();
    }

    initEventListeners() {
        // Login
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        const handleEnter = (e) => {
            if (e.key === 'Enter') this.login();
        };
        document.getElementById('username').addEventListener('keydown', handleEnter);
        document.getElementById('password').addEventListener('keydown', handleEnter);

        document.getElementById('logout-btn-sidebar').addEventListener('click', () => this.logout());
        document.getElementById('logout-btn-header').addEventListener('click', () => this.logout());

        // Centrales
        document.getElementById('add-central-btn').addEventListener('click', () => this.openCentralModal());
        document.getElementById('central-form').addEventListener('submit', (e) => this.handleCentralSubmit(e));
        document.getElementById('edit-central-btn').addEventListener('click', () => this.openCentralModal(true));
        document.getElementById('delete-central-btn').addEventListener('click', () => this.deleteCentral());
        document.getElementById('print-central-btn').addEventListener('click', () => this.generateSpecificReport());

        // Devices
        document.getElementById('add-device-btn').addEventListener('click', () => this.openDeviceModal());
        document.getElementById('device-form').addEventListener('submit', (e) => this.handleDeviceSubmit(e));

        // Users
        document.getElementById('user-form').addEventListener('submit', (e) => this.handleUserSubmit(e));

        // CCTV
        document.getElementById('cctv-form').addEventListener('submit', (e) => this.handleCctvSubmit(e));
        document.getElementById('cctv-delete-btn')?.addEventListener('click', () => {
            if (this.editingCctvId && confirm('¿Eliminar este dispositivo CCTV?')) {
                const type = document.getElementById('cctv-form')['cctv-type'].value;
                this.deleteCctv(type, this.editingCctvId);
                this.closeModals();
            }
        });
        document.getElementById('camera-photo-input')?.addEventListener('change', (e) => this.handleCameraPhoto(e));

        // Maintenance
        document.getElementById('maintenance-form')?.addEventListener('submit', (e) => this.handleMaintenanceSubmit(e));

        // Modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Import
        document.getElementById('import-input').addEventListener('change', (e) => this.handleImport(e));

        // Click to close central
        document.getElementById('current-central-name').addEventListener('click', () => {
            this.state.currentCentralId = null;
            this.render();
        });

        // Search
        document.getElementById('central-search').addEventListener('input', (e) => {
            this.state.centralSearch = e.target.value.toLowerCase();
            this.renderCentralesList();
        });
        document.getElementById('central-search-mobile')?.addEventListener('input', (e) => {
            this.state.centralSearch = e.target.value.toLowerCase();
            this.renderCentralesList();
        });
        document.getElementById('device-search').addEventListener('input', (e) => {
            this.state.deviceSearch = e.target.value.toLowerCase();
            this.renderCurrentCentral();
        });
    }


    async login() {
        const usernameInput = document.getElementById('username').value.trim().toLowerCase();
        const passwordInput = document.getElementById('password').value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value || 'user';

        if (!usernameInput || !passwordInput) {
            alert('Por favor complete todos los campos');
            return;
        }

        const email = usernameInput.replace(/\s+/g, '') + '@alarmalg.com';
        const loginBtn = document.getElementById('login-btn');
        loginBtn.innerText = 'Verificando...';
        loginBtn.disabled = true;

        try {
            // Intentar Iniciar Sesión con Firebase
            await firebase.auth().signInWithEmailAndPassword(email, passwordInput);
            console.log('Acceso concedido por Firebase Auth');
            
            // Buscar el usuario en la BD para aplicar el rol correcto
            const foundUser = this.state.users.find(u => u.username.toLowerCase() === usernameInput);
            this.state.user = { 
                username: foundUser ? foundUser.username : usernameInput, 
                role: foundUser ? foundUser.role : (usernameInput === 'admin' ? 'admin' : 'user') 
            };
            
            // Forzar volver al tope de la pantalla al entrar
            const contentArea = document.querySelector('.content');
            if (contentArea) contentArea.scrollTop = 0;
            window.scrollTo(0, 0);

        } catch (error) {
            console.warn('Credenciales no válidas en Firebase:', error.code);
            alert('Usuario o contraseña incorrectos. Si es tu primera vez, el administrador debe crear tu cuenta.');
        } finally {
            loginBtn.innerText = 'Entrar';
            loginBtn.disabled = false;
        }
    }

    logout() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(e => console.error(e));
        } else {
            this.state.user = null;
            document.getElementById('login-overlay').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    }

    applyPermissions() {
        const isAdmin = this.state.user?.role === 'admin';
        console.log("Aplicando permisos. Admin:", isAdmin);
        document.querySelectorAll('.admin-only').forEach(el => {
            if (isAdmin) {
                el.classList.remove('auth-hidden');
                // Forzar despliegue si es el botón de reordenar
                if (el.id === 'reorder-mode-btn') el.style.display = 'inline-block';
            } else {
                el.classList.add('auth-hidden');
                if (el.id === 'reorder-mode-btn') el.style.display = 'none';
            }
        });
    }

    // Modal Logic
    openCentralModal(isEdit = false) {
        const modal = document.getElementById('central-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('central-form');
        const title = document.getElementById('modal-title');

        title.innerText = isEdit ? 'Editar Central' : 'Nueva Central';
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        if (isEdit) {
            const central = this.state.centrales.find(c => c.id === this.state.currentCentralId);
            form.name.value = central.name;
            form.location.value = central.location;
            form.ip.value = central.ip;
            form.rack.value = central.rack;
            form.piso.value = central.piso || '';
            form.battery.value = central.battery;
        } else {
            form.reset();
        }
    }

    openDeviceModal(isEdit = false, deviceId = null) {
        if (!this.state.currentCentralId) return alert('Seleccione una central primero');
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('device-modal');
        const form = document.getElementById('device-form');
        const title = modal.querySelector('h2');

        title.innerText = isEdit ? 'Editar Dispositivo' : 'Nuevo Dispositivo';
        this.editingDeviceId = deviceId;

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        if (isEdit && deviceId) {
            const device = this.state.devices.find(d => d.id === deviceId);
            form.type.value = device.type;
            form.location.value = device.location;
            form.piso.value = device.piso || '';
            form.battery.value = device.battery;
            form.installationDate.value = device.installationDate;
        } else {
            form.reset();
        }
    }

    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('central-modal').classList.add('hidden');
        document.getElementById('device-modal').classList.add('hidden');
        document.getElementById('user-manage-modal').classList.add('hidden');
        document.getElementById('user-edit-modal').classList.add('hidden');
        document.getElementById('central-selector-modal')?.classList.add('hidden');
        document.getElementById('normativas-modal')?.classList.add('hidden');
        document.getElementById('maintenance-modal')?.classList.add('hidden');
        document.getElementById('cctv-modal')?.classList.add('hidden');
        this.clearCameraPhoto();
        this.editingDeviceId = null;
        this.editingUserId = null;
        this.editingCctvId = null;
    }

    // Mobile specific methods
    openCentralSelector() {
        const modal = document.getElementById('central-selector-modal');
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        this.renderCentralesList();
    }

    toggleSearch() {
        const searchBox = document.querySelector('.devices-header .search-box');
        if (searchBox) {
            searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
        }
    }

    openNormativasModal() {
        const modal = document.getElementById('normativas-modal');
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    switchTab(tab, silent = false) {
        if (!tab) return;
        this.state.currentTab = tab;
        
        // Reset scroll position on tab switch (only if not silent)
        if (!silent) {
            const contentArea = document.querySelector('.content');
            if (contentArea) contentArea.scrollTop = 0;
            window.scrollTo(0, 0);
        }
        
        // Update navigation UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === tab) {
                item.classList.add('active');
            }
        });

        const details = document.getElementById('central-details');
        const cctvSection = document.getElementById('cctv-section');
        const dashboardHeader = document.querySelector('.dashboard-header-main');
        const logoText = document.getElementById('mobile-logo-text');
        const logoIcon = document.getElementById('mobile-logo-icon');
        
        // Toggle global dashboard visibility and Dynamic Header Title
        if (tab === 'control') {
            dashboardHeader?.classList.remove('hidden');
            if (logoText) logoText.innerText = 'Centro de Control';
            if (logoIcon) logoIcon.style.display = 'none';
            this.updateStats(); // Refresh counters
        } else {
            dashboardHeader?.classList.add('hidden');
            if (logoText) logoText.innerText = 'AlarmaLG';
            if (logoIcon) logoIcon.style.display = 'inline-block';
        }
        
        // Hide all sections first
        details.classList.add('hidden');
        cctvSection?.classList.add('hidden');

        if (tab === 'home') {
            if (this.state.currentCentralId) {
                details.classList.remove('hidden');
                this.renderCurrentCentral();
            } else {
                details.innerHTML = `
                    <div class="welcome-mobile">
                        <div class="welcome-icon">🏢</div>
                        <h2>Bienvenido, ${this.state.user.username}</h2>
                        <p>Seleccione una central para ver sus dispositivos.</p>
                        <button class="primary-btn" onclick="app.openCentralSelector()">Seleccionar Central</button>
                    </div>
                `;
                details.classList.remove('hidden');
            }
        } else if (tab === 'control') {
            // Dashboard header is already toggled above, clear details area
            details.classList.add('hidden');
        } else if (tab === 'me') {
            details.classList.remove('hidden');
            this.renderMeTab();
        } else if (tab === 'service') {
            details.classList.remove('hidden');
            this.renderServiceTab();
        } else if (tab === 'cctv') {
            cctvSection?.classList.remove('hidden');
            this.renderCCTVTab();
        } else if (tab === 'messages') {
            details.innerHTML = `
                <div class="empty-tab">
                    <div class="empty-icon">💬</div>
                    <h2>Mensajes</h2>
                    <p>No tienes mensajes nuevos en este momento.</p>
                </div>
            `;
            details.classList.remove('hidden');
        }
    }

    renderMeTab() {
        const details = document.getElementById('central-details');
        const roleName = this.state.user.role === 'admin' ? 'Administrador' : 'Operador';
        
        details.innerHTML = `
            <div class="me-tab">
                <div class="profile-header">
                    <div class="profile-avatar">${this.state.user.username.charAt(0).toUpperCase()}</div>
                    <div class="profile-info">
                        <h2>${this.state.user.username}</h2>
                        <span class="profile-role">${roleName}</span>
                    </div>
                </div>
                
                <div class="me-menu">
                    <div class="me-menu-item" onclick="window.open('https://cgappdev.github.io/alarma-central/', '_blank')">
                        <span class="icon">🌐</span>
                        <span class="label">Ver Nube en Vivo</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item" onclick="app.openNormativasModal()">
                        <span class="icon">📜</span>
                        <span class="label">Manual de Control Interno</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.openUserManageModal()">
                        <span class="icon">👥</span>
                        <span class="label">Gestionar Usuarios</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.generateGeneralReport()">
                        <span class="icon">📄</span>
                        <span class="label">Reporte General (PDF)</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.switchTab('control'); setTimeout(() => document.querySelector('.ips-section')?.scrollIntoView({behavior: 'smooth'}), 300)">
                        <span class="icon">📋</span>
                        <span class="label">Ver Reporte de IPs (En App)</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.generateIpReport()">
                        <span class="icon">📄</span>
                        <span class="label">Reporte de IPs (PDF)</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.exportData()">
                        <span class="icon">💾</span>
                        <span class="label">Exportar Respaldo</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item admin-only" onclick="app.importData()">
                        <span class="icon">📂</span>
                        <span class="label">Importar Respaldo</span>
                        <span class="arrow">›</span>
                    </div>
                </div>

                <div class="logout-section">
                    <button class="logout-btn-full" onclick="app.logout()">Cerrar Sesión</button>
                    <p class="app-version">Versión 4.5.7-PRO-CCTV</p>
                </div>
            </div>
        `;
        
        // Hide/Show admin-only items
        if (this.state.user.role !== 'admin') {
            details.querySelector('.me-menu-item[onclick*="UserManage"]').classList.add('hidden');
        }
    }

    renderServiceTab() {
        const details = document.getElementById('central-details');
        const totalOk = this.state.devices.filter(d => d.battery >= 20).length;
        const totalLow = this.state.devices.filter(d => d.battery < 20).length;
        
        details.innerHTML = `
            <div class="service-tab">
                <div class="service-header">
                    <h2>Estado del Servicio</h2>
                    <p>Resumen de salud de todos los dispositivos</p>
                </div>
                
                <div class="service-stats">
                    <div class="s-stat-card ok">
                        <span class="s-value">${totalOk}</span>
                        <span class="s-label">Operativos</span>
                    </div>
                    <div class="s-stat-card warning">
                        <span class="s-value">${totalLow}</span>
                        <span class="s-label">Batería Baja</span>
                    </div>
                </div>

                <div class="service-health-list">
                    <h3>Puntos de Control</h3>
                    <div class="health-item">
                        <span class="h-icon status-online">●</span>
                        <span class="h-text">Servidor Central</span>
                        <span class="h-status">Normal</span>
                    </div>
                    <div class="health-item">
                        <span class="h-icon status-online">●</span>
                        <span class="h-text">Base de Datos</span>
                        <span class="h-status">Normal</span>
                    </div>
                    <div class="health-item">
                        <span class="h-icon ${totalLow > 0 ? 'status-offline' : 'status-online'}">●</span>
                        <span class="h-text">Dispositivos Remotos</span>
                        <span class="h-status">${totalLow > 0 ? 'Revisión Nec.' : 'Normal'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // User Management
    openUserManageModal() {
        if (this.state.user.role !== 'admin') return;
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById('user-manage-modal').classList.remove('hidden');
        this.renderUserList();
    }

    renderUserList() {
        const body = document.getElementById('user-list-body');
        body.innerHTML = '';
        this.state.users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.username}</td>
                <td><span class="badge ${u.role}">${u.role.toUpperCase()}</span></td>
                <td>
                    <button class="icon-btn" onclick="app.openUserEditModal(true, '${u.id}')">✏️</button>
                    <button class="icon-btn danger" onclick="app.deleteUser('${u.id}')">🗑️</button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    openUserEditModal(isEdit = false, userId = null) {
        const modal = document.getElementById('user-edit-modal');
        const form = document.getElementById('user-form');
        document.getElementById('user-modal-title').innerText = isEdit ? 'Editar Usuario' : 'Nuevo Usuario';
        
        this.editingUserId = userId;
        modal.classList.remove('hidden');

        if (isEdit) {
            const user = this.state.users.find(u => u.id === userId);
            form.username.value = user.username;
            form.password.value = user.password;
            form.role.value = user.role;
        } else {
            form.reset();
        }
    }

    closeUserEditModal() {
        document.getElementById('user-edit-modal').classList.add('hidden');
        this.editingUserId = null;
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const usernameInput = formData.get('username').trim().toLowerCase();
        const passwordInput = formData.get('password').trim();
        const roleInput = formData.get('role');
        const email = usernameInput.replace(/\s+/g, '') + '@alarmalg.com';

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Guardando...';
        submitBtn.disabled = true;

        try {
            if (!this.editingUserId) {
                // Nuevo Usuario: Crear credencial en Firebase Auth
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    // Usamos una app secundaria para no desloguear al admin actual
                    const secondaryApp = firebase.apps.find(a => a.name === "Secondary") || firebase.initializeApp(firebaseConfig, "Secondary");
                    await secondaryApp.auth().createUserWithEmailAndPassword(email, passwordInput);
                    await secondaryApp.auth().signOut();
                    console.log('Usuario creado en Firebase Auth exitosamente.');
                }
            } else {
                // Si es edición de contraseña, en Firebase Auth requeriría Admin SDK.
                // Como workaround básico, solo actualizamos en BD. Para cambiar pass en Auth, 
                // el admin tendría que borrarlo y recrearlo, o el usuario usar "reset password".
                console.warn('Nota: La contraseña en Firebase Auth no se actualiza desde aquí sin Admin SDK.');
            }

            const userData = {
                id: this.editingUserId || Date.now().toString(),
                username: usernameInput,
                password: passwordInput, // Mantenemos para fallback o referencia (inseguro, pero útil para migración)
                role: roleInput
            };

            if (this.editingUserId) {
                const index = this.state.users.findIndex(u => u.id === this.editingUserId);
                this.state.users[index] = userData;
            } else {
                this.state.users.push(userData);
            }

            this.saveState();
            this.closeUserEditModal();
            this.renderUserList();
            alert(this.editingUserId ? 'Usuario actualizado en base de datos.' : 'Usuario creado en Firebase y base de datos.');

        } catch (error) {
            console.error('Error al gestionar usuario en Firebase:', error);
            alert('Error: ' + error.message);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    }

    deleteUser(id) {
        if (id === 'admin_initial') return alert('No se puede eliminar el administrador principal');
        if (confirm('¿Eliminar usuario?')) {
            this.state.users = this.state.users.filter(u => u.id !== id);
            this.saveState();
            this.renderUserList();
        }
    }

    // CRUD Centrales
    handleCentralSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const centralData = {
            id: this.state.currentCentralId && document.getElementById('modal-title').innerText.includes('Editar') 
                ? this.state.currentCentralId 
                : Date.now().toString(),
            name: formData.get('name'),
            location: formData.get('location'),
            ip: formData.get('ip'),
            rack: formData.get('rack'),
            piso: formData.get('piso'),
            battery: formData.get('battery')
        };

        if (document.getElementById('modal-title').innerText.includes('Editar')) {
            const index = this.state.centrales.findIndex(c => c.id === centralData.id);
            this.state.centrales[index] = centralData;
        } else {
            this.state.centrales.push(centralData);
            this.state.currentCentralId = centralData.id;
        }

        this.saveState();
        this.closeModals();
        this.render();
    }

    deleteCentral() {
        if (!this.state.currentCentralId) return;
        if (confirm('¿Está seguro de eliminar esta central y todos sus dispositivos?')) {
            this.state.centrales = this.state.centrales.filter(c => c.id !== this.state.currentCentralId);
            this.state.devices = this.state.devices.filter(d => d.centralId !== this.state.currentCentralId);
            this.state.currentCentralId = this.state.centrales.length > 0 ? this.state.centrales[0].id : null;
            this.saveState();
            this.render();
        }
    }

    // CRUD Devices
    handleDeviceSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const deviceData = {
            id: this.editingDeviceId || Date.now().toString(),
            centralId: this.state.currentCentralId,
            type: formData.get('type'),
            location: formData.get('location'),
            piso: formData.get('piso'),
            battery: formData.get('battery'),
            installationDate: formData.get('installationDate'),
            displayOrder: this.editingDeviceId 
                ? (this.state.devices.find(d => d.id === this.editingDeviceId).displayOrder ?? 0)
                : this.state.devices.filter(d => d.centralId === this.state.currentCentralId).length
        };

        if (this.editingDeviceId) {
            const index = this.state.devices.findIndex(d => d.id === this.editingDeviceId);
            this.state.devices[index] = deviceData;
        } else {
            this.state.devices.push(deviceData);
        }

        this.saveState();
        this.closeModals();
        this.render();
    }

    deleteDevice(id) {
        if (this.state.user.role !== 'admin') return;
        if (confirm('¿Eliminar dispositivo?')) {
            this.state.devices = this.state.devices.filter(d => d.id !== id);
            this.saveState();
            this.render();
        }
    }

    // Backup & Restore
    exportData() {
        const data = JSON.stringify(this.state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo_alarmas_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    importData() {
        document.getElementById('import-input').click();
    }

    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.state.centrales = data.centrales || [];
                this.state.devices = data.devices || [];
                // Ahora también restauramos la lista de usuarios (administradores y operadores)
                this.state.users = data.users || [];
                
                this.saveState();
                this.render();
                alert('🚀 Restauración Total Exitosa: Centrales, Dispositivos y Usuarios recuperados.');
            } catch (err) {
                console.error('Error al importar:', err);
                alert('❌ El archivo no es un respaldo válido.');
            }
        };
        reader.readAsText(file);
    }


    _showPDF(doc, filename) {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // En móviles, abrir en pestaña nueva para previsualizar (Blob URL es más confiable que DataURI)
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Intentar guardarlo también por si acaso
            setTimeout(() => {
                doc.save(filename);
                // Limpiar el URL después de un tiempo para liberar memoria
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            }, 2000);
        } else {
            // En escritorio, descarga directa convencional
            doc.save(filename);
        }
    }

    // PDF Reporting
    generateGeneralReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Reporte General de Centrales de Alarma', 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData = this.state.centrales.map(c => [
            c.name, c.location, c.piso || '-', c.ip, c.rack, `${c.battery}%`
        ]);

        doc.autoTable({
            head: [['Nombre', 'Ubicación', 'Piso', 'IP', 'Rack', 'Batería']],
            body: tableData,
            startY: 40
        });

        this._showPDF(doc, 'reporte_general_centrales.pdf');
    }

    generateIpReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Reporte de Direcciones IP de Centrales', 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData = this.state.centrales.map(c => [
            c.name, c.location, c.piso || '-', c.ip, c.rack
        ]);

        doc.autoTable({
            head: [['Nombre de la Central', 'Ubicación', 'Piso', 'Dirección IP', 'Rack / Observaciones']],
            body: tableData,
            startY: 40
        });

        this._showPDF(doc, 'reporte_ips_centrales.pdf');
    }

    generateSpecificReport() {
        if (!this.state.currentCentralId) return alert('Seleccione una central');
        const central = this.state.centrales.find(c => c.id === this.state.currentCentralId);
        const devices = this.state.devices
            .filter(d => d.centralId === central.id)
            .sort((a, b) => {
                 const typeCompare = a.type.localeCompare(b.type);
                 if (typeCompare !== 0) return typeCompare;
                 return a.location.localeCompare(b.location);
            });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Reporte Central: ${central.name}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Ubicación: ${central.location} | Piso: ${central.piso || '-'} | IP: ${central.ip}`, 14, 30);
        doc.text(`Rack: ${central.rack} | Batería: ${central.battery}%`, 14, 38);

        // Resumen de Totales por tipo
        const counts = {};
        devices.forEach(d => {
            counts[d.type] = (counts[d.type] || 0) + 1;
        });
        const summaryText = Object.entries(counts)
            .map(([type, count]) => `${type.toUpperCase()}: ${count}`)
            .join('  |  ');

        doc.setFontSize(11);
        doc.text('Resumen de Totales:', 14, 50);
        doc.text(summaryText || 'Sin dispositivos registrados', 14, 56);

        doc.setFontSize(12);
        doc.text('Detalle de Dispositivos Instalados:', 14, 68);

        const tableData = devices.map(d => [
            d.type.toUpperCase(), d.location, d.piso || '-', `${d.battery}%`, d.installationDate
        ]);

        doc.autoTable({
            head: [['Tipo', 'Ubicación', 'Piso', 'Batería', 'F. Instalación']],
            body: tableData,
            startY: 73
        });

        this._showPDF(doc, `reporte_${central.name}.pdf`);
    }

    // Rendering
    render() {
        this.renderCentralesList();
        this.switchTab(this.state.currentTab || 'home', true);
        this.updateStats();
        this.applyPermissions();
    }

    renderCentralesList() {
        const list = document.getElementById('centrales-list');
        const mobileList = document.getElementById('centrales-list-mobile');
        
        const renderTo = (container) => {
            if (!container) return;
            container.innerHTML = '';
            const filtered = this.state.centrales.filter(c => 
                c.name.toLowerCase().includes(this.state.centralSearch) ||
                c.location.toLowerCase().includes(this.state.centralSearch) ||
                (c.piso && c.piso.toLowerCase().includes(this.state.centralSearch))
            );

            if (filtered.length === 0 && this.state.centralSearch) {
                container.innerHTML = '<li class="empty-list">No se encontraron centrales</li>';
            }

            filtered.forEach(c => {
                const deviceCount = this.state.devices.filter(d => d.centralId === c.id).length;
                const li = document.createElement('li');
                li.className = c.id === this.state.currentCentralId ? 'active' : '';
                li.innerHTML = `
                    <span class="icon" style="color: var(--accent-yellow);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </span> 
                    <span class="name">${c.name}</span>
                    <span class="count-pill">${deviceCount}</span>
                `;
                li.onclick = () => {
                    if (this.state.currentCentralId === c.id) {
                        this.state.currentCentralId = null;
                    } else {
                        this.state.currentCentralId = c.id;
                    }
                    this.saveState();
                    this.closeModals();
                    this.render();
                };
                container.appendChild(li);
            });
        };

        renderTo(list);
        renderTo(mobileList);
    }

    renderCurrentCentral() {
        const central = this.state.centrales.find(c => c.id === this.state.currentCentralId);
        const details = document.getElementById('central-details');

        if (!central) {
            return;
        }

        // REPARAR DOM SI FUE SOBRESCRITO O ES UNA VERSIÓN ANTIGUA
        if (!document.getElementById('devices-grid') || !document.querySelector('.central-title-banner')) {
            console.log('Restaurando estructura base de detalles de central');
            details.innerHTML = `
                <div class="central-info glass">
                    <div class="central-title-banner">
                        <h2 id="current-central-name">Seleccione una Central</h2>
                    </div>
                    <div class="central-actions-row">
                        <button id="print-central-btn" class="secondary-btn btn-sm">Imprimir PDF 📄</button>
                        <button id="edit-central-btn" class="secondary-btn btn-sm admin-only">Editar ✏️</button>
                        <button id="delete-central-btn" class="secondary-btn btn-sm danger admin-only">Eliminar 🗑️</button>
                    </div>
                    <div class="info-grid">
                        <div class="info-item"><strong>Ubicación:</strong> <span id="info-ub">--</span></div>
                        <div class="info-item"><strong>IP:</strong> <span id="info-ip">--</span></div>
                        <div class="info-item"><strong>Rack:</strong> <span id="info-rack">--</span></div>
                        <div class="info-item"><strong>Piso:</strong> <span id="info-piso">--</span></div>
                        <div class="info-item"><strong>Batería:</strong> <span id="info-bat">--%</span></div>
                    </div>
                </div>

                <div class="summary-section glass">
                    <h4>Resumen de Dispositivos</h4>
                    <div id="type-summary-grid" class="summary-grid">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>

                <div class="devices-header">
                    <div class="flex-row gap-m">
                        <h3>Dispositivos Instalados</h3>
                        <div class="search-box glass-mini">
                            <input type="text" id="device-search" placeholder="🔍 Filtrar dispositivos...">
                        </div>
                    </div>
                    <div class="flex-row gap-s">
                        <button id="reorder-mode-btn" class="secondary-btn admin-only" onclick="app.toggleReorderMode()">Reordenar ↕️</button>
                        <button id="add-device-btn" class="primary-btn admin-only">Adicionar Dispositivo</button>
                    </div>
                </div>

                <div id="devices-grid" class="devices-grid">
                    <!-- Se llenará dinámicamente -->
                </div>
            `;
            // Re-vincular eventos y aplicar permisos a los nuevos elementos
            document.getElementById('print-central-btn').addEventListener('click', () => this.generateSpecificReport());
            document.getElementById('edit-central-btn').addEventListener('click', () => this.openCentralModal(true));
            document.getElementById('delete-central-btn').addEventListener('click', () => this.deleteCentral());
            document.getElementById('add-device-btn').addEventListener('click', () => this.openDeviceModal());
            document.getElementById('device-search').addEventListener('input', (e) => {
                this.state.deviceSearch = e.target.value.toLowerCase();
                this.renderCurrentCentral();
            });
            document.getElementById('current-central-name').addEventListener('click', () => {
                this.state.currentCentralId = null;
                this.render();
            });
            this.applyPermissions();
        }

        
        document.getElementById('current-central-name').innerText = central.name;
        document.getElementById('info-ub').innerText = central.location;
        document.getElementById('info-ip').innerText = central.ip;
        document.getElementById('info-rack').innerText = central.rack;
        document.getElementById('info-piso').innerText = central.piso || '--';
        document.getElementById('info-bat').innerText = `${central.battery}%`;

        // Refrescar estado del botón de reordenar
        const reorderBtn = document.getElementById('reorder-mode-btn');
        if (reorderBtn) {
            reorderBtn.innerText = this.state.reorderMode ? 'Guardar Orden ✅' : 'Reordenar ↕️';
            reorderBtn.classList.toggle('active-mode', this.state.reorderMode);
        }

        const grid = document.getElementById('devices-grid');
        grid.innerHTML = '';
        let devices = this.state.devices.filter(d => d.centralId === central.id);

        // Apply search filter
        if (this.state.deviceSearch) {
            devices = devices.filter(d => 
                d.type.toLowerCase().includes(this.state.deviceSearch) ||
                d.location.toLowerCase().includes(this.state.deviceSearch)
            );
        }

        // Sort: displayOrder first, then type/location as fallback
        devices.sort((a, b) => {
            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                return a.displayOrder - b.displayOrder;
            }
            const typeCompare = a.type.localeCompare(b.type);
            if (typeCompare !== 0) return typeCompare;
            return a.location.localeCompare(b.location);
        });
        
        if (devices.length === 0) {
            const msg = this.state.deviceSearch ? 'No se encontraron dispositivos' : 'No hay dispositivos registrados en esta central.';
            grid.innerHTML = `<div class="empty-state">${msg}</div>`;
        } else {
            devices.forEach((d, index) => {
                const card = document.createElement('div');
                card.className = `device-card glass staggered-fade-in ${this.state.reorderMode ? 'reorder-active' : ''}`;
                card.setAttribute('data-id', d.id);
                card.style.animationDelay = `${index * 0.05}s`;
                card.innerHTML = `
                    <div class="drag-handle admin-only ${this.state.reorderMode ? '' : 'hidden'}">⋮⋮</div>
                    <div class="device-icon-wrapper">${this.getDeviceIcon(d.type)}</div>
                    <div class="device-main-info">
                        <h4>${d.type.toUpperCase()}</h4>
                        <div class="device-meta">
                            <p class="full-row">📍 ${d.location} (Piso ${d.piso || '-'})</p>
                            <p class="${d.battery < 20 ? 'low-battery' : ''}">🔋 ${d.battery}%</p>
                             <p>📅 ${d.installationDate}</p>
                             <p class="full-row status-online" style="color: #10b981; font-weight: 600; font-size: 0.7rem; margin-top: 4px;"><span class="pulse-dot">●</span> En línea</p>
                        </div>
                    </div>
                    <div class="device-actions admin-only">
                        <button onclick="app.openMaintenanceModal('${d.id}')" class="icon-btn info" title="Historial">📋</button>
                        <button onclick="app.openDeviceModal(true, '${d.id}')" class="icon-btn edit">✏️</button>
                        <button onclick="app.deleteDevice('${d.id}')" class="icon-btn danger">🗑️</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            if (this.state.reorderMode) {
                this.initSortable();
            }
        }
    }

    toggleReorderMode() {
        if (this.state.user.role !== 'admin') return;
        this.state.reorderMode = !this.state.reorderMode;
        
        const btn = document.getElementById('reorder-mode-btn');
        if (btn) {
            btn.innerText = this.state.reorderMode ? 'Guardar Orden ✅' : 'Reordenar ↕️';
            btn.classList.toggle('active-mode', this.state.reorderMode);
        }

        this.renderCurrentCentral();
        this.applyPermissions();

        if (!this.state.reorderMode) {
            // Se guardó el orden al desactivar el modo
            this.saveState();
        }
    }

    initSortable() {
        const grid = document.getElementById('devices-grid');
        if (!grid || typeof Sortable === 'undefined') return;

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }

        this.sortableInstance = new Sortable(grid, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: () => {
                const updatedDevices = [...this.state.devices];
                const cards = grid.querySelectorAll('.device-card');
                
                cards.forEach((card, index) => {
                    const id = card.getAttribute('data-id');
                    const deviceIndex = updatedDevices.findIndex(d => d.id === id);
                    if (deviceIndex !== -1) {
                        updatedDevices[deviceIndex].displayOrder = index;
                    }
                });

                this.state.devices = updatedDevices;
                // No guardamos inmediatamente en Firebase para evitar spam, 
                // pero si el usuario confía en el guardado automático lo hacemos.
                // En este caso, saveState() se llamará al salir del modo reordenar o al final.
            }
        });
    }

    getDeviceIcon(type) {
        switch(type) {
            case 'sirena': return '📢';
            case 'teclado': return '⌨️';
            case 'panico': return '🛑';
            case 'repetidor': return '📡';
            case 'humo': return '☁️';
            case 'camera': return '📹';
            case 'switch': return '🔌';
            case 'nvr': return '🖥️';
            default: return '📦';
        }
    }

    updateStats() {
        document.getElementById('total-centrales').innerText = this.state.centrales.length;
        document.getElementById('total-dispositivos').innerText = this.state.devices.length;

        // Debug Badge Update (Removed)

        const globalSummaryGrid = document.getElementById('global-summary-grid');
        if (globalSummaryGrid) {
            globalSummaryGrid.innerHTML = '';
            const globalCounts = {};
            this.state.devices.forEach(d => {
                globalCounts[d.type] = (globalCounts[d.type] || 0) + 1;
            });

            const types = [
                { id: 'sirena', name: 'Sirenas' },
                { id: 'teclado', name: 'Teclados' },
                { id: 'panico', name: 'B. Pánico' },
                { id: 'repetidor', name: 'Repetidores' },
                { id: 'humo', name: 'S. Humo' }
            ];

            types.forEach(type => {
                if (globalCounts[type.id]) {
                    const item = document.createElement('div');
                    item.className = 'summary-item';
                    item.innerHTML = `
                        <span class="icon">${this.getDeviceIcon(type.id)}</span>
                        <span class="count">${globalCounts[type.id]}</span>
                        <span class="label">${type.name}</span>
                    `;
                    globalSummaryGrid.appendChild(item);
                }
            });

            // Añadir CCTV al resumen global
            const cctvStats = [
                { id: 'camera', name: 'Cámaras', count: this.state.cameras.length },
                { id: 'switch', name: 'Switches', count: this.state.poeSwitches.length },
                { id: 'nvr', name: 'Grabadores', count: this.state.nvrs.length }
            ];

            cctvStats.forEach(stat => {
                if (stat.count > 0) {
                    const item = document.createElement('div');
                    item.className = 'summary-item';
                    item.style.borderColor = 'var(--hik-red)';
                    item.innerHTML = `
                        <span class="icon">${this.getDeviceIcon(stat.id)}</span>
                        <span class="count">${stat.count}</span>
                        <span class="label">${stat.name}</span>
                    `;
                    globalSummaryGrid.appendChild(item);
                }
            });
        }

        // --- NEW: Global Management Report (Consolidado Global) ---
        this.renderGlobalConsolidado();

        // Specific Central Summary Grid
        const summaryGrid = document.getElementById('type-summary-grid');
        if (!summaryGrid) return;
        summaryGrid.innerHTML = '';
        
        const currentDevices = this.state.devices.filter(d => d.centralId === this.state.currentCentralId);
        const counts = {};
        currentDevices.forEach(d => {
            counts[d.type] = (counts[d.type] || 0) + 1;
        });

        const types = [
            { id: 'sirena', name: 'Sirenas' },
            { id: 'teclado', name: 'Teclados' },
            { id: 'panico', name: 'B. Pánico' },
            { id: 'repetidor', name: 'Repetidores' },
            { id: 'humo', name: 'S. Humo' }
        ];

        types.forEach(type => {
            if (counts[type.id]) {
                const item = document.createElement('div');
                item.className = 'summary-item';
                item.innerHTML = `
                    <span class="icon">${this.getDeviceIcon(type.id)}</span>
                    <span class="count">${counts[type.id]}</span>
                    <span class="label">${type.name}</span>
                `;
                summaryGrid.appendChild(item);
            }
        });
    }

    renderGlobalConsolidado() {
        const alertsContainer = document.getElementById('alertas-bateria');
        const recentContainer = document.getElementById('ultimas-instalaciones');
        
        if (!alertsContainer || !recentContainer) return;

        // 1. Alert Log: Battery < 20%
        const lowBatteryDevices = this.state.devices.filter(d => d.battery < 20);
        alertsContainer.innerHTML = '';
        
        if (lowBatteryDevices.length === 0) {
            alertsContainer.innerHTML = '<p class="empty-msg">✅ Todos los equipos tienen batería óptima.</p>';
        } else {
            lowBatteryDevices.forEach(d => {
                const central = this.state.centrales.find(c => c.id === d.centralId);
                const div = document.createElement('div');
                div.className = 'consolidated-item alert-item';
                div.innerHTML = `
                    <div class="item-icon">${this.getDeviceIcon(d.type)}</div>
                    <div class="item-info">
                        <strong>${d.type.toUpperCase()} - ${d.location} (Piso ${d.piso || '-'})</strong>
                        <small>Central: ${central ? central.name : 'Desconocida'}</small>
                    </div>
                    <div class="item-status low-battery">🔋 ${d.battery}%</div>
                `;
                alertsContainer.appendChild(div);
            });
        }

        // 2. Recent Installations (Last 10)
        const recentDevices = [...this.state.devices]
            .sort((a, b) => new Date(b.installationDate) - new Date(a.installationDate))
            .slice(0, 10);
            
        recentContainer.innerHTML = '';
        if (recentDevices.length === 0) {
            recentContainer.innerHTML = '<p class="empty-msg">No hay registros recientes.</p>';
        } else {
            recentDevices.forEach(d => {
                const central = this.state.centrales.find(c => c.id === d.centralId);
                const div = document.createElement('div');
                div.className = 'consolidated-item';
                div.innerHTML = `
                    <div class="item-icon">${this.getDeviceIcon(d.type)}</div>
                    <div class="item-info">
                        <strong>${d.type.toUpperCase()} - ${d.location} (Piso ${d.piso || '-'})</strong>
                        <small>Instalado: ${d.installationDate} | Central: ${central ? central.name : '-'}</small>
                    </div>
                `;
                recentContainer.appendChild(div);
            });
        }
        // 3. IPs List (Global)
        const ipsContainer = document.getElementById('lista-ips-global');
        if (ipsContainer) {
            ipsContainer.innerHTML = '';
            this.state.centrales.forEach(c => {
                const div = document.createElement('div');
                div.className = 'consolidated-item';
                div.innerHTML = `
                    <div class="item-icon" style="color: var(--hik-red);">🌐</div>
                    <div class="item-info">
                        <strong>${c.name}</strong>
                        <small>📍 ${c.location} | Piso: ${c.piso || '-'} | 📂 ${c.rack}</small>
                    </div>
                    <div class="item-status" style="color: var(--hik-text); font-family: monospace; font-size: 0.85rem;">${c.ip}</div>
                `;
                ipsContainer.appendChild(div);
            });
        }
    }

    // --- LÓGICA DE MANTENIMIENTO ---
    openMaintenanceModal(deviceId) {
        this.currentMaintenanceDeviceId = deviceId;
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('maintenance-modal');
        document.getElementById('maint-device-id').value = deviceId;
        
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        this.renderMaintenanceLogs(deviceId);
    }

    renderMaintenanceLogs(deviceId) {
        // Buscar en dispositivos de alarma o CCTV
        let device = this.state.devices.find(d => d.id === deviceId);
        if (!device) {
            device = this.state.cameras.find(d => d.id === deviceId) || 
                     this.state.poeSwitches.find(d => d.id === deviceId) || 
                     this.state.nvrs.find(d => d.id === deviceId);
        }
        
        const container = document.getElementById('maintenance-list');
        if (!container) return;
        container.innerHTML = '';

        if (!device.maintenanceLogs || device.maintenanceLogs.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay registros de mantenimiento para este equipo.</p>';
            return;
        }

        device.maintenanceLogs.forEach(log => {
            if (!log.id) log.id = log.date; 
        });

        device.maintenanceLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(log => {
            const div = document.createElement('div');
            div.className = 'maintenance-entry';
            div.innerHTML = `
                <div class="m-entry-header">
                    <span class="m-tech">👤 ${log.technician}</span>
                    <span class="m-date">📅 ${new Date(log.date).toLocaleDateString()}</span>
                </div>
                <div class="m-action">${log.action}</div>
                <div class="m-actions admin-only" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                    <button class="icon-btn edit" onclick="app.editMaintenanceLog('${deviceId}', '${log.id}')" style="width: 28px; height: 28px; font-size: 0.8rem;">✏️</button>
                    <button class="icon-btn danger" onclick="app.deleteMaintenanceLog('${deviceId}', '${log.id}')" style="width: 28px; height: 28px; font-size: 0.8rem;">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });

        this.applyPermissions(); // Hide edit/delete if not admin
    }

    editMaintenanceLog(deviceId, logId) {
        let device = this.state.devices.find(d => d.id === deviceId);
        if (!device) {
            device = this.state.cameras.find(d => d.id === deviceId) || 
                     this.state.poeSwitches.find(d => d.id === deviceId) || 
                     this.state.nvrs.find(d => d.id === deviceId);
        }
        if (!device || !device.maintenanceLogs) return;
        const log = device.maintenanceLogs.find(l => l.id === logId);
        if (!log) return;
        
        document.getElementById('maint-log-id').value = log.id;
        const form = document.getElementById('maintenance-form');
        form.technician.value = log.technician;
        form.action.value = log.action;
        
        const title = document.getElementById('maint-form-title');
        if (title) title.innerText = 'Editar Registro';
        const btn = document.getElementById('maint-submit-btn');
        if (btn) btn.innerText = 'Guardar Cambios';
        const cancelBtn = document.getElementById('maint-cancel-btn');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
    }

    cancelEditMaintenance() {
        const form = document.getElementById('maintenance-form');
        if (form) form.reset();
        const hiddenId = document.getElementById('maint-log-id');
        if (hiddenId) hiddenId.value = '';
        
        const title = document.getElementById('maint-form-title');
        if (title) title.innerText = 'Nuevo Registro';
        const btn = document.getElementById('maint-submit-btn');
        if (btn) btn.innerText = 'Añadir Registro';
        const cancelBtn = document.getElementById('maint-cancel-btn');
        if (cancelBtn) cancelBtn.classList.add('hidden');
    }

    deleteMaintenanceLog(deviceId, logId) {
        if (!confirm('¿Seguro que desea eliminar este registro de mantenimiento?')) return;
        let device = this.state.devices.find(d => d.id === deviceId);
        if (!device) {
            device = this.state.cameras.find(d => d.id === deviceId) || 
                     this.state.poeSwitches.find(d => d.id === deviceId) || 
                     this.state.nvrs.find(d => d.id === deviceId);
        }
        if (!device || !device.maintenanceLogs) return;
        
        device.maintenanceLogs = device.maintenanceLogs.filter(l => l.id !== logId);
        this.saveState();
        this.renderMaintenanceLogs(deviceId);
    }

    handleMaintenanceSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const deviceId = document.getElementById('maint-device-id').value;
        const logId = document.getElementById('maint-log-id').value;
        let device = this.state.devices.find(d => d.id === deviceId);
        if (!device) {
            device = this.state.cameras.find(d => d.id === deviceId) || 
                     this.state.poeSwitches.find(d => d.id === deviceId) || 
                     this.state.nvrs.find(d => d.id === deviceId);
        }

        if (!device) return;
        if (!device.maintenanceLogs) device.maintenanceLogs = [];

        if (logId) {
            const index = device.maintenanceLogs.findIndex(l => l.id === logId);
            if (index !== -1) {
                device.maintenanceLogs[index].technician = formData.get('technician');
                device.maintenanceLogs[index].action = formData.get('action');
            }
        } else {
            const newEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                technician: formData.get('technician'),
                action: formData.get('action'),
                date: new Date().toISOString()
            };
            device.maintenanceLogs.push(newEntry);
        }

        this.saveState();
        this.renderMaintenanceLogs(deviceId);
        this.cancelEditMaintenance();
        alert(logId ? 'Registro actualizado exitosamente.' : 'Registro añadido exitosamente.');
    }

    // --- LÓGICA DE BÚSQUEDA GLOBAL ---
    handleGlobalSearch() {
        const input = document.getElementById('global-search-input');
        const query = input.value.toLowerCase().trim();
        const resultsContainer = document.getElementById('global-summary-container');
        
        if (!query) {
            resultsContainer.style.display = 'block';
            this.updateStats(); // Standard view
            return;
        }

        // Hide normal summary grid and show results
        resultsContainer.style.display = 'block'; // Or create a new container
        this.renderSearchResults(query);
    }

    renderSearchResults(query) {
        const grid = document.getElementById('global-summary-grid');
        grid.innerHTML = `<h3 style="grid-column: 1/-1; margin-bottom: 20px;">Resultados para: "${query}"</h3>`;
        
        const filtered = this.state.devices.filter(d => 
            d.location.toLowerCase().includes(query) || 
            d.type.toLowerCase().includes(query) ||
            (d.piso && d.piso.toLowerCase().includes(query))
        );

        filtered.forEach(d => {
            const central = this.state.centrales.find(c => c.id === d.centralId);
            const card = document.createElement('div');
            card.className = 'device-card search-result-card';
            card.innerHTML = `
                <div class="device-icon">${this.getDeviceIcon(d.type)}</div>
                <div class="device-info">
                    <div class="device-type">${d.type.toUpperCase()}</div>
                    <div class="device-loc">${d.location} (Piso ${d.piso || '-'})</div>
                    <div class="device-central-name" style="font-size: 0.7rem; color: var(--hik-red);">Central: ${central ? central.name : '-'}</div>
                </div>
                <div class="device-status">
                    <span class="status-dot online"></span>
                    <span class="battery-val ${d.battery < 20 ? 'low' : ''}">${d.battery}% 🔋</span>
                </div>
                <div class="device-actions">
                    <button onclick="app.openMaintenanceModal('${d.id}')" class="icon-btn info">📋</button>
                    <button onclick="app.navigateToDevice('${d.centralId}', '${d.id}')" class="icon-btn go">➡️</button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Buscar en CCTV
        const cctvFiltered = [
            ...this.state.cameras.map(c => ({...c, cctvType: 'camera'})),
            ...this.state.poeSwitches.map(s => ({...s, cctvType: 'switch'})),
            ...this.state.nvrs.map(n => ({...n, cctvType: 'nvr'}))
        ].filter(i => 
            i.name.toLowerCase().includes(query) || 
            i.location.toLowerCase().includes(query) ||
            i.ip.toLowerCase().includes(query)
        );

        cctvFiltered.forEach(i => {
            const card = document.createElement('div');
            card.className = 'device-card search-result-card';
            card.style.borderLeftColor = 'var(--hik-red)';
            card.innerHTML = `
                <div class="device-icon">${this.getDeviceIcon(i.cctvType)}</div>
                <div class="device-info">
                    <div class="device-type">${i.cctvType.toUpperCase()}</div>
                    <div class="device-loc">${i.name} - ${i.location}</div>
                    <div class="device-central-name" style="font-size: 0.7rem; color: var(--hik-red);">Infraestructura CCTV</div>
                </div>
                <div class="device-status">
                    <span class="status-dot online"></span>
                    <span style="font-size: 0.75rem;">${i.ip}</span>
                </div>
                <div class="device-actions">
                    <button onclick="app.openMaintenanceModal('${i.id}')" class="icon-btn info">📋</button>
                    <button onclick="app.switchTab('cctv')" class="icon-btn go">➡️</button>
                </div>
            `;
            grid.appendChild(card);
        });

        if (filtered.length === 0 && cctvFiltered.length === 0) {
            grid.innerHTML += '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No se encontraron dispositivos o cámaras coincidentes.</p>';
        }
    }

    navigateToDevice(centralId, deviceId) {
        this.state.currentCentralId = centralId;
        this.saveState();
        this.switchTab('home');
        this.renderCurrentCentral();
        // Option: highlight device
    }

    // CCTV Methods
    openCctvModal(type, isEdit = false, id = null) {
        const modal = document.getElementById('cctv-modal');
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('cctv-form');
        const title = document.getElementById('cctv-modal-title');
        const extraFields = document.getElementById('cctv-extra-fields');

        this.editingCctvId = id;
        form['cctv-type'].value = type;
        extraFields.innerHTML = '';

        const deleteBtn = document.getElementById('cctv-delete-btn');
        if (deleteBtn) {
            if (isEdit && id) {
                deleteBtn.classList.remove('hidden');
            } else {
                deleteBtn.classList.add('hidden');
            }
        }

        const typeLabels = { camera: 'Cámara', switch: 'Switch PoE', nvr: 'NVR' };
        title.innerText = (isEdit ? 'Editar ' : 'Nuevo ') + typeLabels[type];

        // Dynamic fields based on type
        if (type === 'camera') {
            extraFields.innerHTML = `
                <div class="input-group">
                    <label>Canal / NVR</label>
                    <input type="text" name="channel" placeholder="Ej: NVR 1 - Ch 4">
                </div>
                <div class="input-group">
                    <label>Modelo</label>
                    <input type="text" name="model" placeholder="Ej: DS-2CD2143G0-I">
                </div>
                <div class="input-group">
                    <label>MegaPíxeles</label>
                    <input type="text" name="megapixels" placeholder="Ej: 2, 4, 8...">
                </div>
            `;
        } else if (type === 'switch') {
            extraFields.innerHTML = `
                <div class="input-group">
                    <label>Número de Puertos</label>
                    <input type="number" name="ports" placeholder="Ej: 8, 16, 24">
                </div>
            `;
        } else if (type === 'nvr') {
            extraFields.innerHTML = `
                <div class="input-group">
                    <label>Canales Totales</label>
                    <input type="number" name="channels" placeholder="Ej: 16">
                </div>
                <div class="input-group">
                    <label>Capacidad Disco (TB)</label>
                    <input type="text" name="disk" placeholder="Ej: 4TB">
                </div>
            `;
        }

        const photoSection = document.getElementById('camera-photo-section');
        if (type === 'camera') {
            photoSection?.classList.remove('hidden');
        } else {
            photoSection?.classList.add('hidden');
        }

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        if (isEdit && id) {
            const collection = type === 'camera' ? this.state.cameras : (type === 'switch' ? this.state.poeSwitches : this.state.nvrs);
            const item = collection.find(i => i.id === id);
            if (item) {
                form.name.value = item.name;
                form.ip.value = item.ip;
                form.location.value = item.location;
                form.piso.value = item.piso || '';
                if (type === 'camera') {
                    form.channel.value = item.channel || '';
                    form.model.value = item.model || '';
                    form.megapixels.value = item.megapixels || '';
                } else if (type === 'switch') {
                    form.ports.value = item.ports || '';
                } else if (type === 'nvr') {
                    form.channels.value = item.channels || '';
                    form.disk.value = item.disk || '';
                }
                
                if (type === 'camera' && item.photo) {
                    this.currentCameraPhoto = item.photo;
                    const preview = document.getElementById('camera-photo-preview');
                    const img = preview.querySelector('img');
                    img.src = item.photo;
                    preview.classList.remove('hidden');
                }
            }
        } else {
            form.reset();
            form['cctv-type'].value = type;
            this.clearCameraPhoto();
        }
    }

    handleCameraPhoto(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            // Comprimir imagen para ahorrar espacio en JSON
            this.currentCameraPhoto = await this.compressImage(base64, 800, 0.7);
            
            const preview = document.getElementById('camera-photo-preview');
            const img = preview.querySelector('img');
            img.src = this.currentCameraPhoto;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    clearCameraPhoto() {
        this.currentCameraPhoto = null;
        const preview = document.getElementById('camera-photo-preview');
        if (preview) {
            preview.classList.add('hidden');
            preview.querySelector('img').src = '';
        }
        const input = document.getElementById('camera-photo-input');
        if (input) input.value = '';
    }

    async compressImage(base64, maxWidth, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    }

    handleCctvSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const type = formData.get('cctv-type');
        
        const data = {
            id: this.editingCctvId || Date.now().toString(),
            name: formData.get('name'),
            ip: formData.get('ip'),
            location: formData.get('location'),
            piso: formData.get('piso'),
            centralId: this.state.currentCentralId // Vincular con la central actual
        };

        if (type === 'camera') {
            data.channel = formData.get('channel');
            data.model = formData.get('model');
            data.megapixels = formData.get('megapixels');
            data.photo = this.currentCameraPhoto;
        } else if (type === 'switch') {
            data.ports = formData.get('ports');
        } else if (type === 'nvr') {
            data.channels = formData.get('channels');
            data.disk = formData.get('disk');
        }

        const stateKey = type === 'camera' ? 'cameras' : (type === 'switch' ? 'poeSwitches' : 'nvrs');
        
        if (this.editingCctvId) {
            const index = this.state[stateKey].findIndex(i => i.id === this.editingCctvId);
            this.state[stateKey][index] = data;
        } else {
            this.state[stateKey].push(data);
        }

        this.saveState();
        this.closeModals();
        this.render();
        alert('✅ Datos grabados correctamente.');
    }

    deleteCctv(type, id) {
        if (!confirm('¿Está seguro de eliminar este dispositivo?')) return;
        const stateKey = type === 'camera' ? 'cameras' : (type === 'switch' ? 'poeSwitches' : 'nvrs');
        this.state[stateKey] = this.state[stateKey].filter(i => i.id !== id);
        this.saveState();
        this.renderCCTVTab();
    }

    renderCCTVTab() {
        const camerasGrid = document.getElementById('cameras-grid');
        const switchesGrid = document.getElementById('switches-grid');
        const nvrsGrid = document.getElementById('nvrs-grid');
        const isAdmin = this.state.user?.role === 'admin';

        if (!camerasGrid || !switchesGrid || !nvrsGrid) return;

        const renderItems = (items, grid, type) => {
            grid.innerHTML = items.length ? '' : `<p class="empty-msg">No hay dispositivos registrados.</p>`;
            items.forEach(item => {
                const central = this.state.centrales.find(c => c.id === item.centralId);
                const card = document.createElement('div');
                card.className = 'device-card glass';
                card.innerHTML = `
                    ${type === 'camera' && item.photo ? `
                        <div class="cctv-card-photo">
                            <img src="${item.photo}" alt="${item.name}">
                        </div>
                    ` : ''}
                    <div class="cctv-badge badge-${type}">${type === 'camera' ? 'CAMARA' : type.toUpperCase()}</div>
                    <div class="device-main-info">
                        <div class="cctv-card-header">
                            <span style="font-size: 1.2rem;">${this.getDeviceIcon(type)}</span>
                            <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h4>
                        </div>
                        <div class="device-meta">
                            <p><strong>IP:</strong> ${item.ip}</p>
                            <p><strong>Conexión Rack:</strong> ${item.location} (Piso ${item.piso || '-'})</p>
                            <p class="full-row" style="color: var(--hik-red); font-weight: 600;">
                                🏢 Sede: ${central ? central.name : 'General'}
                            </p>
                            ${type === 'camera' ? `<p><strong>Canal:</strong> ${item.channel || '--'}</p><p><strong>Modelo:</strong> ${item.model || '--'}</p><p><strong>Resolución:</strong> ${item.megapixels ? item.megapixels + ' MP' : '--'}</p>` : ''}
                            ${type === 'switch' ? `<p class="full-row"><strong>Puertos:</strong> ${item.ports || '--'}</p>` : ''}
                            ${type === 'nvr' ? `<p><strong>Canales:</strong> ${item.channels || '--'}</p><p><strong>Disco:</strong> ${item.disk || '--'}</p>` : ''}
                        </div>
                    </div>
                    <div class="device-actions admin-only">
                        <button class="icon-btn info" title="Historial" onclick="app.openMaintenanceModal('${item.id}')">📋</button>
                        <button class="icon-btn edit" onclick="app.openCctvModal('${type}', true, '${item.id}')">✏️</button>
                        <button class="icon-btn danger" onclick="app.deleteCctv('${type}', '${item.id}')">🗑️</button>
                    </div>
                `;
                grid.appendChild(card);
            });
            this.applyPermissions();
        };

        renderItems(this.state.cameras, camerasGrid, 'camera');
        renderItems(this.state.poeSwitches, switchesGrid, 'switch');
        renderItems(this.state.nvrs, nvrsGrid, 'nvr');
    }

    generateCctvReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Reporte de Infraestructura CCTV', 14, 20);
        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);

        // Resumen
        doc.text(`Total Cámaras: ${this.state.cameras.length} | Switches: ${this.state.poeSwitches.length} | Grabadores: ${this.state.nvrs.length}`, 14, 40);

        let currentY = 50;

        // Cámaras con Foto
        if (this.state.cameras.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(230, 0, 18);
            doc.text('DETALLE DE CÁMARAS', 14, currentY);
            doc.setTextColor(0, 0, 0);
            currentY += 10;

            this.state.cameras.forEach((cam, index) => {
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`${index + 1}. ${cam.name}`, 14, currentY);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.text(`IP: ${cam.ip} | Piso: ${cam.piso || '-'} | Conexión Rack: ${cam.location} | Canal: ${cam.channel || '--'} | Modelo: ${cam.model || '--'} | Res: ${cam.megapixels ? cam.megapixels + ' MP' : '--'}`, 14, currentY + 5);
                
                if (cam.photo) {
                    try {
                        doc.addImage(cam.photo, 'JPEG', 14, currentY + 8, 60, 34);
                        currentY += 45;
                    } catch (e) {
                        currentY += 12;
                    }
                } else {
                    currentY += 12;
                }
            });
        }

        // Switches y NVRs en tablas simples
        if (this.state.poeSwitches.length > 0) {
            if (currentY > 220) { doc.addPage(); currentY = 20; }
            currentY += 10;
            doc.setFontSize(14);
            doc.setTextColor(230, 0, 18);
            doc.text('SWITCHES POE', 14, currentY);
            doc.setTextColor(0, 0, 0);
            
            const switchData = this.state.poeSwitches.map(s => [s.name, s.ip, s.piso || '-', s.location, s.ports]);
            doc.autoTable({
                head: [['Nombre', 'IP', 'Piso', 'Conexión Rack', 'Puertos']],
                body: switchData,
                startY: currentY + 5,
                theme: 'striped'
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        if (this.state.nvrs.length > 0) {
            if (currentY > 220) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.setTextColor(230, 0, 18);
            doc.text('GRABADORES (NVR)', 14, currentY);
            doc.setTextColor(0, 0, 0);
            
            const nvrData = this.state.nvrs.map(n => [n.name, n.ip, n.piso || '-', n.location, n.channels, n.disk]);
            doc.autoTable({
                head: [['Nombre', 'IP', 'Piso', 'Conexión Rack', 'Canales', 'Disco']],
                body: nvrData,
                startY: currentY + 5,
                theme: 'striped'
            });
        }

        this._showPDF(doc, 'reporte_infraestructura_cctv.pdf');
    }

    debugState() {
        let report = `--- DIAGNÓSTICO DE DATOS ---\n`;
        report += `Total Centrales: ${this.state.centrales.length}\n`;
        report += `Total Dispositivos: ${this.state.devices.length}\n`;
        report += `Total Cámaras: ${this.state.cameras.length}\n`;
        report += `Total Switches PoE: ${this.state.poeSwitches.length}\n`;
        report += `Total NVRs: ${this.state.nvrs.length}\n`;
        report += `\n--- DETALLE CÁMARAS ---\n`;
        
        if (this.state.cameras.length === 0) {
            report += "No hay cámaras en el estado actual.\n";
        } else {
            this.state.cameras.forEach((c, idx) => {
                const central = this.state.centrales.find(cen => cen.id === c.centralId);
                report += `${idx+1}. Ubicación: ${c.location} | CentralID: ${c.centralId} | Central Name: ${central ? central.name : 'NO ENCONTRADA'}\n`;
            });
        }
        
        report += `\n--- CENTRAL SELECCIONADA ---\n`;
        report += `ID: ${this.state.currentCentralId}\n`;
        
        alert(report);
        console.log("Estado Completo:", this.state);
    }
}
// Inicializar
window.app = new AlarmApp();
