class AlarmApp {
    constructor() {
        window.onerror = (msg, url, line) => {
            alert(`ERROR CRÍTICO: ${msg}\nEn: ${url}:${line}\n\nPor favor reporta esto.`);
        };
        console.log("%c AlarmaLG v4.6.26 Cargada ", "background: #E60012; color: #fff; font-weight: bold; padding: 5px;");
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
            currentTab: 'home',
            previousTab: 'home',
            firebaseStatus: '⏳ Verificando...',
            firebaseConn: '📡 Pendiente...',
            lastSync: '--',
            citas: [],
            autorizaciones: [],
            calendarYear: new Date().getFullYear(),
            calendarMonth: new Date().getMonth(),
            selectedDate: null
        };
        this.currentCameraPhoto = null;
        this.loadInitialData();
        this.initEventListeners();
        this.initFirebase();
        if (typeof this.initPDFListeners === 'function') this.initPDFListeners();
        this.initConnectivityMonitor();
        
        // No bloqueamos el inicio por el chequeo de versión
        this.checkForUpdates().catch(e => console.warn('Actualización skip:', e.message));

        // Listener para el botón "Atrás" del sistema/navegador (Cierra el PDF si está abierto)
        window.addEventListener('popstate', (e) => {
            if (document.getElementById('pdf-viewer-overlay') && !document.getElementById('pdf-viewer-overlay').classList.contains('hidden')) {
                this.closePDFViewer(true);
            }
        });
    }

    formatDateDMY(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
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
            this.state.firebaseConn = connected ? 'Conexión: <span style="color: #10b981;">🟢 Online</span>' : 'Conexión: <span style="color: #ef4444;">🔴 Offline</span>';
            this.updateDebugStatus();
        });
    }

    updateDebugStatus() {
        const statusEl = document.getElementById('debug-firebase-status');
        if (statusEl) statusEl.innerHTML = this.state.firebaseStatus;
        
        const connEl = document.getElementById('debug-firebase-conn');
        if (connEl) connEl.innerHTML = this.state.firebaseConn;

        const timeEl = document.getElementById('debug-sync-time');
        if (timeEl) timeEl.innerText = `Última sincronización: ${this.state.lastSync}`;
    }



    startCloudSync() {
        if (!this.db) return;
        
        if (this.cloudRef) this.cloudRef.off();
        this.cloudRef = this.db.ref('alarmState');
        this.isCloudEnabled = true;

        this.state.firebaseStatus = 'Estado: <span style="color: #3b82f6;">⏳ Sincronizando...</span>';
        this.updateDebugStatus();

        // Listener para cambios en la nube
        this.cloudRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const timestamp = new Date().toLocaleTimeString();
            this.state.lastSync = timestamp;

            if (data) {
                const remoteResetId = data.resetId || null;
                const localResetId = localStorage.getItem('last-reset-id');
                
                this.state.firebaseStatus = 'Estado: <span style="color: #10b981; font-weight: bold;">✅ Conectado y Sincronizado</span>';

                if (remoteResetId && remoteResetId !== localResetId) {
                    console.log('¡Sello de Reinicio Maestro detectado!');
                    this.state.centrales = data.centrales || [];
                    this.state.devices = data.devices || [];
                    this.state.cameras = data.cameras || [];
                    this.state.poeSwitches = data.poeSwitches || [];
                    this.state.nvrs = data.nvrs || [];
                    this.state.users = data.users || [];
                    this.state.citas = data.citas || [];
                    this.state.autorizaciones = data.autorizaciones || [];
                    localStorage.setItem('last-reset-id', remoteResetId);
                    this.saveState(true); 
                    this.render();
                    return;
                }

                // PROTECCIÓN DE DATOS: No sobreescribir con nube vacía si local tiene datos
                const hasLocalData = this.state.centrales.length > 0 || this.state.devices.length > 0 || this.state.cameras.length > 0;
                const hasRemoteData = (data.centrales && data.centrales.length > 0) || 
                                    (data.devices && data.devices.length > 0) || 
                                    (data.cameras && data.cameras.length > 0);

                if (!hasRemoteData && hasLocalData) {
                    console.warn('Nube vacía detectada, pero el PC tiene datos. Ignorando sobreescritura para evitar pérdida de información.');
                    this.state.firebaseStatus = 'Estado: <span style="color: #f59e0b;">⚠️ Nube Vacía (Protegiendo PC)</span>';
                    this.updateDebugStatus();
                    this.render();
                    return;
                }

                console.log('Datos nube recibidos. Sincronizando...');
                
                // Fusionar centrales y dispositivos
                this.state.centrales = data.centrales || [];
                this.state.devices = data.devices || [];
                this.state.users = data.users || [];
                this.state.citas = data.citas || [];
                this.state.autorizaciones = data.autorizaciones || [];

                // Fusión inteligente para CCTV (No borrar si local tiene datos y nube no)
                if (data.cameras && data.cameras.length > 0) {
                    this.state.cameras = data.cameras;
                } else if (this.state.cameras.length > 0) {
                    console.log('Conservando cámaras locales (Nube no tiene datos)');
                } else {
                    this.state.cameras = [];
                }

                if (data.poeSwitches && data.poeSwitches.length > 0) {
                    this.state.poeSwitches = data.poeSwitches;
                } else if (this.state.poeSwitches.length > 0) {
                    console.log('Conservando switches locales (Nube no tiene datos)');
                } else {
                    this.state.poeSwitches = [];
                }

                if (data.nvrs && data.nvrs.length > 0) {
                    this.state.nvrs = data.nvrs;
                } else if (this.state.nvrs.length > 0) {
                    console.log('Conservando grabadores locales (Nube no tiene datos)');
                } else {
                    this.state.nvrs = [];
                }

                this.saveState(true); 
                
                const viewer = document.getElementById('cloud-json-viewer');
                if (viewer) {
                    viewer.innerText = JSON.stringify({
                        projectId: firebase.app().options.projectId,
                        centrales: this.state.centrales.length,
                        devices: this.state.devices.length,
                        resetId: data.resetId || "none",
                        version: data.version || "unknown"
                    }, null, 2);
                }
                
                this.render();
            } else {
                console.log('Firebase vacío.');
                this.state.firebaseStatus = 'Estado: <span style="color: #f59e0b;">☁️ Nube Vacía</span>';
                this.render();
            }
            
            const debugFirebase = document.getElementById('debug-firebase');
            if (debugFirebase) {
                debugFirebase.innerText = "Firebase: ✅ DB Conectada";
            }
            this.updateDebugStatus();
        }, (error) => {
            console.error('ERROR Firebase:', error.message);
            let msg = error.message;
            if (msg.includes('permission_denied')) {
                msg = "Error de Permisos. Verifica las reglas en la consola de Firebase.";
            }
            this.state.firebaseStatus = `Estado: <span style="color: #ef4444; font-weight: bold;">❌ ${msg}</span>`;
            this.updateDebugStatus();
        });
    }

    initFirebase() {
        console.log('Iniciando sistema de autenticación...');
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            this.db = firebase.database();
            
            // Verificación de conexión
            const connectedRef = this.db.ref(".info/connected");
            connectedRef.on("value", (snap) => {
                if (snap.val() === true) {
                    console.log("Firebase: Conexión establecida ✅");
                    this.state.firebaseConnected = true;
                } else {
                    console.warn("Firebase: Conexión perdida ❌");
                    this.state.firebaseConnected = false;
                }
            });

            firebase.auth().onAuthStateChanged((user) => {
                try {
                    if (user) {
                        console.log('Firebase Auth: Sesión detectada ->', user.email);
                        const username = user.email.split('@')[0];
                        
                        if (!this.state.user) {
                            const foundUser = this.state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
                            this.state.user = { 
                                username: username, 
                                role: foundUser ? foundUser.role : ((username === 'admin' || username === 'admin_pro') ? 'admin' : 'user') 
                            };
                        }
                        
                        this.startCloudSync();
                        this.hideLogin();
                    } else {
                        console.log('Firebase Auth: Sin sesión activa');
                        this.state.user = null;
                        if (this.cloudRef) this.cloudRef.off();
                        this.showLogin();
                    }
                } catch (e) {
                    console.error('Error en AuthListener:', e);
                }
            });
        } else {
            console.warn('Firebase no está disponible. Operando en modo local.');
            this.state.firebaseStatus = 'Estado: <span style="color: #f59e0b;">⚠️ Modo Local (Sin Nube)</span>';
            this.updateDebugStatus();
        }
    }

    showLogin() {
        document.getElementById('login-overlay')?.classList.remove('hidden');
        document.getElementById('app-container')?.classList.add('hidden');
    }

    hideLogin() {
        document.getElementById('login-overlay')?.classList.add('hidden');
        document.getElementById('app-container')?.classList.remove('hidden');
        this.render();
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
            resetId: localStorage.getItem('last-reset-id') || null,
            citas: this.state.citas || [],
            autorizaciones: this.state.autorizaciones || []
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

    async testFirebaseWrite() {
        if (!this.isCloudEnabled) return alert('Firebase no está habilitado.');
        try {
            await this.db.ref('test_connection').set({
                time: Date.now(),
                user: this.state.user ? this.state.user.username : 'anon'
            });
            alert('✅ ÉXITO: Tienes permisos de ESCRITURA en este proyecto.');
        } catch (e) {
            alert('❌ ERROR DE PERMISOS: ' + e.message + '\n\nEsto significa que las REGLAS de Firebase están bloqueadas.');
        }
    }

    async forceMasterSync() {
        if (!confirm('🚀 ¿Forzar Sincronización Maestra?\n\nEsto enviará TODOS los datos actuales del PC a la nube y obligará a todos los móviles a actualizarse de inmediato.\n\nÚsalo si los cambios del PC no aparecen en el móvil.')) return;
        
        const newResetId = Date.now().toString();
        localStorage.setItem('last-reset-id', newResetId);
        
        try {
            await this.syncCloud(true);
            alert('✅ Sincronización Maestra completada.\n\nAhora abre la app en tu móvil y los datos deberían actualizarse automáticamente.');
        } catch (e) {
            alert('❌ Error: ' + e.message);
        }
    }


    async loadInitialData() {
        console.log('Cargando datos iniciales...');
        
        // 1. Cargar lo que haya en localStorage
        await this.loadState();
        
        // 2. Asegurar siempre usuarios básicos (admin/user) de inmediato
        this.bootstrapAdmin();

        // Cargar citas de prueba si el estado está vacío
        if (!this.state.citas || this.state.citas.length === 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            this.state.citas = [
                {
                    id: "cita_1",
                    patient: "Juan Pérez",
                    therapist: "Dra. Laura Gómez",
                    date: todayStr,
                    time: "09:00",
                    status: "asistio",
                    soap: {
                        subjective: "Refiere disminución del dolor de 7/10 a 3/10 en el hombro derecho al realizar flexión.",
                        objective: "Flexión activa de hombro aumentó a 130 grados. Ligera crepitación sin resistencia.",
                        assessment: "Excelente respuesta a la movilización articular y al fortalecimiento de manguito rotador.",
                        plan: "Continuar con ejercicios de fortalecimiento y estiramiento en casa. Siguiente control en 3 días."
                    }
                },
                {
                    id: "cita_2",
                    patient: "María Rodríguez",
                    therapist: "Dr. Carlos Ruiz",
                    date: todayStr,
                    time: "11:30",
                    status: "en-progreso",
                    soap: {
                        subjective: "Reporta cansancio leve al caminar tramos medianos, pero mejor capacidad pulmonar.",
                        objective: "Saturación de oxígeno 97% en reposo. Espiometría muestra volumen corriente mejorado.",
                        assessment: "Patrón respiratorio restrictivo con mejoría moderada y buena tolerancia al esfuerzo.",
                        plan: "Aumentar ejercicios aeróbicos ligeros y continuar terapia de higiene bronquial."
                    }
                }
            ];
            this.saveState(true);
        }

        // Cargar autorizaciones de prueba si el estado está vacío
        if (!this.state.autorizaciones || this.state.autorizaciones.length === 0) {
            this.state.autorizaciones = [
                {
                    id: "auth_1",
                    code: "AUT-10001",
                    patient: "Juan Pérez",
                    therapist: "Dra. Laura Gómez",
                    totalSessions: 10,
                    expirationDate: "2026-12-31",
                    notes: "Terapia física post-fractura."
                },
                {
                    id: "auth_2",
                    code: "AUT-20002",
                    patient: "María Rodríguez",
                    therapist: "Dr. Carlos Ruiz",
                    totalSessions: 8,
                    expirationDate: "2026-10-15",
                    notes: "Terapia respiratoria crónica."
                }
            ];
            this.saveState(true);
        }

        // 3. SEEDING INTELIGENTE: Solo cargar de los archivos base si la app está vacía o es una versión con cambios estructurales
        const forceUpdate = localStorage.getItem('force_update_4625');
        const isCctvEmpty = this.state.cameras.length === 0 && this.state.poeSwitches.length === 0 && this.state.nvrs.length === 0;

        if (!forceUpdate || this.state.centrales.length === 0 || isCctvEmpty) {
            console.log('Forzando actualización desde datos semilla (v4.6.26)...');
            this.needsMasterPush = true;
            
            const currentState = localStorage.getItem('alarma-lg-state');
            if (currentState) {
                const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
                localStorage.setItem(`alarma-lg-state-backup-${dateStr}`, currentState);
                console.log(`Auto-respaldo creado: alarma-lg-state-backup-${dateStr}`);
            }

            const serverData = await this.fetchDataFromServer();
            if (serverData) {
                this.smartMerge(serverData);
                localStorage.setItem('force_update_4625', 'true');
                this.saveState(true);
            }
        } else {
            console.log('Cargados ' + this.state.centrales.length + ' centrales desde la memoria local.');
        }

        this.render();

        // 4. Restaurar pestaña previa
        const lastTab = localStorage.getItem('last-tab');
        if (lastTab && lastTab !== 'home') {
            console.log('Restaurando pestaña:', lastTab);
            this.switchTab(lastTab, true);
        }
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
                password: '110500',
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
                password: '110600',
                role: 'user'
            });
        }

        // Aseguramos que el admin_pro exista
        const hasAdminPro = this.state.users.find(u => u.username === 'admin_pro');
        if (!hasAdminPro) {
            console.log('Inyectando admin_pro por defecto...');
            this.state.users.push({
                id: 'admin_pro_initial',
                username: 'admin_pro',
                password: '110500',
                role: 'admin'
            });
        }

        // Aseguramos usuario hilda_pro
        const hasHildaPro = this.state.users.find(u => u.username.toLowerCase() === 'hilda_pro');
        if (!hasHildaPro) {
            console.log('Inyectando hilda_pro por defecto...');
            this.state.users.push({
                id: 'hilda_pro_initial',
                username: 'hilda_pro',
                password: '110600',
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
                this.state.citas = parsed.citas || [];
                this.state.autorizaciones = parsed.autorizaciones || [];
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

    smartMerge(serverData) {
        console.log('Iniciando fusión inteligente de datos...');
        
        const mergeArray = (localArr, serverArr) => {
            const serverMap = new Map(serverArr.map(item => [item.id, item]));
            const merged = [...serverArr]; // Empezamos con la base del servidor
            
            // Añadimos lo que existe localmente pero NO en el servidor
            for (const localItem of localArr) {
                if (!serverMap.has(localItem.id)) {
                    console.log(`Smart Merge: Conservando item local huérfano ID ${localItem.id}`);
                    merged.push(localItem);
                }
            }
            return merged;
        };

        this.state.citas = mergeArray(this.state.citas || [], serverData.citas || []);
        this.state.autorizaciones = mergeArray(this.state.autorizaciones || [], serverData.autorizaciones || []);
        this.state.centrales = mergeArray(this.state.centrales, serverData.centrales || []);
        this.state.devices = mergeArray(this.state.devices, serverData.devices || []);
        this.state.cameras = mergeArray(this.state.cameras, serverData.cameras || []);
        this.state.poeSwitches = mergeArray(this.state.poeSwitches, serverData.poeSwitches || []);
        this.state.nvrs = mergeArray(this.state.nvrs, serverData.nvrs || []);
        
        // Usuarios: Merge similar, conservando IDs o usernames
        const serverUsersMap = new Map((serverData.users || []).map(u => [u.username, u]));
        const mergedUsers = [...(serverData.users || [])];
        for (const localU of this.state.users) {
            if (!serverUsersMap.has(localU.username)) {
                mergedUsers.push(localU);
            }
        }
        this.state.users = mergedUsers;

        if (serverData.currentCentralId && !this.state.currentCentralId) {
            this.state.currentCentralId = serverData.currentCentralId;
        }
        
        console.log('Fusión inteligente completada.');
    }

    async fetchDataFromServer() {
        console.log('Intentando cargar datos desde servidor/memoria...');
        
        // 1. Intentar usar los datos precargados vía script (Solución CORS para local)
        if (window.initialData) {
            console.log('Datos detectados en memoria (initial-data.js). Cargando...');
            return window.initialData;
        }

        // 2. Fallback: Intentar fetch si no hay initialData (ej. producción)
        try {
            const response = await fetch('data.json?v=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                console.log('Datos cargados vía fetch (data.json)');
                return data;
            }
        } catch (e) {
            console.warn('No se pudo cargar data.json vía fetch (posible CORS).');
        }
        return null;
    }

    saveState(skipCloud = false) {
        const dataToSave = {
            centrales: this.state.centrales,
            devices: this.state.devices,
            cameras: this.state.cameras,
            poeSwitches: this.state.poeSwitches,
            nvrs: this.state.nvrs,
            users: this.state.users,
            currentCentralId: this.state.currentCentralId,
            citas: this.state.citas || [],
            autorizaciones: this.state.autorizaciones || []
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
            cameras: [],
            poeSwitches: [],
            nvrs: [],
            users: [
                {
                    id: 'admin_initial',
                    username: 'admin',
                    password: '110500',
                    role: 'admin'
                },
                {
                    id: 'admin_pro_initial',
                    username: 'admin_pro',
                    password: '110500',
                    role: 'admin'
                },
                {
                    id: 'hilda_pro_initial',
                    username: 'hilda_pro',
                    password: '110600',
                    role: 'user'
                }
            ],
            currentCentralId: null,
            citas: [],
            autorizaciones: [],
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
        
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
            });
        }
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

        document.getElementById('cita-form')?.addEventListener('submit', (e) => this.handleCitaSubmit(e));
        document.getElementById('cita-delete-btn')?.addEventListener('click', () => {
            if (this.editingCitaId && confirm('¿Eliminar esta cita?')) {
                this.deleteCita(this.editingCitaId);
                this.closeModals();
            }
        });

        document.getElementById('autorizacion-form')?.addEventListener('submit', (e) => this.handleAutorizacionSubmit(e));
        document.getElementById('autorizacion-delete-btn')?.addEventListener('click', () => {
            if (this.editingAutorizacionId && confirm('¿Eliminar esta autorización?')) {
                this.deleteAutorizacion(this.editingAutorizacionId);
                this.closeModals();
            }
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

    initPDFListeners() {
        const closeBtn = document.getElementById('close-pdf-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePDFViewer());
        }
    }



    async login() {
        const usernameInput = document.getElementById('username').value.trim().toLowerCase();
        const passwordInput = document.getElementById('password').value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value || 'user';

        if (!usernameInput || !passwordInput) {
            alert('Por favor complete todos los campos');
            return;
        }

        const loginBtn = document.getElementById('login-btn');
        const errorEl = document.getElementById('login-error');
        if (errorEl) errorEl.style.display = 'none';

        loginBtn.innerText = 'Verificando...';
        loginBtn.disabled = true;

        // Timeout de seguridad (15 segundos)
        const timeoutId = setTimeout(() => {
            if (loginBtn.disabled) {
                console.warn('Timeout de login alcanzado. Intentando entrada local...');
                this.tryLocalFallback(usernameInput, passwordInput, 'Tiempo de espera agotado');
            }
        }, 15000);

        try {
            const email = usernameInput.replace(/\s+/g, '') + '@alarmalg.com';
            
            if (typeof firebase !== 'undefined' && firebase.auth) {
                console.log(`Intentando autenticación con Firebase: ${email}`);
                await firebase.auth().signInWithEmailAndPassword(email, passwordInput);
                clearTimeout(timeoutId);
                // El onAuthStateChanged se encargará del resto
            } else {
                throw new Error('firebase_not_available');
            }
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Error de autenticación:', error);
            
            // Intentar entrada local si falla Firebase (útil si no hay internet)
            this.tryLocalFallback(usernameInput, passwordInput, error.code || error.message);
        }
    }

    tryLocalFallback(username, password, originalError) {
        console.log('Iniciando verificación local...');
        
        // Buscar primero en los usuarios creados en el estado de la app, y luego en el initialData
        const stateUsers = this.state.users || [];
        const initialUsers = (window.initialData ? window.initialData.users : []) || [];
        // Combinar prefiriendo usuarios del estado (BD local persistida) sobre los iniciales
        const localUsers = [...stateUsers];
        initialUsers.forEach(iu => {
            if (!localUsers.some(lu => lu.username.toLowerCase() === iu.username.toLowerCase())) {
                localUsers.push(iu);
            }
        });
        const foundUser = localUsers.find(u => u.username.toLowerCase() === username && u.password === password);
        
        if (foundUser || ((username === 'admin' || username === 'admin_pro') && password === '110500')) {
            console.log('Acceso Local Concedido');
            this.state.user = { 
                username: foundUser ? foundUser.username : username, 
                role: foundUser ? foundUser.role : (username === 'admin' ? 'admin' : 'user') 
            };
            this.saveState(true); // Guardar localmente sin subir a nube
            this.hideLogin();
            
            const errorEl = document.getElementById('login-error');
            if (errorEl) {
                errorEl.innerHTML = `<span style="color: #f59e0b;">⚠️ Entraste en MODO LOCAL (${originalError}). La sincronización nube podría no funcionar.</span>`;
                errorEl.style.display = 'block';
            }
        } else {
            const loginBtn = document.getElementById('login-btn');
            loginBtn.innerText = 'Entrar';
            loginBtn.disabled = false;
            
            const errorEl = document.getElementById('login-error');
            if (errorEl) {
                errorEl.innerText = 'Credenciales inválidas (Local/Nube). ' + originalError;
                errorEl.style.display = 'block';
            }
        }
    }

    _getLoginErrorMessage(code) {
        switch (code) {
            case 'auth/user-not-found': return 'El usuario no existe.';
            case 'auth/wrong-password': return 'Contraseña incorrecta.';
            case 'auth/invalid-email': return 'Email no válido.';
            case 'auth/network-request-failed': return 'Error de red. Verifica tu conexión.';
            case 'auth/too-many-requests': return 'Demasiados intentos. Intenta más tarde.';
            default: return 'Error al ingresar: ' + code;
        }
    }

    logout() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(e => console.error(e));
        } else {
            this.state.user = null;
            this.showLogin();
        }
    }

    emergencyLogin() {
        console.log('Iniciando Acceso de Emergencia...');
        const pass = prompt('Introduce la contraseña maestra para acceso local:', '');
        if (pass === '110500') {
            this.state.user = { username: 'admin', role: 'admin' };
            
            // Intentar reactivar nube si está disponible
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                console.log('Firebase detectado. Activando sincronización en segundo plano...');
                this.isCloudEnabled = true;
                this.db = firebase.database();
                this.startCloudSync();
            } else {
                this.isCloudEnabled = false;
            }
            
            this.saveState(true);
            this.hideLogin();
            alert('Acceso Concedido. Intentando sincronizar con la Nube...');
        } else {
            alert('Contraseña incorrecta.');
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
        document.getElementById('cita-modal')?.classList.add('hidden');
        document.getElementById('autorizacion-modal')?.classList.add('hidden');
        document.getElementById('share-schedule-modal')?.classList.add('hidden');
        this.clearCameraPhoto();
        this.editingDeviceId = null;
        this.editingUserId = null;
        this.editingCctvId = null;
        this.editingCitaId = null;
        this.editingAutorizacionId = null;
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
        if (this.state.currentTab !== tab) {
            this.state.previousTab = this.state.currentTab;
        }
        this.state.currentTab = tab;
        localStorage.setItem('last-tab', tab);
        
        // Mostrar/Ocultar botón de volver en móvil (Solo si no es Home)
        const mobileBackBtn = document.getElementById('mobile-back-btn');
        if (mobileBackBtn) {
            if (tab === 'home') {
                mobileBackBtn.classList.add('hidden');
            } else {
                mobileBackBtn.classList.remove('hidden');
            }
        }
        
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
        const terapiasSection = document.getElementById('terapias-section');
        const autorizacionesSection = document.getElementById('autorizaciones-section');
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
        terapiasSection?.classList.add('hidden');
        autorizacionesSection?.classList.add('hidden');

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
        } else if (tab === 'terapias') {
            terapiasSection?.classList.remove('hidden');
            this.renderCalendar();
        } else if (tab === 'autorizaciones') {
            autorizacionesSection?.classList.remove('hidden');
            this.renderAutorizaciones();
        }
    }

    goBack() {
        if (this.state.previousTab) {
            this.switchTab(this.state.previousTab);
        } else {
            this.switchTab('home');
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
                </div>

                <div class="debug-section glass-mini" style="margin: 15px; padding: 15px; border-radius: 12px; background: #f9f9f9; border: 1px solid #eee;">
                    <h3 style="margin-top: 0; font-size: 0.9rem; color: #555;">🛰️ Diagnóstico de Sincronización</h3>
                    <div id="debug-firebase-status" style="font-size: 0.85rem; margin-bottom: 8px;">${this.state.firebaseStatus}</div>
                    <div id="debug-firebase-conn" style="font-size: 0.8rem; color: #888; margin-bottom: 8px;">${this.state.firebaseConn}</div>
                    <div id="debug-project-id" style="font-size: 0.8rem; color: var(--hik-red); font-weight: bold; margin-bottom: 8px;">Proyecto: ${firebase.app().options.projectId}</div>
                    <div id="debug-db-url" style="font-size: 0.65rem; color: #aaa; margin-bottom: 8px; word-break: break-all;">URL: ${firebase.app().options.databaseURL}</div>
                    <div id="debug-sync-time" style="font-size: 0.75rem; color: #888; margin-bottom: 10px;">Última sincronización: ${this.state.lastSync}</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; gap: 10px;">
                            <button class="primary-btn btn-sm" onclick="app.syncCloud()" style="flex: 1; font-size: 0.75rem;">Subir Datos ⬆️</button>
                            <button class="secondary-btn btn-sm" onclick="location.reload()" style="flex: 1; font-size: 0.75rem;">Recargar 🔄</button>
                        </div>
                        <button class="secondary-btn btn-sm" onclick="app.forceMasterSync()" style="width: 100%; font-size: 0.75rem; background: #fee2e2; color: #dc2626; border-color: #fecaca;">🚀 Forzar Sincronización Maestra (PC -> Móvil)</button>
                    </div>
                    
                    <div id="cloud-json-viewer" style="margin-top: 10px; font-size: 0.65rem; background: #333; color: #0f0; padding: 10px; border-radius: 6px; font-family: monospace; max-height: 100px; overflow: auto; display: none;">
                        <!-- Aquí se verán los metadatos de la nube -->
                    </div>
                    <button class="secondary-btn btn-sm" onclick="app.testFirebaseWrite()" style="width: 100%; margin-top: 5px; font-size: 0.75rem; background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">🧪 Probar Permisos (Escritura)</button>
                    <button class="secondary-btn btn-sm" onclick="document.getElementById('cloud-json-viewer').style.display = document.getElementById('cloud-json-viewer').style.display === 'none' ? 'block' : 'none'" style="width: 100%; margin-top: 5px; font-size: 0.65rem;">Ver Metadatos Nube</button>
                </div>

                <div class="me-menu">
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
                    <p class="app-version">Versión 4.6.26</p>
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
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        
        // Limpiar URL anterior si existe
        if (this.currentPdfUrl) {
            URL.revokeObjectURL(this.currentPdfUrl);
        }
        this.currentPdfUrl = url;

        const overlay = document.getElementById('pdf-viewer-overlay');
        const iframe = document.getElementById('pdf-iframe');
        const filenameEl = document.getElementById('pdf-viewer-filename');
        const downloadBtn = document.getElementById('pdf-download-btn');

        if (overlay && iframe) {
            if (filenameEl) filenameEl.innerText = filename;
            iframe.src = url;
            overlay.classList.remove('hidden');
            
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    doc.save(filename);
                };
            }
            
            // Bloquear scroll del body
            document.body.style.overflow = 'hidden';
            
            // Navegación móvil: pushState para que el botón "Atrás" del sistema cierre el PDF
            history.pushState({ pdfOpen: true }, "");
            
            console.log(`Reporte generado: ${filename}`);
        } else {
            // Fallback: Descarga directa si falla el overlay
            doc.save(filename);
        }
    }

    closePDFViewer(isFromPopState = false) {
        const overlay = document.getElementById('pdf-viewer-overlay');
        const iframe = document.getElementById('pdf-iframe');
        
        if (overlay) {
            overlay.classList.add('hidden');
            if (iframe) iframe.src = 'about:blank';
            document.body.style.overflow = '';
            
            if (this.currentPdfUrl) {
                URL.revokeObjectURL(this.currentPdfUrl);
                this.currentPdfUrl = null;
            }

            // Si cerramos manualmente (botón Volver), sacamos el estado del historial
            if (!isFromPopState && history.state && history.state.pdfOpen) {
                history.back();
            }
        }
    }

    // PDF Reporting
    generateGeneralReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header con Color Corporativo
        doc.setFillColor(230, 0, 18); // Hikvision Red
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('AlarmaLG - Reporte General', 14, 25);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 33);

        // Resumen Estadístico
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('RESUMEN DE INFRAESTRUCTURA', 14, 55);
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Total de Centrales: ${this.state.centrales.length}`, 14, 62);
        doc.text(`Total de Dispositivos: ${this.state.devices.length}`, 14, 68);
        
        const tableData = this.state.centrales.map(c => [
            c.name, c.location, c.piso || '-', c.ip, c.rack, `${c.battery}%`
        ]);

        doc.autoTable({
            head: [['Nombre', 'Ubicación', 'Piso', 'IP', 'Rack', 'Batería']],
            body: tableData,
            startY: 75,
            styles: { halign: 'center' },
            headStyles: { fillColor: [230, 0, 18], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { top: 75 }
        });

        this._showPDF(doc, 'reporte_general_centrales.pdf');
    }

    generateIpReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(51, 51, 51); // Dark Gray
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('Inventario de Direcciones IP', 14, 25);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Documento Técnico de Infraestructura - ${new Date().toLocaleDateString()}`, 14, 33);

        doc.setTextColor(0, 0, 0);
        const tableData = this.state.centrales.map(c => [
            c.name, c.location, c.piso || '-', c.ip, c.rack
        ]);

        doc.autoTable({
            head: [['Nombre de la Central', 'Ubicación', 'Piso', 'Dirección IP', 'Rack / Conexión']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255] },
            styles: { fontSize: 10, halign: 'center' },
            columnStyles: {
                3: { fontStyle: 'bold', textColor: [230, 0, 18] } // IP en rojo para destacar
            }
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

        // Header Corporativo
        doc.setFillColor(230, 0, 18);
        doc.rect(0, 0, 210, 45, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(`Reporte: ${central.name}`, 14, 22);
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Ubicación: ${central.location} | Piso: ${central.piso || '-'} | IP: ${central.ip}`, 14, 30);
        doc.text(`Rack: ${central.rack} | Batería Central: ${central.battery}%`, 14, 37);

        // Resumen de Totales por tipo
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('TOTALES POR CATEGORÍA', 14, 60);

        const counts = {};
        devices.forEach(d => {
            counts[d.type] = (counts[d.type] || 0) + 1;
        });
        
        let startX = 14;
        let startY = 68;
        Object.entries(counts).forEach(([type, count]) => {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`${type.toUpperCase()}:`, startX, startY);
            doc.setFont(undefined, 'normal');
            doc.text(`${count}`, startX + 35, startY);
            startY += 6;
        });

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('LISTADO DETALLADO DE DISPOSITIVOS', 14, startY + 10);

        const tableData = devices.map(d => [
            d.type.toUpperCase(), d.location, d.piso || '-', `${d.battery}%`, d.installationDate
        ]);

        doc.autoTable({
            head: [['Tipo', 'Ubicación', 'Piso', 'Batería', 'F. Instalación']],
            body: tableData,
            startY: startY + 15,
            styles: { halign: 'center' },
            headStyles: { fillColor: [230, 0, 18] },
            columnStyles: {
                3: { fontStyle: 'bold' }
            }
        });

        this._showPDF(doc, `reporte_${central.name}.pdf`);
    }

    // Rendering
    render() {
        this.renderCentralesList();
        this.switchTab(this.state.currentTab || 'home', true);
        this.updateStats();
        this.applyPermissions();
        
        // Anti-Wobble: Force horizontal scroll to 0
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
    }

    previewPhoto(photoUrl, name) {
        const overlay = document.getElementById('photo-preview-overlay');
        const img = document.getElementById('full-photo');
        const caption = document.getElementById('photo-caption');
        
        if (overlay && img && caption) {
            img.src = photoUrl;
            caption.innerText = name;
            overlay.classList.remove('hidden');
            // Prevent scrolling background
            document.body.style.overflow = 'hidden';
        }
    }

    closePhotoPreview() {
        const overlay = document.getElementById('photo-preview-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
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
                    <div class="device-header-row">
                        <div class="device-icon-wrapper">${this.getDeviceIcon(d.type)}</div>
                        <div class="device-actions admin-only">
                            <button onclick="app.openMaintenanceModal('${d.id}')" class="icon-btn info ${d.maintenanceLogs && d.maintenanceLogs.length > 0 ? 'has-history' : ''}" title="Historial">📋</button>
                            <button onclick="app.openDeviceModal(true, '${d.id}')" class="icon-btn edit">✏️</button>
                            <button onclick="app.deleteDevice('${d.id}')" class="icon-btn danger">🗑️</button>
                        </div>
                    </div>
                    <div class="device-main-info">
                        <h4>${d.type.toUpperCase()}</h4>
                        <div class="device-meta">
                            <p class="full-row device-loc-text">📍 ${d.location} (Piso ${d.piso || '-'})</p>
                            <p class="${d.battery < 20 ? 'low-battery' : ''}">🔋 ${d.battery}%</p>
                             <p>📅 ${d.installationDate}</p>
                             <p class="full-row status-online" style="color: #10b981; font-weight: 600; font-size: 0.8rem; margin-top: 4px;"><span class="pulse-dot">●</span> En línea</p>
                        </div>
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
        this.renderCctvStats();
        const camerasGrid = document.getElementById('cameras-grid');
        const switchesGrid = document.getElementById('switches-grid');
        const nvrsGrid = document.getElementById('nvrs-grid');
        const isAdmin = this.state.user?.role === 'admin';
        const query = (this.state.cctvSearch || '').toLowerCase();

        if (!camerasGrid || !switchesGrid || !nvrsGrid) return;

        const filterItems = (items) => {
            if (!query) return items;
            return items.filter(i => 
                i.name.toLowerCase().includes(query) || 
                i.ip.toLowerCase().includes(query) || 
                i.location.toLowerCase().includes(query) ||
                (i.piso && i.piso.toLowerCase().includes(query))
            );
        };

        const renderItems = (items, grid, type) => {
            const filtered = filterItems(items);
            grid.innerHTML = filtered.length ? '' : `<p class="empty-msg">${query ? 'No se encontraron resultados' : 'No hay dispositivos registrados'}.</p>`;
            filtered.forEach(item => {
                const central = this.state.centrales.find(c => c.id === item.centralId);
                const card = document.createElement('div');
                card.className = 'device-card glass';
                card.innerHTML = `
                    ${type === 'camera' && item.photo ? `
                        <div class="cctv-card-photo" onclick="app.previewPhoto('${item.photo}', '${item.name}')" style="cursor: zoom-in;">
                            <img src="${item.photo}" alt="${item.name}">
                        </div>
                    ` : ''}
                    <div class="cctv-badge badge-${type}">
                        <span class="status-indicator status-online"></span>
                        ${type === 'camera' ? 'CÁMARA' : type.toUpperCase()}
                    </div>
                    
                    <div class="cctv-main-header" style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.8rem; width: 100%;">
                            <span style="font-size: 1.5rem; flex-shrink: 0;">${this.getDeviceIcon(type)}</span>
                            <h4 class="cctv-title" style="margin: 0; font-weight: 700; white-space: normal; overflow-wrap: break-word; word-wrap: break-word; min-width: 0; flex-grow: 1;">${item.name}</h4>
                        </div>
                    </div>

                    <div class="device-main-info">
                        <div class="device-meta">
                            <p><strong>IP:</strong> ${item.ip}</p>
                            <p class="device-loc-text"><strong>Rack/Conexión:</strong> ${item.location} (Piso ${item.piso || '-'})</p>
                            <p class="full-row" style="color: var(--hik-red); font-weight: 600;">
                                🏢 Sede: ${central ? central.name : 'General'}
                            </p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px;">
                                ${type === 'camera' ? `
                                    <p><strong>Canal:</strong> ${item.channel || '--'}</p>
                                    <p><strong>Resolución:</strong> ${item.megapixels ? item.megapixels + ' MP' : '--'}</p>
                                    <p class="full-row"><strong>Modelo:</strong> ${item.model || '--'}</p>
                                ` : ''}
                                ${type === 'switch' ? `
                                    <p class="full-row"><strong>Puertos:</strong> ${item.ports || '--'}</p>
                                    <p class="full-row"><strong>Uso:</strong> <span style="color: #10b981;">Online ✅</span></p>
                                ` : ''}
                                ${type === 'nvr' ? `
                                    <p><strong>Canales:</strong> ${item.channels || '--'}</p>
                                    <p><strong>Disco:</strong> ${item.disk || '--'}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="device-actions-footer admin-only" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05); flex-wrap: wrap;">
                        <button class="footer-action-btn history" onclick="app.openMaintenanceModal('${item.id}')">
                            <span>📋</span> Historial
                        </button>
                        <button class="footer-action-btn edit" onclick="app.openCctvModal('${type}', true, '${item.id}')">
                            <span>✏️</span> Editar
                        </button>
                        <button class="footer-action-btn delete" onclick="app.deleteCctv('${type}', '${item.id}')">
                            <span>🗑️</span> Borrar
                        </button>
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

    handleCctvSearch() {
        const input = document.getElementById('cctv-search-input');
        if (input) {
            this.state.cctvSearch = input.value;
            this.renderCCTVTab();
        }
    }

    renderCctvStats() {
        const grid = document.getElementById('cctv-stats-grid');
        if (!grid) return;

        // Cálculos avanzados
        let totalTB = 0;
        this.state.nvrs.forEach(n => {
            const disk = n.disk ? n.disk.toUpperCase() : '';
            if (disk.includes('TB')) {
                totalTB += parseFloat(disk);
            }
        });

        let totalMP = 0;
        this.state.cameras.forEach(c => {
            if (c.megapixels) totalMP += parseFloat(c.megapixels);
        });

        const totalPorts = this.state.poeSwitches.reduce((acc, s) => acc + (parseInt(s.ports) || 0), 0);
        const usedPorts = this.state.cameras.length; // Simulación: cada cámara usa 1 puerto
        const portPercent = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0;

        const stats = [
            { id: 'camera', name: 'Cámaras', count: this.state.cameras.length, icon: '📹', sub: `${totalMP} MP Totales` },
            { id: 'nvr', name: 'Almacenamiento', count: `${totalTB} TB`, icon: '💾', sub: `${this.state.nvrs.length} Grabadores` },
            { id: 'switch', name: 'Red PoE', count: `${portPercent}%`, icon: '🔌', sub: `${usedPorts}/${totalPorts} Puertos` }
        ];

        grid.innerHTML = '';
        stats.forEach(s => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            item.innerHTML = `
                <div class="icon-box">${s.icon}</div>
                <div class="count">${s.count}</div>
                <div class="label">${s.name}</div>
                <div class="sub-label">${s.sub}</div>
            `;
            grid.appendChild(item);
        });
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

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${index + 1}. ${cam.name}`, 14, currentY);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(11);
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
                styles: { halign: 'center' },
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
                styles: { halign: 'center' },
                theme: 'striped'
            });
        }

        this._showPDF(doc, 'reporte_infraestructura_cctv.pdf');
    }

    generateTherapyReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape format for tables with detailed text
        
        doc.setFontSize(18);
        doc.text('Reporte General de Citas y Terapias', 14, 20);
        doc.setFontSize(11);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

        const appointments = this.state.citas || [];
        
        // Stats calculations
        const stats = {
            total: appointments.length,
            asistio: appointments.filter(c => c.status === 'asistio' || c.status === 'asistió').length,
            pendiente: appointments.filter(c => c.status === 'pendiente').length,
            noAsistio: appointments.filter(c => c.status === 'no-asistio' || c.status === 'no-asistió').length,
            enProgreso: appointments.filter(c => c.status === 'en-progreso').length,
            cancelada: appointments.filter(c => c.status === 'cancelada').length
        };

        doc.setFontSize(10);
        doc.text(`Total Citas: ${stats.total}  |  Asistió: ${stats.asistio}  |  Pendiente: ${stats.pendiente}  |  No Asistió: ${stats.noAsistio}  |  En Progreso: ${stats.enProgreso}  |  Cancelada: ${stats.cancelada}`, 14, 35);

        // Sort appointments: date descending, time ascending
        const sortedAppts = [...appointments].sort((a, b) => {
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });

        const tableBody = sortedAppts.map(cita => {
            let notesText = '--';
            if (cita.soap && (cita.soap.subjective || cita.soap.objective || cita.soap.assessment || cita.soap.plan)) {
                notesText = '';
                if (cita.soap.subjective) notesText += `S: ${cita.soap.subjective}\n`;
                if (cita.soap.objective) notesText += `O: ${cita.soap.objective}\n`;
                if (cita.soap.assessment) notesText += `A: ${cita.soap.assessment}\n`;
                if (cita.soap.plan) notesText += `P: ${cita.soap.plan}`;
            } else if (cita.notes) {
                notesText = cita.notes;
            }

            let statusLabel = (cita.status || '').toUpperCase();
            if (statusLabel === 'ASISTIO') statusLabel = 'ASISTIÓ';
            if (statusLabel === 'NO-ASISTIO') statusLabel = 'NO ASISTIÓ';

            return [
                this.formatDateDMY(cita.date),
                cita.time,
                cita.patient,
                cita.therapist,
                statusLabel,
                notesText.trim()
            ];
        });

        doc.autoTable({
            head: [['Fecha', 'Hora', 'Paciente', 'Terapeuta', 'Estado', 'Notas / Evolución SOAP']],
            body: tableBody,
            startY: 40,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 15 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 },
                4: { cellWidth: 25 },
                5: { cellWidth: 'auto' }
            },
            headStyles: { fillHtml: true, fillColor: [230, 0, 18] } // Clean red header color to match branding
        });

        this._showPDF(doc, 'reporte_citas_terapias.pdf');
    }

    generateAutorizacionesReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Reporte de Autorizaciones Médicas', 14, 20);
        doc.setFontSize(11);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

        const autorizaciones = this.state.autorizaciones || [];
        const appointments = this.state.citas || [];

        const tableBody = autorizaciones.map(auth => {
            const used = appointments.filter(c => c.authorizationId === auth.id && (c.status === 'asistio' || c.status === 'en-progreso')).length;
            const pct = Math.round((used / auth.totalSessions) * 100);

            const todayStr = new Date().toISOString().split('T')[0];
            const isExpired = auth.expirationDate < todayStr;
            const isExhausted = used >= auth.totalSessions;
            
            let statusLabel = 'ACTIVA';
            if (isExpired) statusLabel = 'VENCIDA';
            else if (isExhausted) statusLabel = 'AGOTADA';

            return [
                auth.code,
                auth.patient,
                auth.therapist,
                `${used} / ${auth.totalSessions} (${pct}%)`,
                this.formatDateDMY(auth.expirationDate),
                statusLabel,
                auth.notes || '--'
            ];
        });

        doc.autoTable({
            head: [['Código', 'Paciente', 'Terapeuta', 'Sesiones', 'Vence', 'Estado', 'Notas']],
            body: tableBody,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
            headStyles: { fillColor: [59, 130, 246] } // Blue header for authorizations
        });

        this._showPDF(doc, 'reporte_autorizaciones.pdf');
    }

    debugState() {
        let report = `--- DIAGNÓSTICO DE DATOS ---\n`;
        report += `Proyecto Firebase: ${firebase.app().options.projectId}\n`;
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

    // --- Lógica del Calendario de Terapias ---
    prevMonth() {
        this.state.calendarMonth--;
        if (this.state.calendarMonth < 0) {
            this.state.calendarMonth = 11;
            this.state.calendarYear--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        this.state.calendarMonth++;
        if (this.state.calendarMonth > 11) {
            this.state.calendarMonth = 0;
            this.state.calendarYear++;
        }
        this.renderCalendar();
    }

    renderCalendar() {
        const titleEl = document.getElementById('calendar-month-title');
        const cellsContainer = document.getElementById('calendar-cells');
        if (!titleEl || !cellsContainer) return;

        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        titleEl.innerText = `${months[this.state.calendarMonth]} ${this.state.calendarYear}`;

        cellsContainer.innerHTML = '';

        const year = this.state.calendarYear;
        const month = this.state.calendarMonth;

        const firstDayIndex = new Date(year, month, 1).getDay();
        const prevLastDay = new Date(year, month, 0).getDate();
        const lastDay = new Date(year, month + 1, 0).getDate();

        // Rellenar días del mes anterior
        for (let i = firstDayIndex; i > 0; i--) {
            const dayNum = prevLastDay - i + 1;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-day-num">${dayNum}</span>`;
            cellsContainer.appendChild(cell);
        }

        // Rellenar días del mes actual
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        for (let day = 1; day <= lastDay; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            if (isCurrentMonth && today.getDate() === day) {
                cell.classList.add('today');
            }

            // Filtrar citas del día
            const dayCitas = (this.state.citas || []).filter(c => c.date === dateStr);

            let apptsHtml = '';
            dayCitas.forEach(cita => {
                const statusClass = cita.status.toLowerCase().replace('ó', 'o').replace('á', 'a');
                apptsHtml += `
                    <div class="calendar-appt-badge ${statusClass}" title="${cita.time} - ${cita.patient} (${cita.therapist})">
                        ${cita.time} - ${cita.patient}
                    </div>
                `;
            });

            cell.innerHTML = `
                <span class="calendar-day-num">${day}</span>
                <div class="calendar-day-appointments">
                    ${apptsHtml}
                </div>
            `;

            cell.addEventListener('click', () => this.selectDay(dateStr));
            cellsContainer.appendChild(cell);
        }

        // Rellenar días del mes siguiente
        const totalCells = cellsContainer.children.length;
        const remainingCells = 42 - totalCells;
        for (let i = 1; i <= remainingCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-day-num">${i}</span>`;
            cellsContainer.appendChild(cell);
        }

        if (this.state.selectedDate) {
            this.renderDayAppointments(this.state.selectedDate);
        }
    }

    selectDay(dateStr) {
        this.state.selectedDate = dateStr;
        
        const panel = document.getElementById('day-appointments-panel');
        if (panel) {
            panel.classList.remove('hidden');
        }

        const dateObj = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('es-ES', options);
        
        const titleEl = document.getElementById('selected-day-title');
        if (titleEl) {
            titleEl.innerText = `Citas: ${formattedDate}`;
        }

        this.renderDayAppointments(dateStr);
    }

    closeDayPanel() {
        const panel = document.getElementById('day-appointments-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
        this.state.selectedDate = null;
    }

    renderDayAppointments(dateStr) {
        const listEl = document.getElementById('selected-day-list');
        if (!listEl) return;

        const dayCitas = (this.state.citas || []).filter(c => c.date === dateStr);

        if (dayCitas.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888; width: 100%;">
                    No hay citas programadas para este día.
                </div>
            `;
            return;
        }

        dayCitas.sort((a, b) => a.time.localeCompare(b.time));

        listEl.innerHTML = '';
        dayCitas.forEach(cita => {
            const card = document.createElement('div');
            const statusClass = cita.status.toLowerCase().replace('ó', 'o').replace('á', 'a');
            card.className = `device-card cita-card ${statusClass}`;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.padding = '15px';
            card.style.borderRadius = '1rem';
            card.style.background = 'white';
            card.style.boxShadow = 'var(--shadow)';
            card.style.border = '1px solid var(--hik-border)';
            card.style.position = 'relative';

            let soapHtml = '';
            if (cita.soap && (cita.soap.subjective || cita.soap.objective || cita.soap.assessment || cita.soap.plan)) {
                soapHtml = `
                    <div class="soap-details">
                        ${cita.soap.subjective ? `<div class="soap-block"><strong>Subjetivo (S):</strong><p>${cita.soap.subjective}</p></div>` : ''}
                        ${cita.soap.objective ? `<div class="soap-block"><strong>Objetivo (O):</strong><p>${cita.soap.objective}</p></div>` : ''}
                        ${cita.soap.assessment ? `<div class="soap-block"><strong>Análisis (A):</strong><p>${cita.soap.assessment}</p></div>` : ''}
                        ${cita.soap.plan ? `<div class="soap-block"><strong>Plan (P):</strong><p>${cita.soap.plan}</p></div>` : ''}
                    </div>
                `;
            } else if (cita.notes) {
                soapHtml = `
                    <div class="soap-details">
                        <div class="soap-block">
                            <strong>Notas Generales:</strong>
                            <p>${cita.notes}</p>
                        </div>
                    </div>
                `;
            }

            const isAdmin = this.state.user?.role === 'admin';
            const actionButtons = isAdmin ? `
                <div style="position: absolute; right: 10px; top: 10px;">
                    <button class="icon-btn" onclick="app.openCitaModal(true, '${cita.id}')" style="margin-right: 5px;">✏️</button>
                    <button class="icon-btn danger" onclick="if(confirm('¿Eliminar cita?')) { app.deleteCita('${cita.id}'); }">🗑️</button>
                </div>
            ` : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin-bottom: 8px;">
                    <div>
                        <span class="badge ${statusClass}" style="font-weight: 600; font-size: 0.75rem;">
                            ${cita.status.toUpperCase()}
                        </span>
                        <h4 style="margin: 5px 0 2px 0; font-size: 1.1rem; font-weight: 700; color: var(--hik-text);">
                            ${cita.patient}
                        </h4>
                        <div style="font-size: 0.85rem; color: var(--hik-text-muted);">
                            👨‍⚕️ Terapeuta: <strong>${cita.therapist}</strong>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--hik-text-muted); margin-top: 4px;">
                            ⏰ Hora: <strong>${cita.time}</strong>
                        </div>
                    </div>
                    ${actionButtons}
                </div>

                ${soapHtml}

                <div class="quick-assistance-row">
                    <button class="quick-assist-btn present" onclick="app.changeCitaStatus('${cita.id}', 'asistio')">Asistió ✔️</button>
                    <button class="quick-assist-btn absent" onclick="app.changeCitaStatus('${cita.id}', 'no-asistio')">No Asistió ❌</button>
                    <button class="quick-assist-btn progress" onclick="app.changeCitaStatus('${cita.id}', 'en-progreso')">En Progreso 🔄</button>
                </div>
                
                <button class="primary-btn btn-sm" onclick="app.sharePatientSchedule('${cita.patient}')" style="background: #25D366; color: white; border-color: #25D366; width: 100%; margin-top: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; cursor: pointer;">
                    <span>💬</span> Enviar Citas (PDF)
                </button>
            `;
            listEl.appendChild(card);
        });
    }

    changeCitaStatus(id, newStatus) {
        const cita = this.state.citas.find(c => c.id === id);
        if (cita) {
            cita.status = newStatus;
            this.saveState();
            this.renderCalendar();
        }
    }

    openCitaModal(isEdit = false, citaId = null) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('cita-modal');
        const form = document.getElementById('cita-form');
        const title = modal.querySelector('h2');
        const deleteBtn = document.getElementById('cita-delete-btn');

        title.innerText = isEdit ? 'Editar Cita' : 'Nueva Cita';
        this.editingCitaId = citaId;

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        // Poblar selector de autorizaciones
        const authSelect = form.authorizationId;
        if (authSelect) {
            authSelect.innerHTML = '<option value="">-- Sin Autorización --</option>';
            const authList = this.state.autorizaciones || [];
            authList.forEach(auth => {
                const appointments = this.state.citas || [];
                const used = appointments.filter(c => c.authorizationId === auth.id && (c.status === 'asistio' || c.status === 'en-progreso')).length;
                const isExpired = auth.expirationDate < new Date().toISOString().split('T')[0];
                const isExhausted = used >= parseInt(auth.totalSessions);
                
                let label = `${auth.code} - ${auth.patient} (${used}/${auth.totalSessions})`;
                if (isExpired) label += ' [VENCIDA]';
                if (isExhausted) label += ' [AGOTADA]';
                
                const opt = document.createElement('option');
                opt.value = auth.id;
                opt.innerText = label;
                
                if (isEdit) {
                    const currentCita = this.state.citas.find(c => c.id === citaId);
                    if (currentCita && currentCita.authorizationId === auth.id) {
                        opt.selected = true;
                    }
                }
                
                authSelect.appendChild(opt);
            });
        }

        // Alternar visualización del bloque SOAP según estado
        const toggleSoapFields = () => {
            const status = form.status.value;
            const soapContainer = document.getElementById('soap-fields-container');
            const legacyNotesGroup = document.getElementById('legacy-notes-group');
            if (status === 'asistio' || status === 'en-progreso') {
                soapContainer?.classList.remove('hidden');
                legacyNotesGroup?.classList.add('hidden');
            } else {
                soapContainer?.classList.add('hidden');
                legacyNotesGroup?.classList.remove('hidden');
            }
        };

        form.status.onchange = toggleSoapFields;

        if (isEdit && citaId) {
            const cita = this.state.citas.find(c => c.id === citaId);
            form.patient.value = cita.patient;
            form.therapist.value = cita.therapist;
            form.date.value = cita.date;
            form.time.value = cita.time;
            form.status.value = cita.status;
            form.notes.value = cita.notes || '';
            
            // Campos SOAP individuales
            form.soap_subjective.value = cita.soap?.subjective || '';
            form.soap_objective.value = cita.soap?.objective || '';
            form.soap_assessment.value = cita.soap?.assessment || '';
            form.soap_plan.value = cita.soap?.plan || '';
            
            toggleSoapFields();
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            form.reset();
            if (this.state.selectedDate) {
                form.date.value = this.state.selectedDate;
            } else {
                form.date.value = new Date().toISOString().split('T')[0];
            }
            form.status.value = 'pendiente';
            toggleSoapFields();
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }
    }

    handleCitaSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const status = formData.get('status');
        const citaData = {
            id: this.editingCitaId || Date.now().toString(),
            authorizationId: formData.get('authorizationId') || null,
            patient: formData.get('patient'),
            therapist: formData.get('therapist'),
            date: formData.get('date'),
            time: formData.get('time'),
            status: status,
            notes: formData.get('notes'),
            soap: (status === 'asistio' || status === 'en-progreso') ? {
                subjective: formData.get('soap_subjective'),
                objective: formData.get('soap_objective'),
                assessment: formData.get('soap_assessment'),
                plan: formData.get('soap_plan')
            } : null
        };

        // Validaciones de Autorización
        const authId = citaData.authorizationId;
        if (authId && (status === 'asistio' || status === 'en-progreso')) {
            const auth = this.state.autorizaciones.find(a => a.id === authId);
            if (auth) {
                const existingCount = (this.state.citas || []).filter(c => 
                    c.authorizationId === authId && 
                    c.id !== citaData.id && 
                    (c.status === 'asistio' || c.status === 'en-progreso')
                ).length;
                
                if (existingCount >= parseInt(auth.totalSessions)) {
                    if (!confirm(`⚠️ Alerta: Esta autorización ya alcanzó o superará el límite de sesiones (${existingCount}/${auth.totalSessions}). ¿Desea guardarla de todos modos?`)) {
                        return;
                    }
                }
                
                const citaDate = citaData.date;
                if (auth.expirationDate && citaDate > auth.expirationDate) {
                    const citaDateFormatted = this.formatDateDMY(citaDate);
                    const authExpDateFormatted = this.formatDateDMY(auth.expirationDate);
                    if (!confirm(`⚠️ Alerta: La fecha de la cita (${citaDateFormatted}) es posterior al vencimiento de la autorización (${authExpDateFormatted}). ¿Desea guardarla de todos modos?`)) {
                        return;
                    }
                }
            }
        }

        if (this.editingCitaId) {
            const index = this.state.citas.findIndex(c => c.id === this.editingCitaId);
            if (index !== -1) {
                this.state.citas[index] = citaData;
            }
        } else {
            if (!this.state.citas) this.state.citas = [];
            this.state.citas.push(citaData);
        }

        this.saveState();
        this.closeModals();
        this.renderCalendar();
    }

    deleteCita(id) {
        this.state.citas = this.state.citas.filter(c => c.id !== id);
        this.saveState();
        this.renderCalendar();
    }

    handleCitaAuthChange(authId) {
        const form = document.getElementById('cita-form');
        if (!form) return;
        if (authId) {
            const auth = this.state.autorizaciones.find(a => a.id === authId);
            if (auth) {
                form.patient.value = auth.patient;
                form.therapist.value = auth.therapist;
            }
        } else {
            form.patient.value = '';
            form.therapist.value = '';
        }
    }

    // --- Lógica de Autorizaciones ---
    openAutorizacionModal(isEdit = false, authId = null) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('autorizacion-modal');
        const form = document.getElementById('autorizacion-form');
        const title = document.getElementById('autorizacion-modal-title');
        const deleteBtn = document.getElementById('autorizacion-delete-btn');

        title.innerText = isEdit ? 'Editar Autorización' : 'Nueva Autorización';
        this.editingAutorizacionId = authId;

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        if (isEdit && authId) {
            const auth = this.state.autorizaciones.find(a => a.id === authId);
            if (auth) {
                form.code.value = auth.code;
                form.patient.value = auth.patient;
                form.therapist.value = auth.therapist;
                form.totalSessions.value = auth.totalSessions;
                form.expirationDate.value = auth.expirationDate;
                form.notes.value = auth.notes || '';
            }
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            form.reset();
            form.expirationDate.value = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }
    }

    handleAutorizacionSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const authData = {
            id: this.editingAutorizacionId || 'auth_' + Date.now().toString(),
            code: formData.get('code'),
            patient: formData.get('patient'),
            therapist: formData.get('therapist'),
            totalSessions: parseInt(formData.get('totalSessions')),
            expirationDate: formData.get('expirationDate'),
            notes: formData.get('notes')
        };

        if (!this.state.autorizaciones) this.state.autorizaciones = [];

        if (this.editingAutorizacionId) {
            const index = this.state.autorizaciones.findIndex(a => a.id === this.editingAutorizacionId);
            if (index !== -1) {
                this.state.autorizaciones[index] = authData;
            }
        } else {
            this.state.autorizaciones.push(authData);
        }

        this.saveState();
        this.closeModals();
        this.renderAutorizaciones();
    }

    deleteAutorizacion(id) {
        this.state.autorizaciones = this.state.autorizaciones.filter(a => a.id !== id);
        if (this.state.citas) {
            this.state.citas.forEach(cita => {
                if (cita.authorizationId === id) {
                    cita.authorizationId = null;
                }
            });
        }
        this.saveState();
        this.renderAutorizaciones();
    }

    renderAutorizaciones() {
        const grid = document.getElementById('autorizaciones-grid');
        if (!grid) return;

        const filterQuery = (document.getElementById('auth-search')?.value || '').toLowerCase();
        
        let filtered = this.state.autorizaciones || [];
        if (filterQuery) {
            filtered = filtered.filter(a => 
                a.code.toLowerCase().includes(filterQuery) || 
                a.patient.toLowerCase().includes(filterQuery) || 
                a.therapist.toLowerCase().includes(filterQuery)
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888; grid-column: 1 / -1; width: 100%;">
                    No se encontraron autorizaciones registradas.
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        filtered.forEach(auth => {
            const appointments = this.state.citas || [];
            const used = appointments.filter(c => c.authorizationId === auth.id && (c.status === 'asistio' || c.status === 'en-progreso')).length;
            
            const todayStr = new Date().toISOString().split('T')[0];
            const isExpired = auth.expirationDate < todayStr;
            const isExhausted = used >= auth.totalSessions;
            
            let status = 'activa';
            let statusLabel = 'Activa';
            if (isExpired) {
                status = 'vencida';
                statusLabel = 'Vencida';
            } else if (isExhausted) {
                status = 'agotada';
                statusLabel = 'Agotada';
            }

            const card = document.createElement('div');
            card.className = `device-card auth-card ${status}`;
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.padding = '20px';
            card.style.borderRadius = '1.5rem';
            card.style.background = 'white';
            card.style.boxShadow = 'var(--shadow)';
            card.style.position = 'relative';

            const pct = Math.min(100, Math.round((used / auth.totalSessions) * 100));
            let progClass = '';
            if (pct >= 90) progClass = 'danger';
            else if (pct >= 70) progClass = 'warning';

            const isAdmin = this.state.user?.role === 'admin';
            const actionButtons = isAdmin ? `
                <div style="position: absolute; right: 15px; top: 15px;">
                    <button class="icon-btn" onclick="app.openAutorizacionModal(true, '${auth.id}')" style="margin-right: 5px;">✏️</button>
                    <button class="icon-btn danger" onclick="if(confirm('¿Eliminar autorización?')) { app.deleteAutorizacion('${auth.id}'); }">🗑️</button>
                </div>
            ` : '';

            card.innerHTML = `
                <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span class="badge ${status}" style="font-weight: bold; font-size: 0.75rem;">
                        ${statusLabel.toUpperCase()}
                    </span>
                    ${actionButtons}
                </div>
                
                <h4 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700; color: var(--hik-text);">
                    ${auth.code}
                </h4>
                
                <div style="font-size: 0.9rem; color: var(--hik-text); margin-bottom: 5px;">
                    👤 Paciente: <strong>${auth.patient}</strong>
                </div>
                
                <div style="font-size: 0.9rem; color: var(--hik-text); margin-bottom: 5px;">
                    👨‍⚕️ Terapeuta: <strong>${auth.therapist}</strong>
                </div>
                
                <div style="font-size: 0.85rem; color: var(--hik-text-muted); margin-bottom: 15px;">
                    📅 Vence: <strong>${this.formatDateDMY(auth.expirationDate)}</strong>
                </div>

                ${auth.notes ? `
                <div style="font-size: 0.8rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-bottom: 15px; color: #475569;">
                    <strong>Notas:</strong> ${auth.notes}
                </div>
                ` : ''}

                <div class="session-progress-container">
                    <div class="session-progress-label">
                        <span>Progreso de Sesiones:</span>
                        <span>${used} / ${auth.totalSessions}</span>
                    </div>
                    <div class="session-progress-bar">
                        <div class="session-progress-fill ${progClass}" style="width: ${pct}%"></div>
                    </div>
                </div>

                <button class="primary-btn btn-sm" onclick="app.sharePatientSchedule('${auth.patient}')" style="background: #25D366; color: white; border-color: #25D366; width: 100%; margin-top: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; cursor: pointer;">
                    <span>💬</span> Enviar Citas (PDF)
                </button>
            `;
            grid.appendChild(card);
    openShareScheduleModal() {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('share-schedule-modal');
        const select = document.getElementById('share-schedule-patient');
        if (!overlay || !modal || !select) return;

        // Get unique patients
        const patientsSet = new Set();
        (this.state.citas || []).forEach(c => {
            if (c.patient) patientsSet.add(c.patient.trim());
        });
        (this.state.autorizaciones || []).forEach(a => {
            if (a.patient) patientsSet.add(a.patient.trim());
        });

        const sortedPatients = Array.from(patientsSet).sort((a, b) => a.localeCompare(b));

        select.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
        sortedPatients.forEach(patient => {
            const opt = document.createElement('option');
            opt.value = patient;
            opt.innerText = patient;
            select.appendChild(opt);
        });

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    closeShareScheduleModal() {
        this.closeModals();
    }

    handleShareScheduleSubmit() {
        const select = document.getElementById('share-schedule-patient');
        const patientName = select?.value;
        if (!patientName) {
            alert('Por favor seleccione un paciente.');
            return;
        }
        this.closeShareScheduleModal();
        this.sharePatientSchedule(patientName);
    }

    async sharePatientSchedule(patientName) {
        if (!patientName) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Filter and sort appointments
        const patientCitas = (this.state.citas || []).filter(c => 
            c.patient && c.patient.toLowerCase().trim() === patientName.toLowerCase().trim()
        );

        if (patientCitas.length === 0) {
            alert(`No se encontraron citas programadas para el paciente: ${patientName}`);
            return;
        }

        const sortedAppts = [...patientCitas].sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });

        // PDF Styling & Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(230, 0, 18); // Accent red
        doc.text('Cronograma de Citas de Terapia', 14, 20);

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Paciente: ${patientName}`, 14, 28);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 34);

        // Stats
        const stats = {
            total: sortedAppts.length,
            pendiente: sortedAppts.filter(c => c.status === 'pendiente').length,
            asistio: sortedAppts.filter(c => c.status === 'asistio' || c.status === 'asistió').length,
            noAsistio: sortedAppts.filter(c => c.status === 'no-asistio' || c.status === 'no-asistió').length,
            enProgreso: sortedAppts.filter(c => c.status === 'en-progreso').length,
            cancelada: sortedAppts.filter(c => c.status === 'cancelada').length
        };
        doc.text(`Total Citas: ${stats.total}  |  Pendientes: ${stats.pendiente}  |  Asistidas: ${stats.asistio}  |  Canceladas: ${stats.cancelada}`, 14, 42);

        const tableBody = sortedAppts.map(cita => {
            let notesText = '--';
            if (cita.soap && (cita.soap.subjective || cita.soap.objective || cita.soap.assessment || cita.soap.plan)) {
                notesText = '';
                if (cita.soap.subjective) notesText += `S: ${cita.soap.subjective}\n`;
                if (cita.soap.objective) notesText += `O: ${cita.soap.objective}\n`;
                if (cita.soap.assessment) notesText += `A: ${cita.soap.assessment}\n`;
                if (cita.soap.plan) notesText += `P: ${cita.soap.plan}`;
            } else if (cita.notes) {
                notesText = cita.notes;
            }

            let statusLabel = (cita.status || '').toUpperCase();
            if (statusLabel === 'ASISTIO') statusLabel = 'ASISTIÓ';
            if (statusLabel === 'NO-ASISTIO') statusLabel = 'NO ASISTIÓ';

            return [
                this.formatDateDMY(cita.date),
                cita.time,
                cita.therapist,
                statusLabel,
                notesText.trim()
            ];
        });

        doc.autoTable({
            head: [['Fecha', 'Hora', 'Terapeuta', 'Estado', 'Notas / Evolución']],
            body: tableBody,
            startY: 48,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
            headStyles: { fillColor: [230, 0, 18] } // Red header
        });

        const filename = `programacion_citas_${patientName.replace(/\s+/g, '_')}.pdf`;

        // Check if Web Share API with files is supported
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: `Citas de ${patientName}`,
                    text: `Hola ${patientName}, adjunto el cronograma completo de tus citas de terapia.`
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error al compartir:', err);
                    doc.save(filename);
                    this._fallbackWhatsApp(patientName);
                }
            }
        } else {
            // Fallback: download PDF and open WhatsApp Web/App
            doc.save(filename);
            this._fallbackWhatsApp(patientName);
        }
    }

    _fallbackWhatsApp(patientName) {
        const text = `Hola ${patientName}, te comparto el cronograma de tus citas de terapia. Ya se ha descargado el archivo PDF en tu dispositivo para que puedas abrirlo o adjuntarlo.`;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }
}
// Inicializar
window.app = new AlarmApp();
