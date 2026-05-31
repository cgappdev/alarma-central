const fs = require('fs');

const idsToRemove = [
    "1774831229527",
    "1774220918042",
    "1774220962018",
    "1774224339961"
];

// Clean data.json
try {
    const dataJsonPath = 'data.json';
    const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    data.centrales = data.centrales.filter(c => !idsToRemove.includes(c.id));
    fs.writeFileSync(dataJsonPath, JSON.stringify(data, null, 2));
    console.log('Cleaned data.json');
} catch (e) {
    console.error('Error cleaning data.json', e);
}

// Clean initial-data.js
try {
    const initialDataPath = 'initial-data.js';
    let content = fs.readFileSync(initialDataPath, 'utf8');
    
    // Evaluate the object (unsafe but works for this specific file)
    const jsonStr = content.replace('const initialData = ', '').replace(/;$/, '');
    const data = JSON.parse(jsonStr);
    
    data.centrales = data.centrales.filter(c => !idsToRemove.includes(c.id));
    
    const newContent = `const initialData = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(initialDataPath, newContent);
    console.log('Cleaned initial-data.js');
} catch (e) {
    console.error('Error cleaning initial-data.js', e);
}
