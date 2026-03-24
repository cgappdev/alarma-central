@echo off
setlocal enabledelayedexpansion

:: 1. Definir Carpeta de Destino (donde se guardará el respaldo)
set "DEST=%USERPROFILE%\Downloads\Respaldo_Alarmas"
set "SRC=%~dp0"

echo ========================================================
echo       SISTEMA DE RESPALDO PROFESIONAL - ALARMALG
echo ========================================================

:: 2. Detectar Carpeta de Descargas de forma Robusta
set "DOWNLOADS="
for /f "tokens=2*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" /v "{374DE290-123F-4565-9164-39C4925E467B}" 2^>nul') do set "DOWNLOADS_RAW=%%b"

if defined DOWNLOADS_RAW (
    call set "DOWNLOADS=%%DOWNLOADS_RAW%%"
    :: Reemplazo manual por si acaso
    set "DOWNLOADS=!DOWNLOADS:%%USERPROFILE%%=%USERPROFILE%!"
    set "DOWNLOADS=!DOWNLOADS:%%OneDrive%%=%OneDrive%!"
) else (
    :: Fallback a la ruta estándar
    set "DOWNLOADS=%USERPROFILE%\Downloads"
)

echo [DIAG] Origen:     "%SRC%"
echo [DIAG] Destino:    "%DEST%"
echo [DIAG] Descargas:  "%DOWNLOADS%"
echo.

:: 3. Crear carpeta destino si no existe
if not exist "%DEST%" mkdir "%DEST%"

:: 4. Copiar archivos del sistema de la aplicación
echo [1/2] Copiando archivos del sistema...
robocopy "%SRC%." "%DEST%" /E /XD .git .gemini /XF backup.bat /R:1 /W:1 /NFL /NDL /NJH /NJS

:: 5. Mover datos (.json y .pdf) desde Descargas
echo [2/2] Buscando nuevos datos y reportes en Descargas...

set "FOUND=0"

:: Mover JSONs y PDFs
echo [+] Procesando archivos de respaldo...

robocopy "%DOWNLOADS%" "%DEST%" respaldo_alarmas_*.json /MOV /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
if %ERRORLEVEL% LEQ 7 if %ERRORLEVEL% GEQ 1 (
    set FOUND=1
    echo [+] Datos JSON movidos.
)

robocopy "%DOWNLOADS%" "%DEST%" reporte_*.pdf /MOV /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
if %ERRORLEVEL% LEQ 7 if %ERRORLEVEL% GEQ 1 (
    set FOUND=1
    echo [+] Reportes PDF movidos.
)

if "%FOUND%"=="0" (
    echo [!] No hay archivos nuevos en "%DOWNLOADS%".
    echo.
    echo --- DIAGNOSTICO ---
    dir "%DOWNLOADS%\*.json" /b 2>nul || echo (No hay JSONs)
    dir "%DOWNLOADS%\*.pdf" /b 2>nul || echo (No hay PDFs)
)

echo.
echo ========================================================
echo    Proceso terminado satisfactoriamente.
echo ========================================================
pause




