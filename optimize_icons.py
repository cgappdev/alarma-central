from PIL import Image
import os

print("Optimizando iconos de la PWA...")

# Procesar icon-192.png
try:
    img192 = Image.open('icon-192.png')
    img192_resized = img192.resize((192, 192), Image.Resampling.LANCZOS)
    img192_resized.save('icon-192.png', optimize=True, quality=95)
    print("icon-192.png optimizado a 192x192")
except Exception as e:
    print(f"Error procesando icon-192: {e}")

# Procesar icon-512.png
try:
    img512 = Image.open('icon-512.png')
    img512_resized = img512.resize((512, 512), Image.Resampling.LANCZOS)
    img512_resized.save('icon-512.png', optimize=True, quality=95)
    print("icon-512.png optimizado a 512x512")
except Exception as e:
    print(f"Error procesando icon-512: {e}")

# Opcional: Generar versiones maskable si se desean
try:
    img_maskable = Image.open('icon-512.png')
    # Para maskable, simplemente la guardamos como una copia para que la detecte Lighthouse si se añade al manifest
    img_maskable.save('icon-maskable-512.png', optimize=True)
    img_maskable.resize((192, 192), Image.Resampling.LANCZOS).save('icon-maskable-192.png', optimize=True)
    print("Iconos maskable generados.")
except Exception as e:
    print(f"Error generando maskable: {e}")

print("Optimización completada.")
