# Guia de ejecucion local del proyecto

Esta guia explica como ejecutar el proyecto completo en local si alguien descarga el repositorio desde cero.

El proyecto tiene varias partes:

```text
Frontend React
Backend Node.js
Motor Python del recomendador hibrido
Base de datos MySQL
Dataset hibrido de POIs
```

Para que todo funcione correctamente hay que preparar primero Python, Node.js y MySQL.

## 1. Requisitos previos

Antes de empezar, hay que tener instalado:

```text
Python 3.11
Conda o Miniconda
Node.js
npm
MySQL Server
MySQL Workbench
Git
```

Versiones usadas en mi entorno:

```text
Python 3.11.15
Node.js v22.19.0
npm 10.9.3
MySQL 8.x
```

## 2. Descargar el repositorio

Clonar el repositorio o descargarlo como ZIP.

Despues, entrar en la carpeta raiz:

```powershell
cd TFG_POIs_Recommender_Oscar_Fernandez
```

La carpeta raiz debe contener, entre otros:

```text
data/
database/
ml_service/
modelo/
project-root/
src/
README.md
start-dev.ps1
```

## 3. Crear el entorno Python

Crear un entorno Conda:

```powershell
conda create -n master_ds_clean python=3.11
```

Activarlo:

```powershell
conda activate master_ds_clean
```

Instalar dependencias Python:

```powershell
pip install pandas numpy scikit-learn pyarrow matplotlib notebook mysql-connector-python
```

Dependencias principales usadas por el proyecto:

```text
pandas==3.0.2
numpy==2.4.4
scikit-learn==1.8.0
pyarrow==16.1.0
matplotlib==3.10.8
notebook==7.5.5
mysql-connector-python==9.7.0
```

Comprobar que el entorno funciona:

```powershell
python --version
```

Debe aparecer una version de Python 3.11.

## 4. Instalar dependencias del backend

Entrar en el backend:

```powershell
cd project-root/backend
```

Instalar dependencias:

```powershell
npm install
```

Volver a la raiz:

```powershell
cd ../..
```

## 5. Instalar dependencias del frontend

Entrar en el frontend:

```powershell
cd project-root/frontend
```

Instalar dependencias:

```powershell
npm install
```

Volver a la raiz:

```powershell
cd ../..
```

## 6. Crear la base de datos MySQL

Abrir MySQL Workbench.

Conectarse al servidor local de MySQL.

Ejecutar estos scripts en este orden:

```text
database/01_create_database.sql
database/02_create_tables.sql
database/03_seed_initial_data.sql
database/04_seed_auth_demo_users.sql
```

Estos scripts crean:

```text
base de datos pois_recommender_bcn
tablas principales
roles
empresa demo
usuarios demo
passwords hasheadas con bcrypt
```

Usuarios demo:

```text
admin.demo@example.com    / demo1234
empresa.demo@example.com  / demo1234
usuario.demo@example.com  / demo1234
cliente.demo@example.com  / demo1234
```

## 7. Configurar credenciales de MySQL

Crear el archivo:

```text
database/db_config.local.json
```

Puede copiarse desde:

```text
database/db_config.example.json
```

Ejemplo:

```json
{
  "host": "localhost",
  "port": 3306,
  "database": "pois_recommender_bcn",
  "user": "root",
  "password": "TU_PASSWORD_MYSQL"
}
```

Este archivo contiene credenciales locales y no deberia subirse a GitHub con passwords reales.

## 8. Importar los POIs a MySQL

Desde la raiz del proyecto, con el entorno Conda activado:

```powershell
python database/import_pois_to_mysql.py
```

Antes de importar todo, se puede hacer una prueba:

```powershell
python database/import_pois_to_mysql.py --dry-run --limit 5
```

El importador:

```text
lee data/pois_barcelona_hibrido.parquet
si no puede leer parquet, usa data/pois_barcelona_hibrido.csv
limpia valores nulos y tipos especiales
inserta o actualiza POIs en MySQL
guarda tambien raw_data con la fila original
```

Este script se puede ejecutar mas de una vez. No duplica POIs porque usa insercion/actualizacion.

## 9. Configurar el Python que usara el backend

El backend llama al recomendador Python:

```text
ml_service/recommend_route.py
```

Por eso debe usar el Python del entorno Conda donde estan instaladas las librerias.

En PowerShell:

```powershell
$env:PYTHON_BIN="C:\Users\TU_USUARIO\miniconda3\envs\master_ds_clean\python.exe"
```

En mi caso era:

```powershell
$env:PYTHON_BIN="C:\Users\User\miniconda3\envs\master_ds_clean\python.exe"
```

El script `start-dev.ps1` ya esta preparado para facilitar este arranque en local.

## 9.1. Configurar Gemini Flash opcional

El proyecto puede enriquecer las descripciones de los POIs con Gemini Flash.

No es obligatorio para ejecutar el proyecto. Si no se configura, la aplicacion usa las descripciones originales del dataset.

Para activarlo de forma permanente en local, crear o editar:

```text
project-root/backend/.env
```

Contenido:

```env
GEMINI_API_KEY=TU_API_KEY_DE_GEMINI
GEMINI_MODEL=gemini-2.5-flash
```

Tambien se pueden definir temporalmente en PowerShell antes de arrancar el backend:

```powershell
$env:GEMINI_API_KEY="TU_API_KEY_DE_GEMINI"
$env:GEMINI_MODEL="gemini-2.5-flash"
```

El archivo `.env` esta incluido en `.gitignore`, por lo que no debe subirse a GitHub.

El backend guardara las descripciones generadas en MySQL, dentro de:

```text
poi_generated_descriptions
```

Si Gemini falla por cuota, clave invalida o limite diario, el proyecto sigue funcionando y muestra una descripcion turistica generada localmente como respaldo.

## 10. Ejecutar backend y frontend

Desde la raiz del proyecto:

```powershell
.\start-dev.ps1
```

Si PowerShell bloquea la ejecucion:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Si se usa Git Bash:

```bash
powershell.exe -ExecutionPolicy Bypass -File ./start-dev.ps1
```

El script abre/lanza:

```text
backend en http://localhost:4000
frontend en http://localhost:5173
```

## 11. Comprobar que funciona

Comprobar backend:

```text
http://localhost:4000/api/health
```

Abrir frontend:

```text
http://localhost:5173
```

Iniciar sesion con:

```text
admin.demo@example.com / demo1234
```

o:

```text
empresa.demo@example.com / demo1234
```

o:

```text
usuario.demo@example.com / demo1234
```

## 12. Flujo recomendado de prueba

### Como admin

1. Entrar con `admin.demo@example.com`.
2. Revisar el panel de empresas y usuarios.
3. Crear una empresa si se quiere probar el flujo completo.
4. Crear usuarios asociados a esa empresa.

### Como empresa

1. Entrar con `empresa.demo@example.com`.
2. Ir al generador inteligente.
3. Generar una ruta con preferencias.
4. Guardar la ruta.
5. Asignarla a un usuario final.
6. Crear usuarios finales desde la pestaña de usuarios si hace falta.

### Como usuario final

1. Entrar con `usuario.demo@example.com`.
2. Ver rutas asignadas desde MySQL.
3. Cargar una ruta en el mapa.
4. Consultar resumen, POIs y detalle de ruta.

## 13. Problemas comunes

### El backend no arranca por el puerto 4000

Puede que ya haya otro backend abierto.

Solucion:

```powershell
Get-NetTCPConnection -LocalPort 4000
```

Cerrar el proceso anterior o reiniciar la terminal.

### Error con pyarrow o sklearn

Normalmente significa que el backend no esta usando el Python correcto.

Revisar:

```powershell
$env:PYTHON_BIN
```

Y comprobar que apunta al entorno Conda `master_ds_clean`.

### Error de conexion a MySQL

Revisar:

```text
database/db_config.local.json
```

Comprobar:

```text
host
port
database
user
password
```

Tambien hay que asegurarse de que MySQL Server esta iniciado.

### No aparecen rutas asignadas al usuario

Hay que comprobar:

```text
la ruta esta guardada en MySQL
la ruta tiene assigned_to_user_id
el usuario final esta activo
la empresa que asigna la ruta coincide con la empresa del usuario
```

## 14. Resumen rapido

Comandos principales:

```powershell
conda create -n master_ds_clean python=3.11
conda activate master_ds_clean
pip install pandas numpy scikit-learn pyarrow matplotlib notebook mysql-connector-python

cd project-root/backend
npm install
cd ../frontend
npm install
cd ../..

python database/import_pois_to_mysql.py
.\start-dev.ps1
```

URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
Health:   http://localhost:4000/api/health
```
