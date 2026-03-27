@echo off
setlocal
echo ========================================
echo   Iniciando Alarma Central - Premium
echo ========================================
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

echo [1/3] Iniciando servidor local en el puerto 5000...
:: Usamos npx serve si está disponible, o python como respaldo
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start /b npx serve . -p 5000
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        start /b python -m http.server 5000
    ) else (
        echo ERROR: No se encontró Node.js ni Python para iniciar el servidor.
        pause
        exit /b 1
    )
)

echo [2/3] Esperando a que el servidor esté listo...
timeout /t 3 /nobreak >nul

echo [3/3] Abriendo la aplicación en tu navegador predeterminado...
start http://localhost:5000

echo.
echo ========================================
echo   ¡Listo! La App ya debería estar abierta.
echo   Por favor, NO cierres esta ventana negra
echo   mientras uses la App. Puedes minimizarla.
echo ========================================
echo.
pause
