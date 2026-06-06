# Barcelona POIs Recommender Web

Esta carpeta contiene la aplicacion web del TFM.

La web conecta el sistema hibrido de recomendacion de rutas con una interfaz usable para empresas, usuarios y administracion.

## Estructura

```text
project-root/
|-- backend/    API Node.js + Express
|-- frontend/   Aplicacion React + Vite + Leaflet
|-- docs/       Documentacion tecnica y de defensa
|-- app/        Estructura Python previa conservada
|-- config/     Configuracion previa conservada
`-- tests/      Tests iniciales
```

Fuera de `project-root`, pero conectado con la web:

```text
../ml_service/recommend_route.py
../data/pois_barcelona_hibrido.parquet
../database/
```

## Arquitectura

```text
Frontend React
  -> Backend Express
  -> Motor Python hibrido
  -> Dataset hibrido
  -> Enriquecimiento opcional de descripciones con Gemini Flash/cache MySQL
  -> Respuesta JSON
  -> Mapa, resultados y persistencia MySQL
```

El frontend no ejecuta notebooks. El notebook final del sistema hibrido se llevo a:

```text
../ml_service/recommend_route.py
```

## Vistas actuales

### Admin

Panel de administracion inicial:

- resumen de empresas, usuarios, activos, rutas y POIs
- crear empresas
- crear usuario de acceso al crear empresa
- crear usuarios manualmente
- asignar usuarios a empresa
- cambiar la password de un usuario si la olvida
- activar/desactivar usuarios
- buscador de empresas y usuarios
- gestion global de rutas guardadas
- busqueda/filtro de rutas por empresa
- renombrar, reasignar, duplicar y eliminar rutas

Esta vista queda asociada al rol `admin` mediante login JWT.

### Empresa

Vista para empresas/clientes:

- generador inteligente de rutas con el modelo hibrido
- constructor manual con catalogo de POIs
- editor de ruta activa
- alta, buscador y gestion de usuarios finales de la empresa
- gestion de rutas guardadas de la empresa por usuario final
- guardado de rutas en MySQL
- asignacion de rutas a usuarios finales
- actualizacion de rutas guardadas desde el editor sin crear una copia nueva

### Usuario

Vista para usuario final:

- ver rutas asignadas desde MySQL
- cargar una ruta por codigo publico
- guardar accesos rapidos a rutas cargadas en el navegador
- consultar mapa, resumen y POIs

La lista principal de rutas asignadas viene de la BDD usando la sesion autenticada.

## Backend

Carpeta:

```text
backend/
```

Documentacion especifica:

```text
backend/README.md
```

Endpoints principales:

```text
GET    /api/health
GET    /api/categories
GET    /api/pois
POST   /api/recommend-route
POST   /api/routes
GET    /api/routes/my
GET    /api/routes/:publicId
GET    /api/admin
POST   /api/admin/clients
POST   /api/admin/users
PATCH  /api/admin/users/:userId/status
PATCH  /api/admin/users/:userId/password
GET    /api/admin/routes
PATCH  /api/admin/routes/:routeId
POST   /api/admin/routes/:routeId/duplicate
DELETE /api/admin/routes/:routeId
POST   /api/auth/login
GET    /api/auth/me
GET    /api/company/routes
PATCH  /api/company/routes/:routeId
PUT    /api/company/routes/:routeId/recommendation
DELETE /api/company/routes/:routeId
GET    /api/company/users
POST   /api/company/users
PATCH  /api/company/users/:userId
PATCH  /api/company/users/:userId/status
PATCH  /api/company/users/:userId/password
```

## Frontend

Carpeta:

```text
frontend/
```

Documentacion especifica:

```text
frontend/README.md
```

Tecnologias:

- React
- Vite
- Leaflet
- React Leaflet

## Base de datos

La BDD esta fuera de esta carpeta:

```text
../database/
```

Se usa para:

- empresas
- usuarios
- roles
- POIs importados
- rutas guardadas
- POIs de cada ruta
- descripciones turisticas generadas por IA para POIs
- versiones de prompt usadas para cachear/regenerar textos

El recomendador sigue usando el dataset hibrido:

```text
../data/pois_barcelona_hibrido.parquet
```

## Ejecutar todo

Desde la raiz del repositorio:

```powershell
.\start-dev.ps1
```

En Git Bash:

```bash
powershell.exe -ExecutionPolicy Bypass -File ./start-dev.ps1
```

URLs:

```text
Backend:  http://localhost:4000
Frontend: http://localhost:5173
```

## Ejecucion manual

Backend:

```powershell
cd project-root/backend
npm install
$env:PYTHON_BIN="C:\Users\User\miniconda3\envs\master_ds_clean\python.exe"
npm run dev
```

Frontend:

```powershell
cd project-root/frontend
npm install
npm run dev
```

## Dependencias

Backend:

```text
Node.js v22.19.0
npm 10.9.3

bcryptjs@^3.0.3
cors@^2.8.5
csv-parse@^5.5.6
dotenv@^16.4.5
express@^4.21.2
jsonwebtoken@^9.0.3
mysql2@^3.22.3
```

Frontend:

```text
react@^18.3.1
react-dom@^18.3.1
leaflet@^1.9.4
react-leaflet@^4.2.1
vite@^5.4.11
@vitejs/plugin-react@^4.3.4
```

Python usado por el recomendador:

```text
Python 3.11.15
pandas==3.0.2
numpy==2.4.4
scikit-learn==1.8.0
pyarrow==16.1.0
mysql-connector-python==9.7.0
```

Integracion opcional con Gemini Flash:

```text
project-root/backend/.env

GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
```

Esta capa no decide la ruta. Solo convierte la descripcion tecnica del POI en un texto turistico mas natural para el usuario final y lo guarda en MySQL. Si Gemini no esta disponible o devuelve un texto demasiado corto, el backend genera un fallback turistico local para no mostrar contenido tecnico.

## Documentacion tecnica

En `docs/`:

```text
apis_del_proyecto.txt
auditoria_notebooks_modelado.md
explicacion_modelo_hibrido_final.txt
flujo_usuario_modelo_hibrido_web.txt
historial_trabajo_2026-04-27.txt
integracion_modelo_hibrido_web.txt
preguntas_frecuentes_defensa.txt
uso_ml_en_el_recomendador.txt
```

## Estado actual

La web ya esta conectada con el recomendador hibrido real, MySQL y login JWT. La vista Empresa puede crear usuarios finales, gestionar sus rutas guardadas, asignarlas a usuarios y actualizar una ruta desde el editor. La vista Admin puede gestionar empresas, usuarios y rutas globales. La vista Usuario puede consultar las rutas asignadas desde la BDD.
