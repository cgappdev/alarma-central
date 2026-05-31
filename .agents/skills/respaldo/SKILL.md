---
name: respaldo
description: Realiza el respaldo local y subida a la nube de la aplicación Alarma Central.
---
Este skill se utiliza para realizar copias de seguridad de la aplicación. Cuando el usuario solicite realizar un respaldo:

1. Ejecuta el script local `backup.bat` en la raíz del proyecto para copiar los archivos locales y mover reportes/JSON de la carpeta de Descargas.
2. Ejecuta el script `subir_nube.bat` en la raíz del proyecto para confirmar los cambios en Git y subirlos a GitHub.
3. Informa al usuario sobre el estado final del proceso de respaldo.
