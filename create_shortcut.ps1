$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\Soportelg\Desktop\Subir a la Nube.lnk")
$Shortcut.TargetPath = "c:\Users\Soportelg\.gemini\antigravity\scratch\alarma-central\subir_nube.bat"
$Shortcut.WorkingDirectory = "c:\Users\Soportelg\.gemini\antigravity\scratch\alarma-central"
$Shortcut.IconLocation = "shell32.dll, 45"
$Shortcut.Save()
