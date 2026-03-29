class AlarmApp {
    constructor() {
        this.state = {
            user: null, // { username, role }
            centrales: [],
            devices: [],
            users: [], // { id, username, password, role }
            currentCentralId: null,
            centralSearch: '',
            deviceSearch: '',
            reorderMode: false
        };
        this.loadInitialData();
        this.initEventListeners();
        this.initFirebase();
        
        // No bloqueamos el inicio por el chequeo de versión
        this.checkForUpdates().catch(e => console.warn('Actualización skip:', e.message));
    }

    initFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            this.db = firebase.database();
            this.cloudRef = this.db.ref('alarmState');
            
            // Listener para cambios en la nube
            this.cloudRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && (data.centrales || data.devices)) {
                    console.log('Datos recibidos de Firebase:', 
                        (data.centrales?.length || 0), 'centrales,', 
                        (data.devices?.length || 0), 'dispositivos');
                    
                    const remoteDevices = data.devices || [];
                    const localDevices = this.state.devices || [];
                    
                    // SEGURIDAD: No sobrescribir automáticamente si lo remoto tiene mucho menos que lo local
                    // y lo local ya tiene datos (evita que un login en blanco borre todo)
                    if (localDevices.length > 5 && remoteDevices.length < (localDevices.length / 2)) {
                        console.warn('¡Sincronización automática RECHAZADA! Los datos de la nube parecen incompletos.');
                        // Opcional: Avisar al usuario
                        return; 
                    }

                    this.state.centrales = data.centrales || [];
                    this.state.devices = remoteDevices;
                    this.state.users = data.users || [];
                    this.saveState(true); 
                    this.render();
                } else {
                    console.log('Firebase está vacío o no es válido, manteniendo datos locales.');
                }
            });
            this.isCloudEnabled = true;
            document.getElementById('debug-firebase').innerText = "Firebase: ✅ DB Conectada";
            console.log("Firebase DB Conectada");
        } else {
            document.getElementById('debug-firebase').innerText = "Firebase: ❌ Error/Desconectado";
            console.warn("Firebase no inicializado: SDK no encontrado o configuración inválida.");
            this.isCloudEnabled = false;
        }
    }

    pushToCloud() {
        if (!this.isCloudEnabled) return alert('Firebase no está configurado');
        
        const localCount = this.state.devices.length;
        if (localCount === 0 && this.state.devices.length < 2) {
             if (!confirm('⚠️ ¡ALERTA! Vas a subir 0 dispositivos. Esto borrará TODO en la nube. ¿Estás seguro?')) return;
        }

        if (confirm(`¿Deseas subir tus datos locales a la nube? (${localCount} dispositivos). Esto sobrescribirá la nube.`)) {
            this.saveState(false);
            alert('Datos subidos correctamente a la nube.');
        }
    }

    async restoreFromDataJson() {
        if (confirm('¿Deseas recargar los datos del archivo data.json? Esto puede sobreescribir tus cambios locales.')) {
            await this.fetchDataFromServer();
            this.saveState();
            this.render();
            alert('Datos restaurados desde data.json');
        }
    }

    async loadInitialData() {
        console.log('Cargando datos iniciales...');
        
        // 1. Cargar lo que haya en localStorage
        await this.loadState();
        
        // 2. Asegurar siempre usuarios básicos (admin/user) de inmediato
        this.bootstrapAdmin();

        // 3. Intentar cargar del servidor de forma asíncrona (no bloqueante)
        console.log('Intentando sincronizar con data.json...');
        this.fetchDataFromServer().then(() => {
            console.log('Sincronización con data.json completada');
            this.render();
        }).catch(e => {
            console.warn('data.json no disponible:', e.message);
            this.render();
        });

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
        try {
            const resp = await fetch('version.json?t=' + Date.now());
            const data = await resp.json();
            const currentVersion = localStorage.getItem('appVersion') || '1.0';
            
            if (data.version !== currentVersion) {
                console.log("Nueva versión detectada:", data.version);
                const banner = document.getElementById('update-banner');
                if (banner) {
                    banner.style.display = 'flex';
                    document.getElementById('new-version-text').innerText = data.version;
                }
            }
        } catch (e) {
            console.warn("No se pudo comprobar actualizaciones.");
        }
    }

    applyUpdate() {
        fetch('version.json')
            .then(r => r.json())
            .then(data => {
                localStorage.setItem('appVersion', data.version);
                window.location.reload(true);
            });
    }

    loadState() {
        try {
            const saved = localStorage.getItem('alarma-lg-state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.centrales = parsed.centrales || [];
                this.state.devices = parsed.devices || [];
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
        try {
            const response = await fetch('data.json');
            if (response.ok) {
                const data = await response.json();
                this.state.centrales = data.centrales || [];
                this.state.devices = data.devices || [];
                this.state.users = data.users || [];
                this.state.currentCentralId = data.currentCentralId || null;
                console.log('Datos cargados desde el servidor');
            }
        } catch (e) {
            console.error('Error al descargar datos del servidor:', e);
        }
    }

    saveState(skipCloud = false) {
        const dataToSave = {
            centrales: this.state.centrales,
            devices: this.state.devices,
            users: this.state.users,
            currentCentralId: this.state.currentCentralId
        };
        
        localStorage.setItem('alarma-lg-state', JSON.stringify(dataToSave));

        // Subir a la nube si está habilitado y no se pidió omitir
        if (this.isCloudEnabled && !skipCloud) {
            this.cloudRef.set(dataToSave)
                .then(() => console.log('Datos sincronizados en la nube'))
                .catch(e => console.error('Error al subir a la nube:', e));
        }
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

    emergencyLogin() {
        console.log('Login de Emergencia activado');
        this.state.user = { username: 'admin', role: 'admin' };
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        this.saveState(true); // Guardar sesión localmente
        this.render();
        alert('Acceso de Emergencia Concedido. Por favor, restaura tus datos desde la Nube o el Servidor.');
    }

    login() {
        const usernameInput = document.getElementById('username').value.trim().toLowerCase();
        const passwordInput = document.getElementById('password').value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value || 'user';

        console.log(`Intento de acceso: ${usernameInput} (${role})`);

        if (!usernameInput || !passwordInput) {
            alert('Por favor complete todos los campos');
            return;
        }

        // --- EMERGENCIA: Fallback directo si nada más funciona ---
        if (usernameInput === 'admin' && passwordInput === '1105' && role === 'admin') {
            console.log('Login exitoso (Fallback de Emergencia)');
            this.state.user = { username: 'admin', role: 'admin' };
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            this.render();
            return;
        }

        // Buscamos en los usuarios cargados
        const foundUser = this.state.users.find(u => 
            u.username.toLowerCase() === usernameInput && 
            u.password === passwordInput &&
            u.role === role
        );

        if (foundUser) {
            console.log('Acceso concedido');
            this.state.user = { username: foundUser.username, role: foundUser.role };
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            this.saveState(); // Guardar sesión
            this.render();
        } else {
            console.warn('Credenciales no válidas');
            alert('Usuario, contraseña o rol incorrectos');
        }
    }

    logout() {
        this.state.user = null;
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
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
        this.editingDeviceId = null;
        this.editingUserId = null;
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

    switchTab(tab) {
        if (!tab) return;
        
        // Update navigation UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === tab) {
                item.classList.add('active');
            }
        });

        const details = document.getElementById('central-details');
        
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
        } else if (tab === 'me') {
            this.renderMeTab();
        } else if (tab === 'service') {
            this.renderServiceTab();
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
                    <div class="me-menu-item" onclick="app.openUserManageModal()">
                        <span class="icon">👥</span>
                        <span class="label">Gestionar Usuarios</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item">
                        <span class="icon">⚙️</span>
                        <span class="label">Configuración</span>
                        <span class="arrow">›</span>
                    </div>
                    <div class="me-menu-item" onclick="app.pushToCloud()">
                        <span class="icon">☁️</span>
                        <span class="label">Subir datos locales a la nube</span>
                        <span class="arrow">↑</span>
                    </div>
                    <div class="me-menu-item" onclick="app.restoreFromDataJson()">
                        <span class="icon">📂</span>
                        <span class="label">Restaurar desde archivo servidor</span>
                        <span class="arrow">↓</span>
                    </div>
                    <div class="me-menu-item">
                        <span class="icon">ℹ️</span>
                        <span class="label">Acerca de AlarmaLG</span>
                        <span class="arrow">›</span>
                    </div>
                </div>

                <div class="logout-section">
                    <button class="logout-btn-full" onclick="app.logout()">Cerrar Sesión</button>
                    <p class="app-version">Versión 1.2.0-HikStyle</p>
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

    handleUserSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            id: this.editingUserId || Date.now().toString(),
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role')
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
            const data = JSON.parse(event.target.result);
            this.state.centrales = data.centrales || [];
            this.state.devices = data.devices || [];
            this.saveState();
            this.render();
            alert('Datos recuperados con éxito');
        };
        reader.readAsText(file);
    }

    async resetFromServer() {
        if (confirm('Esto borrará sus cambios locales y recargará los datos originales del servidor. ¿Continuar?')) {
            localStorage.removeItem('alarma-lg-state');
            this.state = {
                user: null,
                centrales: [],
                devices: [],
                users: [],
                currentCentralId: null,
                centralSearch: '',
                deviceSearch: ''
            };
            await this.loadInitialData();
            alert('Datos sincronizados correctamente');
            location.reload(); // Recargar para asegurar estado limpio
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
            c.name, c.location, c.ip, c.rack, `${c.battery}%`
        ]);

        doc.autoTable({
            head: [['Nombre', 'Ubicación', 'IP', 'Rack', 'Batería']],
            body: tableData,
            startY: 40
        });

        doc.save('reporte_general_centrales.pdf');
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
        doc.text(`Ubicación: ${central.location} | IP: ${central.ip}`, 14, 30);
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
            d.type.toUpperCase(), d.location, `${d.battery}%`, d.installationDate
        ]);

        doc.autoTable({
            head: [['Tipo', 'Ubicación', 'Batería', 'F. Instalación']],
            body: tableData,
            startY: 73
        });

        doc.save(`reporte_${central.name}.pdf`);
    }

    // Rendering
    render() {
        this.renderCentralesList();
        this.renderCurrentCentral();
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
                c.location.toLowerCase().includes(this.state.centralSearch)
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
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
            details.classList.add('hidden');
            return;
        }

        // REPARAR DOM SI FUE SOBRESCRITO POR OTRAS PESTAÑAS
        if (!document.getElementById('devices-grid')) {
            console.log('Restaurando estructura base de detalles de central');
            details.innerHTML = `
                <div class="central-info glass">
                    <div class="flex-row">
                        <h2 id="current-central-name">Seleccione una Central</h2>
                        <div class="central-actions">
                            <button id="print-central-btn" class="secondary-btn btn-sm">Imprimir PDF 📄</button>
                            <button id="edit-central-btn" class="secondary-btn btn-sm admin-only">Editar ✏️</button>
                            <button id="delete-central-btn" class="secondary-btn btn-sm danger admin-only">Eliminar 🗑️</button>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item"><strong>Ubicación:</strong> <span id="info-ub">--</span></div>
                        <div class="info-item"><strong>IP:</strong> <span id="info-ip">--</span></div>
                        <div class="info-item"><strong>Rack:</strong> <span id="info-rack">--</span></div>
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
            this.initEventListeners(); 
            this.applyPermissions();
        }

        details.classList.remove('hidden');
        document.getElementById('current-central-name').innerText = central.name;
        document.getElementById('info-ub').innerText = central.location;
        document.getElementById('info-ip').innerText = central.ip;
        document.getElementById('info-rack').innerText = central.rack;
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
                            <p class="full-row">📍 ${d.location}</p>
                            <p class="${d.battery < 20 ? 'low-battery' : ''}">🔋 ${d.battery}%</p>
                             <p>📅 ${d.installationDate}</p>
                             <p class="full-row status-online" style="color: #10b981; font-weight: 600; font-size: 0.7rem; margin-top: 4px;"><span class="pulse-dot">●</span> En línea</p>
                        </div>
                    </div>
                    <div class="device-actions admin-only">
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
            default: return '📦';
        }
    }

    updateStats() {
        document.getElementById('total-centrales').innerText = this.state.centrales.length;
        document.getElementById('total-dispositivos').innerText = this.state.devices.length;

        // Debug Badge Update
        if (this.state.user) {
            document.getElementById('debug-role').innerText = `Rol: ${this.state.user.role.toUpperCase()}`;
            document.getElementById('debug-devices').innerText = `Disp: ${this.state.devices.length}`;
        }
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
        }

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
}

// Inicializar
window.app = new AlarmApp();
