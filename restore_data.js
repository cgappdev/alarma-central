const fs = require('fs');

const backupPath = 'c:/Users/Soportelg/.gemini/antigravity/scratch/alarma-central/data_backup.json';
const dataPath = 'c:/Users/Soportelg/.gemini/antigravity/scratch/alarma-central/data.json';
const initialDataPath = 'c:/Users/Soportelg/.gemini/antigravity/scratch/alarma-central/initial-data.js';

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Mapa de nombres a pisos (basado en lo que definimos hoy)
const pisoMap = {
    "Hemodinamia": "1",
    "Pediatria": "1",
    "Salud Mental": "1",
    "Urgencias Piso 1": "1",
    "HPosQuirurgicos": "1",
    "HPosQuirurgicosOrtopedia": "1",
    "Uci A-B-C Piso 2": "2",
    "GinecoObstetriciaEspecialidades": "2",
    "Uci D Piso 3": "3"
};

// 1. Reconstruir centrales con IDs antiguos y campo piso
const restoredCentrales = backup.centrales.map(c => ({
    ...c,
    piso: pisoMap[c.name] || "-"
}));

// 2. Actualizar data.json
const newData = {
    ...currentData,
    centrales: restoredCentrales,
    devices: backup.devices || [],
    users: backup.users || currentData.users,
    currentCentralId: backup.currentCentralId || restoredCentrales[0].id
};

fs.writeFileSync(dataPath, JSON.stringify(newData, null, 2), 'utf8');
console.log('data.json restaurado.');

// 3. Actualizar initial-data.js
let initialDataContent = fs.readFileSync(initialDataPath, 'utf8');
const initialDataRegex = /const initialData = (\{[\s\S]*?\}); window\.initialData = initialData;/;
const newInitialDataString = JSON.stringify(newData, null, 2);
initialDataContent = initialDataContent.replace(initialDataRegex, `const initialData = ${newInitialDataString}; window.initialData = initialData;`);

fs.writeFileSync(initialDataPath, initialDataContent, 'utf8');
console.log('initial-data.js restaurado.');
