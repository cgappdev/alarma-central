@echo off
echo ===================================================
echo   Subiendo cambios de Alarma Central a la nube...
echo ===================================================
cd /d "c:\Users\Soportelg\.gemini\antigravity\scratch\alarma-central"

echo.
echo [1/3] Preparando archivos...
git add .

echo.
echo [2/3] Creando version...
git commit -m "Actualizacion de cambios %date% %time%"

echo.
echo [3/3] Subiendo a la nube (GitHub)...
git push origin master

echo.
echo ===================================================
echo   Proceso finalizado. Puedes cerrar esta ventana.
echo ===================================================
pause
