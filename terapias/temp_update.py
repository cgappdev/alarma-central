with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:909] + [
    "  async renderEvolutionChart(pSessions = null) {\n",
    "    const canvas = document.getElementById('evolution-chart');\n",
    "    const { default: drawChart } = await import('./evolutionChart.js');\n",
    "    drawChart(canvas, this.progressPatientSelect.value, this.sessions, pSessions);\n",
    "  }\n"
] + lines[1092:]

with open('app.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
