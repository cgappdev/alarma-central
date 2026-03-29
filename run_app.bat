@echo off
setlocal
echo ========================================
echo   Iniciando Alarma Central - Premium
echo ========================================
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

echo [1/3] Iniciando servidor local en el puerto 5000...
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" /min npx serve . -p 5000
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start "" /min python -m http.server 5000
    ) else (
        echo ERROR: No se encontró Node.js ni Python.
        exit /b 1
    )
)

echo [2/3] Esperando servidor...
timeout /t 2 /nobreak >nul

echo [3/3] Abriendo navegador...
start http://localhost:5000
exit
