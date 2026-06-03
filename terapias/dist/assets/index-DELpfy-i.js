(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(e){if(!e)return`01/01/1900`;let[t,n,r]=e.split(`-`);return`${r}/${n}/${t}`}function t(e){return e?e.slice(0,5):`08:00`}function n(e,t){return String(e??``).replace(/[|,\n\r]/g,` `).slice(0,t).padEnd(t)}var r={CC:`01`,TI:`02`,CE:`03`,PA:`04`,RC:`05`,AS:`06`,MS:`07`,NV:`08`,CD:`09`,SC:`10`,PE:`11`};function i(e){return r[String(e||`CC`).toUpperCase()]||`01`}function a(t,r,a,o,s){let c=[];return t.forEach((t,o)=>{let s=r.find(e=>String(e.pacienteId||e.patientId)===String(t.id)),l=String(s?s.numeroAutorizacion:1e3+o),u=i(t.tipoDocumento),d=String(t.numeroDocumento||t.id).replace(/[^0-9A-Za-z]/g,``),f=e(t.fechaNacimiento||t.dob),p=String(t.genero||`M`).toUpperCase().charAt(0),m=String(t.municipio||`05001`).replace(/[^0-9]/g,``).padEnd(5,`0`).slice(0,5),h=String(t.zona||`U`).toUpperCase().charAt(0),g=n(t.epsNombre||s?.epsNombre||`PARTICULAR`,30),_=n(t.epsCodigo||s?.epsCodigo||`EPS999`,12);c.push([l,a,u,d,f,p,m,h,`1`,`03`,g.trim(),_.trim()].join(`|`))}),c.join(`\r
`)}function o(n,r,a,o,s,c){let l=[],u=new Date(s+`T00:00:00`),d=new Date(c+`T23:59:59`);return n.filter(e=>{if(!e.isCompleted&&e.estado!==`Atendida`)return!1;let t=new Date((e.date||`2000-01-01`)+`T00:00:00`);return t>=u&&t<=d}).forEach(n=>{let s=r.find(e=>String(e.id)===String(n.patientId||n.pacienteId));if(!s)return;let c=a.find(e=>String(e.pacienteId||e.patientId)===String(s.id)),u=String(c?c.numeroAutorizacion:1e3+parseInt(n.id||0)),d=i(s.tipoDocumento),f=String(s.numeroDocumento||s.id).replace(/[^0-9A-Za-z]/g,``),p=String(c?.numeroAutorizacion||n.autorizacion||`000000`),m=String(n.cupsCodigo||c?.cupsCodigo||`930101`),h=String(n.diagnosticoCodigo||`Z009`).toUpperCase().slice(0,6),g=String(parseInt(n.valor||0)),_=String(parseInt(n.copago||0)),v=e(n.date),y=t(n.time);l.push([u,o,v,y,d,f,p,m,`1`,`02`,`2`,h,`000`,`000`,`03`,g,_].join(`|`))}),l.join(`\r
`)}function s(t,n,r,i,a,o){return[t,e(n),e(r),String(i),String(o),`0`,String(a),`0`,`0`,`0`,`0`].join(`|`)}function c(e,t){let n=new Blob([e],{type:`text/plain;charset=utf-8`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=t,i.click(),URL.revokeObjectURL(r)}var l=`modulepreload`,u=function(e){return`/terapias/`+e},d={},f=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=u(t,n),t in d)return;d[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:l,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};firebase.apps.length||firebase.initializeApp({apiKey:`AIzaSyBDKIYmnslJPv3NX9F5eUQ_A_rQMGGo3uk`,authDomain:`alarma-pro-a903d.firebaseapp.com`,projectId:`alarma-pro-a903d`,storageBucket:`alarma-pro-a903d.firebasestorage.app`,messagingSenderId:`408079567330`,appId:`1:408079567330:web:a453dbce735dc7fa1ed1bb`});var p=firebase.firestore();p.enablePersistence({synchronizeTabs:!0}).catch(e=>{console.warn(`Firestore offline persistence status:`,e.code)});var m=firebase.auth(),h={PATIENTS:`therapy_app_patients`,SESSIONS:`therapy_app_sessions`,THEME:`therapy_app_theme`},g=class{constructor(e){this.currentUser=e,this.patients=[],this.sessions=[],this.autorizaciones=[],this.loadingPatients=!0,this.loadingSessions=!0,this.loadingAutorizaciones=!0,this.pendingWritesPatients=!1,this.pendingWritesSessions=!1,this.pendingWritesAutorizaciones=!1,this.currentDate=new Date,this.selectedDateStr=this.formatDateISO(this.currentDate),this.initDOMRefs(),this.initTheme(),this.initEvents(),this.checkOnlineStatus(),this.updateProfileUI(),this.navigate(`dashboard`),this.initFirebaseListeners()}initFirebaseListeners(){this.loadingPatients=!0,this.loadingSessions=!0,this.loadingAutorizaciones=!0,p.collection(`therapy_patients`).onSnapshot(e=>{this.patients=e.docs.map(e=>({id:e.id,...e.data()})),this.loadingPatients=!1,this.pendingWritesPatients=e.metadata.hasPendingWrites,this.updateSyncStatusIndicator(),this.updateUI()},e=>{console.error(e),this.loadingPatients=!1,this.updateUI()}),p.collection(`therapy_sessions`).onSnapshot(e=>{this.sessions=e.docs.map(e=>({id:e.id,...e.data()})),this.loadingSessions=!1,this.pendingWritesSessions=e.metadata.hasPendingWrites,this.updateSyncStatusIndicator(),this.updateUI()},e=>{console.error(e),this.loadingSessions=!1,this.updateUI()}),p.collection(`therapy_autorizaciones`).onSnapshot(e=>{this.autorizaciones=e.docs.map(e=>({id:e.id,...e.data()})),this.loadingAutorizaciones=!1,this.pendingWritesAutorizaciones=e.metadata.hasPendingWrites,this.updateSyncStatusIndicator(),this.updateUI()},e=>{console.error(e),this.loadingAutorizaciones=!1,this.updateUI()})}updateUI(){this.updateStats(),this.renderPatientsList(),this.renderDatePicker(),this.renderAgendaForSelectedDay(),this.populatePatientDropdowns(),this.currentView===`dashboard`?(this.renderDashboardTimeline(),this.renderRecentPatients()):this.currentView===`progress`?this.handleProgressPatientChange():this.currentView===`autorizaciones`&&this.renderAutorizaciones()}updateProfileUI(){let e=this.currentUser;if(!e)return;let t=e.displayName||e.email.split(`@`)[0],n=t.charAt(0).toUpperCase(),r=e.email,i=document.getElementById(`sidebar-avatar`),a=document.getElementById(`sidebar-name`),o=document.getElementById(`sidebar-email`),s=document.getElementById(`dashboard-greeting-name`);i&&(i.textContent=n),a&&(a.textContent=t),o&&(o.textContent=r),s&&(s.textContent=t.split(` `)[0])}saveToStorage(){localStorage.setItem(h.PATIENTS,JSON.stringify(this.patients)),localStorage.setItem(h.SESSIONS,JSON.stringify(this.sessions))}initDOMRefs(){this.menuItems=document.querySelectorAll(`.menu-item`),this.views=document.querySelectorAll(`.content-view`),this.themeToggleBtn=document.getElementById(`theme-toggle-btn`),this.globalSearch=document.getElementById(`global-search`),this.statTotalPatients=document.getElementById(`stat-total-patients`),this.statTodaySessions=document.getElementById(`stat-today-sessions`),this.statCompletedPct=document.getElementById(`stat-completed-pct`),this.statPendingCitas=document.getElementById(`stat-pending-citas`),this.todayTimeline=document.getElementById(`today-timeline`),this.recentPatientsContainer=document.getElementById(`recent-patients-container`),document.getElementById(`link-to-agenda`).addEventListener(`click`,()=>this.navigate(`agenda`)),document.getElementById(`link-to-patients`).addEventListener(`click`,()=>this.navigate(`patients`)),document.getElementById(`btn-quick-session`).addEventListener(`click`,()=>this.openSessionModal()),this.patientsGridContainer=document.getElementById(`patients-grid-container`),this.patientSearchInput=document.getElementById(`patient-search-input`),this.btnAddPatient=document.getElementById(`btn-add-patient`),this.modalPatient=document.getElementById(`modal-patient`),this.formPatient=document.getElementById(`form-patient`),this.closeModalPatient=document.getElementById(`close-modal-patient`),this.btnCancelPatient=document.getElementById(`btn-cancel-patient`),this.btnAddAppointment=document.getElementById(`btn-add-appointment`),this.modalSession=document.getElementById(`modal-session`),this.formSession=document.getElementById(`form-session`),this.closeModalSession=document.getElementById(`close-modal-session`),this.btnCancelSession=document.getElementById(`btn-cancel-session`),this.dpMonthTitle=document.getElementById(`dp-month-title`),this.dpDaysGrid=document.getElementById(`dp-days-grid`),this.dpPrevMonth=document.getElementById(`dp-prev-month`),this.dpNextMonth=document.getElementById(`dp-next-month`),this.selectedDayTitle=document.getElementById(`selected-day-title`),this.selectedDayCount=document.getElementById(`selected-day-count`),this.agendaSessionsList=document.getElementById(`agenda-sessions-list`),this.initRangeBadge(`s-pain`,`pain-badge`,``),this.initRangeBadge(`s-mobility`,`mobility-badge`,`%`),this.initRangeBadge(`s-mood`,`mood-badge`,``),this.sIsCompleted=document.getElementById(`s-is-completed`),this.sIsCompleted.addEventListener(`change`,()=>this.toggleSessionModalFields()),this.progressPatientSelect=document.getElementById(`progress-patient-select`),this.evolutionContent=document.getElementById(`evolution-content`),this.evolutionEmptyPrompt=document.getElementById(`evolution-empty-prompt`),this.valDolor=document.getElementById(`val-dolor`),this.valMovilidad=document.getElementById(`val-movilidad`),this.valAnimo=document.getElementById(`val-animo`),this.valSesiones=document.getElementById(`val-sesiones`),this.notesEvolutionTimeline=document.getElementById(`notes-evolution-timeline`),this.geminiConfigBtn=document.getElementById(`gemini-config-btn`),this.modalGeminiConfig=document.getElementById(`modal-gemini-config`),this.formGeminiConfig=document.getElementById(`form-gemini-config`),this.closeModalGemini=document.getElementById(`close-modal-gemini`),this.btnCancelGemini=document.getElementById(`btn-cancel-gemini`),this.geminiApiKeyInput=document.getElementById(`gemini-api-key`),this.btnOptimizeNotes=document.getElementById(`btn-optimize-notes`),this.offlineIndicator=document.getElementById(`offline-indicator`),this.btnExportBackup=document.getElementById(`btn-export-backup`),this.btnImportBackup=document.getElementById(`btn-import-backup`),this.importBackupFile=document.getElementById(`import-backup-file`)}initRangeBadge(e,t,n){let r=document.getElementById(e),i=document.getElementById(t);r&&i&&r.addEventListener(`input`,e=>{i.textContent=e.target.value+n})}toggleSessionModalFields(){document.querySelectorAll(`.s-completed-only`).forEach(e=>{e.style.display=this.sIsCompleted.checked?`block`:`none`});let e=document.getElementById(`notes-label`);this.sIsCompleted.checked?e.textContent=`Notas de la Sesión / Ejercicios Realizados`:e.textContent=`Indicaciones para el Paciente / Notas de Programación`}initTheme(){let e=localStorage.getItem(h.THEME)||`light`;document.documentElement.setAttribute(`data-theme`,e),this.updateThemeBtnUI(e)}updateThemeBtnUI(e){let t=this.themeToggleBtn.querySelector(`.toggle-text`);e===`dark`?t.textContent=`Tema Claro`:t.textContent=`Tema Oscuro`}initEvents(){this.themeToggleBtn.addEventListener(`click`,()=>{let e=document.documentElement.getAttribute(`data-theme`)===`dark`?`light`:`dark`;document.documentElement.setAttribute(`data-theme`,e),localStorage.setItem(h.THEME,e),this.updateThemeBtnUI(e),this.currentView===`progress`&&this.renderEvolutionChart()});let e=document.getElementById(`btn-logout`);e&&e.addEventListener(`click`,()=>this.handleLogout()),this.menuItems.forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.view;this.navigate(t)})}),this.globalSearch.addEventListener(`input`,e=>{let t=e.target.value.toLowerCase();t.trim()!==``&&(this.patientSearchInput.value=t,this.navigate(`patients`),this.renderPatientsList())}),this.patientSearchInput.addEventListener(`input`,()=>this.renderPatientsList()),this.btnAddPatient.addEventListener(`click`,()=>this.openPatientModal()),this.closeModalPatient.addEventListener(`click`,()=>this.closePatientModal()),this.btnCancelPatient.addEventListener(`click`,()=>this.closePatientModal()),this.btnAddAppointment.addEventListener(`click`,()=>this.openSessionModal(null,!1)),this.closeModalSession.addEventListener(`click`,()=>this.closeSessionModal()),this.btnCancelSession.addEventListener(`click`,()=>this.closeSessionModal()),this.formPatient.addEventListener(`submit`,e=>this.handlePatientSubmit(e)),this.formSession.addEventListener(`submit`,e=>this.handleSessionSubmit(e)),this.dpPrevMonth.addEventListener(`click`,()=>this.changeMonth(-1)),this.dpNextMonth.addEventListener(`click`,()=>this.changeMonth(1)),this.progressPatientSelect.addEventListener(`change`,()=>this.handleProgressPatientChange()),this.geminiConfigBtn&&this.geminiConfigBtn.addEventListener(`click`,()=>this.openGeminiModal()),this.closeModalGemini&&this.closeModalGemini.addEventListener(`click`,()=>this.closeGeminiModal()),this.btnCancelGemini&&this.btnCancelGemini.addEventListener(`click`,()=>this.closeGeminiModal()),this.formGeminiConfig&&this.formGeminiConfig.addEventListener(`submit`,e=>this.handleGeminiConfigSubmit(e)),this.btnOptimizeNotes&&this.btnOptimizeNotes.addEventListener(`click`,()=>this.optimizeNotesWithAI()),window.addEventListener(`online`,()=>this.checkOnlineStatus()),window.addEventListener(`offline`,()=>this.checkOnlineStatus()),this.btnExportBackup&&this.btnExportBackup.addEventListener(`click`,()=>this.exportData()),this.btnImportBackup&&this.btnImportBackup.addEventListener(`click`,()=>this.importBackupFile.click()),this.importBackupFile&&this.importBackupFile.addEventListener(`change`,e=>this.handleImport(e));let t=document.getElementById(`btn-generar-rips`);t&&t.addEventListener(`click`,()=>this.openRipsModal());let n=document.getElementById(`btn-close-rips`);n&&n.addEventListener(`click`,()=>this.closeRipsModal());let r=document.getElementById(`btn-rips-preview`);r&&r.addEventListener(`click`,()=>this.generateRipsPreview());let i=document.getElementById(`btn-dl-ct`);i&&i.addEventListener(`click`,()=>this.downloadRipsFile(`CT`));let a=document.getElementById(`btn-dl-af`);a&&a.addEventListener(`click`,()=>this.downloadRipsFile(`AF`));let o=document.getElementById(`btn-dl-ap`);o&&o.addEventListener(`click`,()=>this.downloadRipsFile(`AP`));let s=document.getElementById(`btn-dl-all`);s&&s.addEventListener(`click`,()=>this.downloadRipsAll())}checkOnlineStatus(){this.updateSyncStatusIndicator()}updateSyncStatusIndicator(){let e=navigator.onLine,t=this.pendingWritesPatients||this.pendingWritesSessions||this.pendingWritesAutorizaciones,n=this.offlineIndicator;n&&(e?t?(n.innerHTML=`<span class="material-symbols-rounded" style="animation: spin-pulse 1.5s infinite linear;">sync</span><span>Sincronizando...</span>`,n.style.backgroundColor=`var(--accent-amber-light)`,n.style.color=`var(--accent-amber)`,n.style.display=`flex`,n.classList.add(`visible`)):(n.innerHTML=`<span class="material-symbols-rounded">cloud_done</span><span>Sincronizado</span>`,n.style.backgroundColor=`var(--accent-emerald-light)`,n.style.color=`var(--accent-emerald)`,n.style.display=`flex`,n.classList.add(`visible`),this.syncTimeout&&clearTimeout(this.syncTimeout),this.syncTimeout=setTimeout(()=>{let e=this.pendingWritesPatients||this.pendingWritesSessions||this.pendingWritesAutorizaciones;navigator.onLine&&!e&&(n.classList.remove(`visible`),n.style.display=`none`)},3e3)):(n.innerHTML=`<span class="material-symbols-rounded">wifi_off</span><span>Sin conexión (Local)</span>`,n.style.backgroundColor=`var(--danger-light)`,n.style.color=`var(--danger)`,n.style.display=`flex`,n.classList.add(`visible`)))}navigate(e){this.currentView=e,this.menuItems.forEach(t=>{t.dataset.view===e?t.classList.add(`active`):t.classList.remove(`active`)}),this.views.forEach(t=>{t.id===`view-${e}`?t.classList.add(`active`):t.classList.remove(`active`)}),e===`dashboard`?(this.updateStats(),this.renderDashboardTimeline(),this.renderRecentPatients()):e===`patients`?this.renderPatientsList():e===`agenda`?(this.renderDatePicker(),this.renderAgendaForSelectedDay()):e===`progress`?(this.populatePatientDropdowns(),this.handleProgressPatientChange()):e===`autorizaciones`&&this.renderAutorizaciones()}updateStats(){let e=this.formatDateISO(new Date);this.statTotalPatients.textContent=this.patients.length;let t=this.sessions.filter(t=>t.date===e);this.statTodaySessions.textContent=t.length;let n=t.filter(e=>!e.isCompleted).length;if(this.statPendingCitas.textContent=n,t.length===0)this.statCompletedPct.textContent=`100%`;else{let e=t.filter(e=>e.isCompleted).length,n=Math.round(e/t.length*100);this.statCompletedPct.textContent=`${n}%`}}renderDashboardTimeline(){let e=this.formatDateISO(new Date),t=this.sessions.filter(t=>t.date===e);if(t.sort((e,t)=>e.time.localeCompare(t.time)),t.length===0){this.todayTimeline.innerHTML=`
        <div class="empty-state">
          <span class="material-symbols-rounded">event_busy</span>
          <p>No tienes sesiones agendadas para hoy.</p>
        </div>`;return}this.todayTimeline.innerHTML=t.map(e=>{let t=this.patients.find(t=>t.id===e.patientId)||{name:`Paciente Desconocido`,diagnosis:`No especificado`},n=e.isCompleted?`completed`:`pending`,r=e.isCompleted?`Completada`:`Pendiente`,i=e.isCompleted?`status-completed`:`status-pending`;return`
        <div class="timeline-item ${n}">
          <div class="timeline-time">${e.time}</div>
          <div class="timeline-line"></div>
          <div class="timeline-card">
            <div class="card-detail">
              <div class="card-title">${t.name}</div>
              <div class="card-subtitle">${t.diagnosis.substring(0,50)}...</div>
            </div>
            <span class="badge-status ${i}">${r}</span>
          </div>
        </div>`}).join(``)}renderRecentPatients(){if(this.patients.length===0){this.recentPatientsContainer.innerHTML=`
        <div class="empty-state">
          <span class="material-symbols-rounded">person_search</span>
          <p>Aún no has registrado pacientes.</p>
        </div>`;return}let e=[...this.patients].reverse().slice(0,4);this.recentPatientsContainer.innerHTML=e.map(e=>{let t=e.name.charAt(0).toUpperCase();return`
        <div class="recent-patient-row" style="cursor: pointer;" onclick="app.viewPatientEvolution('${e.id}')">
          <div class="patient-info-left">
            <div class="p-avatar">${t}</div>
            <div class="patient-meta">
              <h4>${e.name}</h4>
              <p>${e.diagnosis.substring(0,35)}...</p>
            </div>
          </div>
          <span class="material-symbols-rounded" style="color: var(--primary);">arrow_forward</span>
        </div>`}).join(``)}openHistorial(e){let t=this.patients.find(t=>String(t.id)===String(e));if(!t)return;document.getElementById(`historial-avatar`).textContent=(t.name||`?`).charAt(0).toUpperCase(),document.getElementById(`historial-patient-name`).textContent=t.name||`Paciente`,document.getElementById(`historial-patient-eps`).textContent=t.epsNombre?`${t.epsNombre} | Doc: ${t.tipoDocumento||``}-${t.numeroDocumento||``}`:`Sin EPS registrada`,this.renderHistorial(e);let n=document.getElementById(`modal-historial`);n.style.display=`flex`,setTimeout(()=>n.classList.add(`active`),10),document.getElementById(`btn-close-historial`).onclick=()=>this.closeHistorial(),n.addEventListener(`click`,e=>{e.target===n&&this.closeHistorial()},{once:!0})}closeHistorial(){let e=document.getElementById(`modal-historial`);e.classList.remove(`active`),setTimeout(()=>{e.style.display=`none`},300)}renderHistorial(e){let t=this.sessions.filter(t=>String(t.patientId)===String(e)).sort((e,t)=>{let n=new Date((e.date||`2000-01-01`)+`T`+(e.time||`00:00`));return new Date((t.date||`2000-01-01`)+`T`+(t.time||`00:00`))-n}),n=t.length,r=t.filter(e=>e.isCompleted).length,i=n-r,a=this.autorizaciones.find(t=>String(t.pacienteId||t.patientId)===String(e)),o=a?a.numeroAutorizacion:`—`;if(document.getElementById(`historial-summary`).innerHTML=`
      <div class="hist-stat"><strong>${n}</strong><small>Total citas</small></div>
      <div class="hist-stat"><strong style="color:var(--accent-emerald)">${r}</strong><small>Realizadas</small></div>
      <div class="hist-stat"><strong style="color:var(--accent-amber)">${i}</strong><small>Pendientes</small></div>
      <div class="hist-stat"><strong style="color:var(--text-secondary)">${o}</strong><small>N° Autorización</small></div>`,t.length===0){document.getElementById(`historial-sessions-list`).innerHTML=`
        <div class="empty-state"><span class="material-symbols-rounded">event_busy</span><p>No hay sesiones registradas para este paciente.</p></div>`;return}document.getElementById(`historial-sessions-list`).innerHTML=t.map((e,t)=>{let r=e.date?new Date(e.date+`T00:00:00`).toLocaleDateString(`es-ES`,{weekday:`short`,day:`numeric`,month:`short`,year:`numeric`}):`Fecha desconocida`,i=e.isCompleted||e.estado===`Atendida`,a=i?`hist-badge-done`:`hist-badge-pending`,o=i?`Atendida`:`Programada`,s=e.notes||e.evolucionNotas||``,c=e.soapS||``,l=e.soapO||``,u=e.soapA||``,d=e.soapP||``,f=c||l||u||d,p=e.diagnosticoCodigo||``,m=e.diagnosticoNombre||``,h=e.cupsNombre||e.cupsCodigo||``,g=e.copago==null?null:`$${Number(e.copago).toLocaleString(`es-CO`)}`,_=e.sesionNumero?`Sesión #${e.sesionNumero}`:`Sesión #${n-t}`,v=e.therapistName||e.terapeutaNombre||``;return`
        <div class="hist-session-card ${i?``:`hist-pending`}">
          <div class="hist-session-header">
            <div class="hist-session-meta">
              <span class="hist-session-num">${_}</span>
              <span class="hist-date">
                <span class="material-symbols-rounded" style="font-size:1rem;">calendar_today</span>
                ${r}${e.time?` — `+e.time:``}
              </span>
              ${v?`<span class="hist-therapist"><span class="material-symbols-rounded" style="font-size:1rem;">person</span>${v}</span>`:``}
            </div>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="hist-badge ${a}">${o}</span>
              <button class="btn-icon-sm" onclick="app.openSessionModal(null, ${i}, '${e.id}'); app.closeHistorial();" title="Editar Sesión" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 0.2rem; border-radius: 4px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deleteSession('${e.id}')" title="Eliminar Sesión" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; padding: 0.2rem; border-radius: 4px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1rem;">delete</span>
              </button>
            </div>
          </div>

          ${h||p?`
          <div class="hist-session-tags">
            ${h?`<span class="hist-tag hist-tag-cups"><span class="material-symbols-rounded">local_hospital</span>${h}</span>`:``}
            ${p?`<span class="hist-tag hist-tag-diag"><span class="material-symbols-rounded">diagnosis</span>${p}${m?` - `+m:``}</span>`:``}
            ${g?`<span class="hist-tag"><span class="material-symbols-rounded">payments</span>Copago: ${g}</span>`:``}
          </div>`:``}

          ${s?`<div class="hist-notes"><p><strong>Notas de evolución:</strong></p><p>${s}</p></div>`:``}

          ${f?`
          <details class="hist-soap">
            <summary>Ver nota SOAP completa</summary>
            ${c?`<div class="soap-section"><strong>S — Subjetivo</strong><p>${c}</p></div>`:``}
            ${l?`<div class="soap-section"><strong>O — Objetivo</strong><p>${l}</p></div>`:``}
            ${u?`<div class="soap-section"><strong>A — Análisis</strong><p>${u}</p></div>`:``}
            ${d?`<div class="soap-section"><strong>P — Plan</strong><p>${d}</p></div>`:``}
          </details>`:``}
        </div>`}).join(``)}viewPatientEvolution(e){this.navigate(`progress`),this.progressPatientSelect.value=e,this.handleProgressPatientChange()}renderPatientsList(){if(this.loadingPatients){this.patientsGridContainer.innerHTML=[,,,].fill(0).map(()=>`
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
      `).join(``);return}let e=this.patientSearchInput.value.toLowerCase(),t=this.patients.filter(t=>(t.name||``).toLowerCase().includes(e)||(t.diagnosis||``).toLowerCase().includes(e)||t.phone&&t.phone.includes(e));if(t.length===0){this.patientsGridContainer.innerHTML=`
        <div class="empty-state col-12" style="grid-column: span 3;">
          <span class="material-symbols-rounded">person_search</span>
          <p>No se encontraron pacientes que coincidan con tu búsqueda.</p>
        </div>`;return}this.patientsGridContainer.innerHTML=t.map(e=>{let t=(e.name||`?`).charAt(0).toUpperCase(),n=this.sessions.filter(t=>t.patientId===e.id&&t.isCompleted).length,r=this.sessions.filter(t=>t.patientId===e.id).length,i=this.autorizaciones.find(t=>String(t.pacienteId)===String(e.id)||String(t.patientId)===String(e.id)),a=i?i.totalSesiones||i.authorizedSessions||23:e.authorizedSessions||23,o=i?i.numeroAutorizacion:null,s=i?i.epsNombre:null,c=i?i.cupsNombre:null,l=r>a,u=a-r,d=l?`var(--danger)`:u<=3?`var(--accent-amber)`:`var(--text-secondary)`,f=``;l?f=`<span class="badge-status" style="background-color:var(--danger-light);color:var(--danger);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Excedido</span>`:u<=3&&u>0?f=`<span class="badge-status" style="background-color:var(--accent-amber-light);color:var(--accent-amber);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Últimas ${u} sesiones</span>`:u===0&&(f=`<span class="badge-status" style="background-color:var(--accent-amber-light);color:var(--accent-amber);font-size:0.75rem;padding:0.15rem 0.5rem;margin-left:0.5rem;border-radius:50px;font-weight:700;">Agotadas</span>`);let p=Math.min(100,Math.round(r/a*100)),m=l?`var(--danger)`:p>=85?`var(--accent-amber)`:`var(--accent-emerald)`;return`
        <div class="patient-card">
          <div class="patient-card-header" style="position: relative;">
            <div class="p-avatar">${t}</div>
            <div style="flex: 1; padding-right: 3.5rem;">
              <h3>${e.name||`Sin nombre`}</h3>
              <p class="subtitle" style="font-size:0.85rem;">${e.epsNombre||`Sin EPS registrada`}</p>
            </div>
            <div class="patient-actions-top" style="position: absolute; right: 0; top: 0; display: flex; gap: 0.25rem;">
              <button class="btn-icon-sm" onclick="app.openPatientModal('${e.id}')" title="Editar Paciente" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deletePatient('${e.id}')" title="Eliminar Paciente" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; justify-content: center; padding: 0.35rem; border-radius: 8px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.15rem;">delete</span>
              </button>
            </div>
          </div>
          
          <div class="patient-detail-body">
            <div class="detail-item">
              <span class="material-symbols-rounded">medical_information</span>
              <p style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                ${e.diagnosis||(e.diagnosticoCodigo?e.diagnosticoCodigo:`Sin diagnóstico`)}
              </p>
            </div>
            ${e.phone?`
            <div class="detail-item">
              <span class="material-symbols-rounded">call</span>
              <p>${e.phone}</p>
            </div>`:``}
            ${o?`
            <div class="detail-item">
              <span class="material-symbols-rounded">assignment_turned_in</span>
              <p>Auth: <strong>${o}</strong> &bull; ${s||``}</p>
            </div>`:``}
            ${c?`
            <div class="detail-item">
              <span class="material-symbols-rounded">local_hospital</span>
              <p style="display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${c}</p>
            </div>`:``}
            <div class="detail-item" style="color:${d};flex-direction:column;align-items:flex-start;gap:0.4rem;">
              <div style="display:flex;align-items:center;gap:0.5rem;width:100%;">
                <span class="material-symbols-rounded" style="color:${d};">event_available</span>
                <p><strong>${r}</strong> / ${a} sesiones ${f}</p>
              </div>
              <div style="width:100%;height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">
                <div style="width:${p}%;height:100%;background:${m};border-radius:3px;transition:width 0.5s;"></div>
              </div>
            </div>
            <div class="detail-item">
              <span class="material-symbols-rounded">check_circle</span>
              <p>${n} sesiones ya realizadas</p>
            </div>
          </div>
          
          <div class="patient-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="app.openHistorial('${e.id}')">
              <span class="material-symbols-rounded">history</span>
              <span>Historial</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="app.openSessionModal('${e.id}', true)">
              <span class="material-symbols-rounded">add</span>
              <span>Nueva Sesión</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.viewPatientEvolution('${e.id}')">
              <span class="material-symbols-rounded">monitoring</span>
              <span>Evolución</span>
            </button>
          </div>
        </div>`}).join(``)}populatePatientDropdowns(){let e=this.patients.map(e=>`<option value="${e.id}">${e.name}</option>`).join(``),t=document.getElementById(`s-patient`),n=t.value;t.innerHTML=`<option value="">Seleccione un paciente...</option>`+e,n&&(t.value=n);let r=document.getElementById(`progress-patient-select`),i=r.value;r.innerHTML=`<option value="">Selecciona un paciente...</option>`+e,i&&(r.value=i)}openPatientModal(e=null){this.formPatient.reset();let t=document.querySelector(`#modal-patient .modal-header h2`);if(e){this.editingPatientId=e,t&&(t.textContent=`Editar Paciente`);let n=this.patients.find(t=>t.id===e);n&&(document.getElementById(`p-name`).value=n.name||``,document.getElementById(`p-phone`).value=n.phone||``,document.getElementById(`p-email`).value=n.email||``,document.getElementById(`p-dob`).value=n.dob||``,document.getElementById(`p-gender`).value=n.gender||`M`,document.getElementById(`p-authorized`).value=n.authorizedSessions||23,document.getElementById(`p-diagnosis`).value=n.diagnosis||``)}else this.editingPatientId=null,t&&(t.textContent=`Registrar Nuevo Paciente`);this.modalPatient.classList.add(`active`)}closePatientModal(){this.modalPatient.classList.remove(`active`),this.editingPatientId=null}handlePatientSubmit(e){e.preventDefault();let t=document.getElementById(`p-name`).value,n={name:t,phone:document.getElementById(`p-phone`).value,email:document.getElementById(`p-email`).value,dob:document.getElementById(`p-dob`).value,gender:document.getElementById(`p-gender`).value,authorizedSessions:parseInt(document.getElementById(`p-authorized`).value)||23,diagnosis:document.getElementById(`p-diagnosis`).value,assignedTherapistId:this.currentUser?this.currentUser.uid:null,assignedTherapistName:this.currentUser?this.currentUser.displayName||this.currentUser.email:`Desconocido`,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};this.editingPatientId?p.collection(`therapy_patients`).doc(this.editingPatientId).update(n).then(()=>{this.closePatientModal(),this.showToast(`Paciente "${t}" actualizado correctamente.`,`success`)}).catch(e=>{console.error(`Error updating patient: `,e),this.showToast(`Error al actualizar paciente.`,`error`)}):(n.createdAt=firebase.firestore.FieldValue.serverTimestamp(),p.collection(`therapy_patients`).add(n).then(()=>{this.closePatientModal(),this.showToast(`Paciente "${t}" registrado correctamente.`,`success`)}).catch(e=>{console.error(`Error adding patient: `,e),this.showToast(`Error al guardar paciente.`,`error`)}))}deletePatient(e){let t=this.patients.find(t=>t.id===e);t&&confirm(`¿Estás seguro de que deseas eliminar al paciente "${t.name}"? Esta acción no se puede deshacer y conservará su historial de sesiones.`)&&p.collection(`therapy_patients`).doc(e).delete().then(()=>{this.showToast(`Paciente "${t.name}" eliminado correctamente.`,`success`)}).catch(e=>{console.error(`Error deleting patient: `,e),this.showToast(`Error al eliminar el paciente.`,`error`)})}openSessionModal(e=null,t=!0,n=null){this.formSession.reset(),this.tempSoapData=null;let r=new Date;if(document.getElementById(`s-date`).value=this.formatDateISO(r),document.getElementById(`s-time`).value=r.toTimeString().substring(0,5),document.getElementById(`s-pain`).value=5,document.getElementById(`pain-badge`).textContent=`5`,document.getElementById(`s-mobility`).value=50,document.getElementById(`mobility-badge`).textContent=`50%`,document.getElementById(`s-mood`).value=3,document.getElementById(`mood-badge`).textContent=`3`,n){this.editingSessionId=n,document.getElementById(`session-modal-title`).textContent=`Editar Sesión / Cita`;let e=this.sessions.find(e=>e.id===n);e&&(document.getElementById(`s-patient`).value=e.patientId||``,document.getElementById(`s-date`).value=e.date||``,document.getElementById(`s-time`).value=e.time||``,this.sIsCompleted.checked=e.isCompleted||!1,document.getElementById(`s-notes`).value=e.notes||``,this.tempSoapData={soapS:e.soapS||``,soapO:e.soapO||``,soapA:e.soapA||``,soapP:e.soapP||``},e.isCompleted&&(document.getElementById(`s-pain`).value=e.pain??5,document.getElementById(`pain-badge`).textContent=e.pain??5,document.getElementById(`s-mobility`).value=e.mobility??50,document.getElementById(`mobility-badge`).textContent=(e.mobility??50)+`%`,document.getElementById(`s-mood`).value=e.mood??3,document.getElementById(`mood-badge`).textContent=e.mood??3))}else this.editingSessionId=null,document.getElementById(`session-modal-title`).textContent=t?`Registrar Sesión Realizada`:`Programar Nueva Sesión`,e&&(document.getElementById(`s-patient`).value=e),this.sIsCompleted.checked=t;this.toggleSessionModalFields(),this.modalSession.classList.add(`active`)}closeSessionModal(){this.modalSession.classList.remove(`active`),this.editingSessionId=null,this.tempSoapData=null}handleSessionSubmit(e){e.preventDefault();let t=document.getElementById(`s-patient`).value,n=document.getElementById(`s-date`).value,r=document.getElementById(`s-time`).value,i=this.sIsCompleted.checked,a={patientId:t,date:n,time:r,isCompleted:i,therapistId:this.currentUser?this.currentUser.uid:null,therapistName:this.currentUser?this.currentUser.displayName||this.currentUser.email:`Desconocido`,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};i?(a.pain=parseInt(document.getElementById(`s-pain`).value),a.mobility=parseInt(document.getElementById(`s-mobility`).value),a.mood=parseInt(document.getElementById(`s-mood`).value),a.notes=document.getElementById(`s-notes`).value,this.tempSoapData&&(a.soapS=this.tempSoapData.soapS||``,a.soapO=this.tempSoapData.soapO||``,a.soapA=this.tempSoapData.soapA||``,a.soapP=this.tempSoapData.soapP||``)):a.notes=document.getElementById(`s-notes`).value,this.editingSessionId?p.collection(`therapy_sessions`).doc(this.editingSessionId).update(a).then(()=>{this.closeSessionModal(),this.showToast(`Sesión actualizada con éxito.`,`success`)}).catch(e=>{console.error(`Error updating session: `,e),this.showToast(`Error al actualizar sesión.`,`error`)}):(a.createdAt=firebase.firestore.FieldValue.serverTimestamp(),p.collection(`therapy_sessions`).add(a).then(()=>{this.closeSessionModal(),this.showToast(i?`Sesión guardada con éxito.`:`Sesión programada en la agenda.`,`success`)}).catch(e=>{console.error(`Error adding session: `,e),this.showToast(`Error al guardar sesión.`,`error`)}))}deleteSession(e){confirm(`¿Estás seguro de que deseas eliminar esta sesión/cita? Esta acción no se puede deshacer.`)&&p.collection(`therapy_sessions`).doc(e).delete().then(()=>{this.showToast(`Sesión eliminada correctamente.`,`success`)}).catch(e=>{console.error(`Error deleting session: `,e),this.showToast(`Error al eliminar la sesión.`,`error`)})}changeMonth(e){this.currentDate.setMonth(this.currentDate.getMonth()+e),this.renderDatePicker()}renderDatePicker(){let e=[`Enero`,`Febrero`,`Marzo`,`Abril`,`Mayo`,`Junio`,`Julio`,`Agosto`,`Septiembre`,`Octubre`,`Noviembre`,`Diciembre`],t=this.currentDate.getFullYear(),n=this.currentDate.getMonth();this.dpMonthTitle.textContent=`${e[n]} ${t}`,this.dpDaysGrid.innerHTML=``;let r=new Date(t,n,1).getDay(),i=new Date(t,n+1,0).getDate();for(let e=0;e<r;e++){let e=document.createElement(`span`);e.classList.add(`dp-day`,`dp-day-empty`),this.dpDaysGrid.appendChild(e)}let a=this.formatDateISO(new Date);for(let e=1;e<=i;e++){let r=document.createElement(`button`);r.classList.add(`dp-day`),r.textContent=e;let i=new Date(t,n,e),o=this.formatDateISO(i);o===a&&r.classList.add(`today`),o===this.selectedDateStr&&r.classList.add(`selected`),this.sessions.some(e=>e.date===o)&&r.classList.add(`has-events`),r.addEventListener(`click`,()=>{document.querySelectorAll(`.dp-day.selected`).forEach(e=>e.classList.remove(`selected`)),r.classList.add(`selected`),this.selectedDateStr=o,this.renderAgendaForSelectedDay()}),this.dpDaysGrid.appendChild(r)}}renderAgendaForSelectedDay(){let e=new Date(this.selectedDateStr+`T00:00:00`).toLocaleDateString(`es-ES`,{weekday:`long`,day:`numeric`,month:`long`,year:`numeric`});if(this.selectedDayTitle.textContent=e.charAt(0).toUpperCase()+e.slice(1),this.loadingSessions){this.selectedDayCount.textContent=`Cargando...`,this.agendaSessionsList.innerHTML=[,,].fill(0).map(()=>`
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
      `).join(``);return}let t=this.sessions.filter(e=>e.date===this.selectedDateStr);if(t.sort((e,t)=>e.time.localeCompare(t.time)),this.selectedDayCount.textContent=`${t.length} Cita${t.length===1?``:`s`}`,t.length===0){this.agendaSessionsList.innerHTML=`
        <div class="empty-state">
          <span class="material-symbols-rounded">calendar_today</span>
          <p>No hay citas registradas en este día.</p>
        </div>`;return}this.agendaSessionsList.innerHTML=t.map(e=>{let t=this.patients.find(t=>t.id===e.patientId)||{name:`Paciente Desconocido`,diagnosis:`No especificado`},n=e.isCompleted?`Completada`:`Pendiente`,r=e.isCompleted?`status-completed`:`status-pending`;return`
        <div class="agenda-item-card">
          <div class="agenda-card-time">
            ${e.time}
            <span>Hora</span>
          </div>
          <div class="agenda-card-detail">
            <h3>${t.name}</h3>
            <p><strong>Diagnóstico:</strong> ${t.diagnosis.substring(0,90)}...</p>
            ${e.isCompleted?`<p class="notes-preview"><strong>Evolución:</strong> ${e.notes||`Sin notas`}</p>`:``}
          </div>
          <div class="agenda-card-actions" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <span class="badge-status ${r}">${n}</span>
              <button class="btn-icon-sm" onclick="app.openSessionModal(null, ${e.isCompleted}, '${e.id}')" title="Editar Sesión" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; padding: 0.25rem; border-radius: 6px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.1rem;">edit</span>
              </button>
              <button class="btn-icon-sm" onclick="app.deleteSession('${e.id}')" title="Eliminar Sesión" style="background: none; border: none; cursor: pointer; color: var(--danger); display: flex; align-items: center; padding: 0.25rem; border-radius: 6px; transition: background 0.2s;">
                <span class="material-symbols-rounded" style="font-size: 1.1rem;">delete</span>
              </button>
            </div>
            ${e.isCompleted?``:`
            <button class="btn btn-secondary btn-sm" onclick="app.completeSessionDirectly('${e.id}')" title="Marcar como realizada">
              <span class="material-symbols-rounded">check</span>
            </button>`}
          </div>
        </div>`}).join(``)}completeSessionDirectly(e){let t=this.sessions.findIndex(t=>t.id===e);if(t!==-1){let e=this.sessions[t];this.openSessionModal(e.patientId,!0),this.sessions.splice(t,1),this.saveToStorage()}}handleProgressPatientChange(){let e=this.progressPatientSelect.value;if(!e){this.evolutionContent.style.display=`none`,this.evolutionEmptyPrompt.style.display=`flex`;return}this.evolutionContent.style.display=`block`,this.evolutionEmptyPrompt.style.display=`none`;let t=this.sessions.filter(t=>t.patientId===e&&t.isCompleted);if(t.sort((e,t)=>e.date.localeCompare(t.date)),t.length===0){this.valDolor.textContent=`--`,this.valMovilidad.textContent=`--`,this.valAnimo.textContent=`--`,this.valSesiones.textContent=`0`,this.notesEvolutionTimeline.innerHTML=`<div class="empty-state"><p>Este paciente no tiene sesiones completadas registradas.</p></div>`;let e=document.getElementById(`evolution-chart`);e.getContext(`2d`).clearRect(0,0,e.width,e.height);return}let n=t[t.length-1];this.valDolor.textContent=n.pain,this.valDolor.className=`metric-num `+(n.pain>6?`text-danger`:n.pain>3?`text-warning`:`text-success`),this.valMovilidad.textContent=n.mobility,this.valAnimo.textContent=n.mood,this.valSesiones.textContent=t.length,this.notesEvolutionTimeline.innerHTML=[...t].reverse().map((e,n)=>{let r=new Date(e.date+`T00:00:00`).toLocaleDateString(`es-ES`,{day:`numeric`,month:`short`,year:`numeric`});return`
        <div class="note-item">
          <div class="note-header">
            <span>Sesión #${t.length-n} - ${r} (${e.time})</span>
            <span>Ánimo: ${e.mood}/5</span>
          </div>
          <div class="note-body">
            ${e.notes||`Sin anotaciones clínicas.`}
          </div>
          <div class="note-metrics">
            <span style="color: var(--danger)">Dolor: ${e.pain}/10</span>
            <span style="color: var(--accent-emerald)">Movilidad: ${e.mobility}%</span>
          </div>
        </div>`}).join(``),this.renderEvolutionChart(t)}async renderEvolutionChart(e=null){let t=document.getElementById(`evolution-chart`),{default:n}=await f(async()=>{let{default:e}=await import(`./evolutionChart-CzYFqFlv.js`);return{default:e}},[]);n(t,this.progressPatientSelect.value,this.sessions,e)}formatDateISO(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}openRipsModal(){let e=document.getElementById(`modal-rips`);if(!e)return;let t=new Date,n=new Date(t.getFullYear(),t.getMonth(),1);document.getElementById(`rips-fecha-inicio`).value=this.formatDateISO(n),document.getElementById(`rips-fecha-fin`).value=this.formatDateISO(t),document.getElementById(`rips-nit`).value=`900123456-1`,document.getElementById(`rips-prestador`).value=`Kallpa Terapias SAS`,e.style.display=`flex`,setTimeout(()=>e.classList.add(`active`),10)}closeRipsModal(){let e=document.getElementById(`modal-rips`);e&&(e.classList.remove(`active`),setTimeout(()=>{e.style.display=`none`},300))}generateRipsPreview(){let e=document.getElementById(`rips-nit`).value.trim(),t=document.getElementById(`rips-prestador`).value.trim(),n=document.getElementById(`rips-fecha-inicio`).value,r=document.getElementById(`rips-fecha-fin`).value;if(!e||!t||!n||!r){this.showToast(`Por favor complete todos los campos de configuración de RIPS.`,`warning`);return}let i=new Date(n+`T00:00:00`),a=new Date(r+`T23:59:59`),o=this.sessions.filter(e=>{if(!e.isCompleted&&e.estado!==`Atendida`)return!1;let t=new Date((e.date||`2000-01-01`)+`T00:00:00`);return t>=i&&t<=a}),s=[...new Set(o.map(e=>e.patientId||e.pacienteId))],c=this.patients.filter(e=>s.includes(e.id)),l=o.reduce((e,t)=>e+Number(t.valor||0),0),u=document.getElementById(`rips-preview`);u&&(u.innerHTML=`
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
                <td style="padding: 0.5rem 0; text-align: right; font-weight: 700;">${c.length}</td>
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.5rem 0; font-weight: 600;">AP.txt</td>
                <td style="padding: 0.5rem 0; color: var(--text-secondary);">Archivo de Procedimientos (Terapias)</td>
                <td style="padding: 0.5rem 0; text-align: right; font-weight: 700;">${o.length}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); display: flex; justify-content: space-between; font-weight: 700;">
            <span>Valor Total Facturado:</span>
            <span style="color: var(--accent-emerald);">$${l.toLocaleString(`es-CO`)}</span>
          </div>
        </div>`),[`btn-dl-ct`,`btn-dl-af`,`btn-dl-ap`,`btn-dl-all`].forEach(e=>{let t=document.getElementById(e);t&&t.removeAttribute(`disabled`)}),this.showToast(`Previsualización de RIPS generada.`,`success`)}downloadRipsFile(e){let t=document.getElementById(`rips-nit`).value.trim(),n=document.getElementById(`rips-fecha-inicio`).value,r=document.getElementById(`rips-fecha-fin`).value,i=new Date(n+`T00:00:00`),l=new Date(r+`T23:59:59`),u=this.sessions.filter(e=>{if(!e.isCompleted&&e.estado!==`Atendida`)return!1;let t=new Date((e.date||`2000-01-01`)+`T00:00:00`);return t>=i&&t<=l}),d=[...new Set(u.map(e=>e.patientId||e.pacienteId))],f=this.patients.filter(e=>d.includes(e.id)),p=u.reduce((e,t)=>e+Number(t.valor||0),0);e===`AF`?c(a(f,this.autorizaciones,t,n,r),`AF${n.replace(/-/g,``)}.txt`):e===`AP`?c(o(u,f,this.autorizaciones,t,n,r),`AP${n.replace(/-/g,``)}.txt`):e===`CT`&&c(s(t,n,r,f.length,u.length,p),`CT${n.replace(/-/g,``)}.txt`),this.showToast(`Archivo ${e}.txt descargado.`,`success`)}downloadRipsAll(){this.downloadRipsFile(`CT`),setTimeout(()=>this.downloadRipsFile(`AF`),300),setTimeout(()=>this.downloadRipsFile(`AP`),600)}openGeminiModal(){let e=localStorage.getItem(`gemini_api_key`)||``;this.geminiApiKeyInput.value=e,this.modalGeminiConfig.classList.add(`active`)}closeGeminiModal(){this.modalGeminiConfig.classList.remove(`active`)}handleGeminiConfigSubmit(e){e.preventDefault();let t=this.geminiApiKeyInput.value.trim();t&&(localStorage.setItem(`gemini_api_key`,t),this.showToast(`API Key de Gemini guardada correctamente.`,`success`),this.closeGeminiModal())}async optimizeNotesWithAI(){let e=localStorage.getItem(`gemini_api_key`);if(!e){this.showToast(`Por favor, configura tu API Key de Gemini.`,`warning`),this.openGeminiModal();return}let t=document.getElementById(`s-patient`).value;if(!t){this.showToast(`Por favor, selecciona un paciente primero.`,`warning`);return}let n=document.getElementById(`s-notes`),r=n.value.trim();if(!r){this.showToast(`Escribe notas rápidas o palabras clave primero.`,`warning`);return}let i=this.patients.find(e=>e.id===t),a=i?i.diagnosis:`No especificado`,o=document.getElementById(`s-pain`).value,s=document.getElementById(`s-mobility`).value,c=document.getElementById(`s-mood`).value,l=this.btnOptimizeNotes,u=l.innerHTML;l.classList.add(`loading`),l.disabled=!0;let d=l.querySelector(`span`),f=l.querySelector(`span`).nextElementSibling;d&&(d.textContent=`sync`),f&&(f.textContent=`Procesando...`);try{let t=`Eres un asistente experto en redacción clínica para fisioterapia y terapia ocupacional.
Tu tarea es convertir las notas rápidas de una sesión clínica en una nota formal estructurada en el formato estándar SOAP (Subjetivo, Objetivo, Análisis, Plan).

Contexto del Paciente:
- Diagnóstico: ${a}
- Dolor en esta sesión: ${o}/10
- Rango de movilidad: ${s}%
- Estado de ánimo del paciente: ${c}/5

Notas rápidas del terapeuta:
"${r}"

Debes devolver obligatoriamente un objeto JSON con las siguientes claves:
- "soapS": Notas subjetivas (lo que refiere el paciente, sensaciones, dolor autoinformado).
- "soapO": Mediciones objetivas, rango de movilidad, ejercicios realizados en la sesión, sets, repeticiones y observaciones cuantitativas.
- "soapA": Análisis clínico comparativo y evolución respecto a sesiones anteriores.
- "soapP": Plan detallado y enfoque terapéutico para las siguientes sesiones.
- "notes": Texto consolidado y formateado de la nota SOAP completa para visualización rápida.

Por favor, redacta de forma muy profesional y técnica en español.`,i=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${e}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:t}]}],generationConfig:{responseMimeType:`application/json`}})});if(!i.ok)throw Error(`Error de API: ${i.status} ${i.statusText}`);let l=await i.json();if(l.candidates&&l.candidates[0]&&l.candidates[0].content&&l.candidates[0].content.parts[0]){let e=l.candidates[0].content.parts[0].text.trim(),t=JSON.parse(e);this.tempSoapData={soapS:t.soapS||``,soapO:t.soapO||``,soapA:t.soapA||``,soapP:t.soapP||``},n.value=t.notes||`${t.soapS}\n\n${t.soapO}\n\n${t.soapA}\n\n${t.soapP}`,this.showToast(`Notas clínicas optimizadas con IA.`,`success`)}else throw Error(`La respuesta de la IA no tiene el formato esperado.`)}catch(e){console.error(e),this.showToast(`Error al optimizar con IA: `+e.message,`error`)}finally{l.classList.remove(`loading`),l.disabled=!1,l.innerHTML=u}}showToast(e,t=`info`){let n=document.getElementById(`toast-container`);if(!n)return;let r=document.createElement(`div`);r.className=`toast toast-${t}`;let i=`info`;t===`success`?i=`check_circle`:t===`warning`?i=`warning`:t===`error`&&(i=`error`),r.innerHTML=`
      <span class="material-symbols-rounded toast-icon">${i}</span>
      <span class="toast-message">${e}</span>
    `,n.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,r.style.transform=`translateY(10px) scale(0.9)`,setTimeout(()=>r.remove(),300)},3700)}exportData(){let e=JSON.stringify({patients:this.patients,sessions:this.sessions},null,2),t=new Blob([e],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`respaldo_terapias_${new Date().toISOString().split(`T`)[0]}.json`,r.click(),URL.revokeObjectURL(n),this.showToast(`Copia de seguridad exportada con éxito.`,`info`)}handleImport(e){let t=e.target.files[0];if(!t)return;let n=new FileReader;n.onload=e=>{try{let t=JSON.parse(e.target.result);if(!t.patients||!t.sessions)throw Error(`El archivo no contiene la estructura requerida.`);this.patients=t.patients,this.sessions=t.sessions,this.saveToStorage(),this.navigate(this.currentView||`dashboard`),this.updateStats(),this.renderPatientsList(),this.renderDatePicker(),this.renderAgendaForSelectedDay(),this.populatePatientDropdowns(),this.showToast(`Importación exitosa. Datos restaurados.`,`success`)}catch(e){console.error(`Error al importar:`,e),this.showToast(`El archivo no es un respaldo válido.`,`error`)}},n.readAsText(t),e.target.value=``}renderAutorizaciones(){let e=document.getElementById(`autorizaciones-grid`);if(!e)return;if(this.autorizaciones.length===0){e.innerHTML=`
        <div class="auth-empty-state">
          <span class="material-symbols-rounded">assignment_late</span>
          <p>No hay autorizaciones registradas.</p>
        </div>`;return}let t=this.autorizaciones.length,n=this.autorizaciones.reduce((e,t)=>e+(t.totalSesiones||0),0),r=this.autorizaciones.reduce((e,t)=>e+this.sessions.filter(e=>String(e.patientId)===String(t.pacienteId||t.patientId)&&String(e.autorizacionId)===String(t.id)).length,0),i=n-r,a=document.getElementById(`auth-summary`);a&&(a.innerHTML=`
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">assignment</span>
          <div><strong>${t}</strong><small>Autorizaciones</small></div>
        </div>
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">event_note</span>
          <div><strong>${n}</strong><small>Sesiones totales</small></div>
        </div>
        <div class="auth-stat-card">
          <span class="material-symbols-rounded">check_circle</span>
          <div><strong>${r}</strong><small>Realizadas</small></div>
        </div>
        <div class="auth-stat-card ${i<=0?`auth-stat-danger`:i<=3?`auth-stat-warn`:``}">
          <span class="material-symbols-rounded">hourglass_bottom</span>
          <div><strong>${i}</strong><small>Restantes</small></div>
        </div>`),e.innerHTML=this.autorizaciones.map(e=>{let t=e.pacienteId||e.patientId,n=this.patients.find(e=>String(e.id)===String(t)),r=e.pacienteNombre||(n?n.name:`Paciente desconocido`),i=r.charAt(0).toUpperCase(),a=this.sessions.filter(n=>String(n.patientId)===String(t)&&String(n.autorizacionId)===String(e.id)).length,o=a>0?a:this.sessions.filter(e=>String(e.patientId)===String(t)&&e.isCompleted).length,s=e.totalSesiones||10,c=Math.max(0,s-o),l=Math.min(100,Math.round(o/s*100)),u=o>s,d=!u&&l>=80,f=u?`var(--danger)`:d?`var(--accent-amber)`:`var(--accent-emerald)`,p;return p=u?`<span class="auth-badge auth-badge-danger">Excedida</span>`:l>=100?`<span class="auth-badge auth-badge-done">Completada</span>`:d?`<span class="auth-badge auth-badge-warn">Por agotar</span>`:`<span class="auth-badge auth-badge-active">Activa</span>`,`
        <div class="auth-card">
          <div class="auth-card-header">
            <div class="p-avatar">${i}</div>
            <div class="auth-card-info">
              <h3>${r}</h3>
              <p>${e.epsNombre||`Sin EPS`}</p>
            </div>
            ${p}
          </div>

          <div class="auth-card-body">
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">tag</span>
              <div>
                <small>N° Autorización</small>
                <strong>${e.numeroAutorizacion||e.id}</strong>
              </div>
            </div>
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">local_hospital</span>
              <div>
                <small>Código CUPS</small>
                <strong>${e.cupsCodigo||`—`}</strong>
              </div>
            </div>
            <div class="auth-detail-row">
              <span class="material-symbols-rounded">description</span>
              <div>
                <small>Procedimiento</small>
                <span style="font-size:0.82rem;">${e.cupsNombre||`—`}</span>
              </div>
            </div>
          </div>

          <div class="auth-progress-section">
            <div class="auth-progress-labels">
              <span>${o} de ${s} sesiones realizadas</span>
              <span style="color:${f};font-weight:700;">${c} restantes</span>
            </div>
            <div class="auth-progress-bar">
              <div class="auth-progress-fill" style="width:${l}%;background:${f};"></div>
            </div>
          </div>

          <div class="auth-card-footer">
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('patients')">
              <span class="material-symbols-rounded">person</span>
              <span>Ver Paciente</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="app.openSessionModal('${t}', true)">
              <span class="material-symbols-rounded">add</span>
              <span>Nueva Sesión</span>
            </button>
          </div>
        </div>`}).join(``)}handleLogout(){confirm(`¿Deseas cerrar sesión?`)&&m.signOut().then(()=>{}).catch(e=>{this.showToast(`Error al cerrar sesión: `+e.message,`error`)})}};function _(){let e=document.getElementById(`form-login`),t=document.getElementById(`login-email`),n=document.getElementById(`login-password`),r=document.getElementById(`login-error`),i=document.getElementById(`btn-login-text`),a=document.getElementById(`btn-login-submit`),o=document.getElementById(`btn-forgot-password`),s=document.getElementById(`forgot-success`),c=document.getElementById(`btn-toggle-password`),l=document.getElementById(`eye-icon`);c&&c.addEventListener(`click`,()=>{let e=n.type===`password`;n.type=e?`text`:`password`,l.textContent=e?`visibility_off`:`visibility`}),e&&e.addEventListener(`submit`,e=>{e.preventDefault();let o=t.value.trim(),s=n.value;r.style.display=`none`,a.disabled=!0,i.textContent=`Verificando...`,m.signInWithEmailAndPassword(o,s).catch(e=>{a.disabled=!1,i.textContent=`Iniciar Sesión`;let t=`Error al iniciar sesión. Inténtalo de nuevo.`;e.code===`auth/user-not-found`||e.code===`auth/wrong-password`||e.code===`auth/invalid-credential`?t=`Correo o contraseña incorrectos.`:e.code===`auth/too-many-requests`?t=`Demasiados intentos. Espera unos minutos.`:e.code===`auth/invalid-email`&&(t=`El correo electrónico no es válido.`),r.textContent=t,r.style.display=`flex`,n.value=``,n.focus()})}),o&&o.addEventListener(`click`,()=>{let e=t.value.trim();if(!e){r.textContent=`Ingresa tu correo electrónico primero.`,r.style.display=`flex`,t.focus();return}m.sendPasswordResetEmail(e).then(()=>{r.style.display=`none`,s.style.display=`flex`,setTimeout(()=>s.style.display=`none`,5e3)}).catch(e=>{let t=`No se pudo enviar el correo de recuperación.`;e.code===`auth/user-not-found`&&(t=`No existe una cuenta con ese correo.`),r.textContent=t,r.style.display=`flex`})})}var v;window.addEventListener(`DOMContentLoaded`,()=>{_();let e=document.getElementById(`login-screen`),t=document.getElementById(`app-container`);m.onAuthStateChanged(n=>{n?(e.classList.add(`login-exit`),setTimeout(()=>{e.style.display=`none`,t.style.display=`grid`,v?(v.currentUser=n,v.updateProfileUI()):(v=new g(n),window.app=v)},400)):(t.style.display=`none`,e.style.display=`flex`,e.classList.remove(`login-exit`),v=null)})});