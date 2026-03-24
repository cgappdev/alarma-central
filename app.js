class AlarmApp {
        constructor() {
                    this.state = {
                                    user: null,
                                    centrales: [],
                                    devices: [],
                                    users: [],
                                    currentCentralId: null,
                                    centralSearch: '',
                                    deviceSearch: ''
                    };
                    this.initEventListeners();
                    this.loadInitialData();
        }

    async loadInitialData() {
                this.loadState();
                    if(this.state.users.find(u => u.username === 'admin' && u.password === '123')) { this.state.users.find(u => u.username === 'admin').password = '1105'; this.saveState(); }
                if (this.state.centrales.length === 0) {
                                await this.fetchDataFromServer();
                }
                this.bootstrapAdmin();
                this.render();
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

    bootstrapAdmin() {
                if (this.state.users.length === 0) {
                                this.state.users.push({
                                                    id: 'admin_initial',
                                                    username: 'admin',
                                                    password: '1105',
                                                    role: 'admin'
                                });
                                this.state.users.push({
                                                    id: 'user_initial',
                                                    username: 'user',
                                                    password: '123',
                                                    role: 'user'
                                });
                                this.saveState();
                }
    }

    saveState() {
                localStorage.setItem('alarma-lg-state', JSON.stringify({
                                centrales: this.state.centrales,
                                devices: this.state.devices,
                                users: this.state.users,
                                currentCentralId: this.state.currentCentralId
                }));
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
                document.getElementById('device-search').addEventListener('input', (e) => {
                                this.state.deviceSearch = e.target.value.toLowerCase();
                                this.renderCurrentCentral();
                });
    }

    login() {
                const usernameInput = document.getElementById('username').value;
                const passwordInput = document.getElementById('password').value;

            const foundUser = this.state.users.find(u => u.username === usernameInput && u.password === passwordInput);

            if (foundUser) {
                            this.state.user = { username: foundUser.username, role: foundUser.role };
                            document.getElementById('login-overlay').classList.add('hidden');
                            document.getElementById('app-container').classList.remove('hidden');
                            this.render();
            } else {
                            alert('Credenciales incorrectas');
            }
    }

    logout() {
                this.state.user = null;
                document.getElementById('login-overlay').classList.remove('hidden');
                document.getElementById('app-container').classList.add('hidden');
    }

    applyPermissions() {
                const isAdmin = this.state.user?.role === 'admin';
                document.querySelectorAll('.admin-only').forEach(el => {
                                if (isAdmin) {
                                                    el.classList.remove('auth-hidden');
                                } else {
                                                    el.classList.add('auth-hidden');
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
                m
