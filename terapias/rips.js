/**
 * Generador de RIPS — Resolución 3374 de 2000
 * Archivos: CT.txt (Control), AF.txt (Usuarios), AP.txt (Procedimientos)
 */

// ─── Helpers ─────────────────────────────────────────────────

function pad(val, len, char = ' ', right = false) {
  const s = String(val ?? '');
  return right ? s.padEnd(len, char).slice(0, len) : s.padStart(len, char).slice(0, len);
}

function fmtDate(isoDate) {
  // YYYY-MM-DD → DD/MM/YYYY
  if (!isoDate) return '01/01/1900';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function fmtTime(timeStr) {
  // HH:MM o HH:MM:SS → HH:MM
  if (!timeStr) return '08:00';
  return timeStr.slice(0, 5);
}

function cleanText(val, len) {
  return String(val ?? '').replace(/[|,\n\r]/g, ' ').slice(0, len).padEnd(len);
}

// Mapeo tipo documento Colombia
const TIPO_DOC_MAP = {
  'CC':  '01', 'TI': '02', 'CE': '03', 'PA': '04',
  'RC':  '05', 'AS': '06', 'MS': '07', 'NV': '08',
  'CD':  '09', 'SC': '10', 'PE': '11',
};

function mapTipoDoc(tipo) {
  return TIPO_DOC_MAP[String(tipo || 'CC').toUpperCase()] || '01';
}

// ─── Generador de AF.txt ─────────────────────────────────────
// Campos (separados por |):
// 1-NumFactura | 2-CodPrestador | 3-TipoDoc | 4-NumDoc | 5-FechaNac |
// 6-Sexo | 7-CodMpio | 8-ZonaRes | 9-NatJur | 10-TipoUsuario |
// 11-NomEPS | 12-CodEPS

export function generarAF(pacientes, autorizaciones, nit, fechaInicio, fechaFin) {
  const lines = [];

  pacientes.forEach((p, idx) => {
    // Buscar autorización del paciente para obtener número de factura
    const auth = autorizaciones.find(a =>
      String(a.pacienteId || a.patientId) === String(p.id)
    );
    const numFactura = auth ? String(auth.numeroAutorizacion) : String(1000 + idx);
    const tipoDoc   = mapTipoDoc(p.tipoDocumento);
    const numDoc    = String(p.numeroDocumento || p.id).replace(/[^0-9A-Za-z]/g, '');
    const fechaNac  = fmtDate(p.fechaNacimiento || p.dob);
    const sexo      = String(p.genero || 'M').toUpperCase().charAt(0);
    const codMpio   = String(p.municipio || '05001').replace(/[^0-9]/g, '').padEnd(5, '0').slice(0, 5);
    const zona      = String(p.zona || 'U').toUpperCase().charAt(0);
    const natJur    = '1'; // 1=persona natural, 2=persona jurídica
    const tipoUsr   = '03'; // 01=contributivo, 02=subsidiado, 03=particular
    const nomEPS    = cleanText(p.epsNombre || auth?.epsNombre || 'PARTICULAR', 30);
    const codEPS    = cleanText(p.epsCodigo || auth?.epsCodigo || 'EPS999', 12);

    lines.push(
      [numFactura, nit, tipoDoc, numDoc, fechaNac, sexo, codMpio, zona, natJur, tipoUsr, nomEPS.trim(), codEPS.trim()]
        .join('|')
    );
  });

  return lines.join('\r\n');
}

// ─── Generador de AP.txt ─────────────────────────────────────
// Campos:
// 1-NumFactura | 2-CodPrestador | 3-FechaProcedimiento | 4-Hora |
// 5-TipoDoc | 6-NumDoc | 7-NumAutorizacion | 8-CodProcedimiento |
// 9-AmbitoProcedimiento | 10-FinalidadProcedimiento | 11-PersonalAtiende |
// 12-DiagPrincipal | 13-DiagRelacionado | 14-DiagComplicacion |
// 15-TipoDiagnostico | 16-ValorProcedimiento | 17-ValorCopago

export function generarAP(sessions, pacientes, autorizaciones, nit, fechaInicio, fechaFin) {
  const lines = [];

  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin    = new Date(fechaFin    + 'T23:59:59');

  sessions
    .filter(s => {
      if (!s.isCompleted && s.estado !== 'Atendida') return false;
      const d = new Date((s.date || '2000-01-01') + 'T00:00:00');
      return d >= inicio && d <= fin;
    })
    .forEach(s => {
      const paciente  = pacientes.find(p => String(p.id) === String(s.patientId || s.pacienteId));
      if (!paciente) return;

      const auth = autorizaciones.find(a =>
        String(a.pacienteId || a.patientId) === String(paciente.id)
      );

      const numFactura   = auth ? String(auth.numeroAutorizacion) : String(1000 + parseInt(s.id || 0));
      const tipoDoc      = mapTipoDoc(paciente.tipoDocumento);
      const numDoc       = String(paciente.numeroDocumento || paciente.id).replace(/[^0-9A-Za-z]/g, '');
      const numAuth      = String(auth?.numeroAutorizacion || s.autorizacion || '000000');
      const cupsCodigo   = String(s.cupsCodigo || auth?.cupsCodigo || '930101');
      const ambito       = '1'; // 1=ambulatorio
      const finalidad    = '02'; // 02=terapéutico
      const personal     = '2'; // 2=no médico (terapeuta)
      const diagPrinc    = String(s.diagnosticoCodigo || 'Z009').toUpperCase().slice(0, 6);
      const diagRel      = '000'; // sin diagnóstico relacionado
      const diagComp     = '000'; // sin complicación
      const tipoDiag     = '03'; // 03=confirmado repetido
      const valor        = String(parseInt(s.valor || 0));
      const copago       = String(parseInt(s.copago || 0));
      const fecha        = fmtDate(s.date);
      const hora         = fmtTime(s.time);

      lines.push(
        [numFactura, nit, fecha, hora, tipoDoc, numDoc, numAuth, cupsCodigo,
         ambito, finalidad, personal, diagPrinc, diagRel, diagComp, tipoDiag, valor, copago]
          .join('|')
      );
    });

  return lines.join('\r\n');
}

// ─── Generador de CT.txt ─────────────────────────────────────
// 1-CodPrestador | 2-FechaInicio | 3-FechaFin |
// 4-NumRegAF | 5-ValorTotal | 6-NumRegAC | 7-NumRegAP |
// 8-NumRegAT | 9-NumRegAM | 10-NumRegAN | 11-NumRegAH

export function generarCT(nit, fechaInicio, fechaFin, numAF, numAP, valorTotal) {
  const line = [
    nit,
    fmtDate(fechaInicio),
    fmtDate(fechaFin),
    String(numAF),
    String(valorTotal),
    '0',        // AC consultas
    String(numAP),
    '0',        // AT urgencias
    '0',        // AM medicamentos
    '0',        // AN recién nacidos
    '0',        // AH hospitalizaciones
  ].join('|');
  return line;
}

// ─── Descarga de archivo ─────────────────────────────────────
export function descargarTxt(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
