# Backend

Backend Node.js + Express de la aplicacion Barcelona POIs.

Su funcion es:

- exponer la API local
- llamar al motor Python del recomendador hibrido
- leer datos auxiliares de POIs/categorias
- guardar y recuperar rutas en MySQL
- gestionar el panel admin de empresas y usuarios
- gestionar usuarios finales de empresa y rutas asignadas
- enriquecer descripciones de POIs con Gemini Flash y cachearlas en MySQL

## Tecnologias

```text
Node.js v22.19.0
npm 10.9.3
Express
MySQL
bcryptjs
jsonwebtoken
```

Dependencias actuales:

```text
bcryptjs@^3.0.3
cors@^2.8.5
csv-parse@^5.5.6
dotenv@^16.4.5
express@^4.21.2
jsonwebtoken@^9.0.3
mysql2@^3.22.3
```

## Scripts

```powershell
npm run dev
npm start
```

`npm run dev` usa:

```text
node --watch src/server.js
```

## Estructura

```text
backend/
|-- src/
|   |-- app.js
|   |-- server.js
|   |-- routes/
|   |-- controllers/
|   |-- services/
|   |-- config/
|   `-- utils/
|-- package.json
`-- README.md
```

## Configuracion

El backend lee configuracion desde:

- variables de entorno
- `database/db_config.local.json`

Variables utiles:

```text
PORT
CLIENT_ORIGIN
DATASET_PATH
HYBRID_RECOMMENDER_PATH
PYTHON_BIN
MYSQL_HOST
MYSQL_PORT
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_API_BASE_URL
```

En desarrollo, `start-dev.ps1` suele definir `PYTHON_BIN` para usar el entorno Conda correcto.

`GEMINI_API_KEY` es opcional y debe guardarse en:

```text
project-root/backend/.env
```

Ejemplo:

```text
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-2.5-flash
```

El archivo `.env` esta ignorado por Git. Si se configura Gemini, el backend genera descripciones turisticas para los POIs de la ruta y las guarda en MySQL. Si Gemini no esta disponible, falla por cuota o devuelve un texto demasiado corto, se genera una descripcion local de respaldo para evitar textos tecnicos en la interfaz.

## Endpoints

### Salud

```text
GET /api/health
```

Comprueba que el backend esta levantado.

### Autenticacion

```text
POST /api/auth/login
GET  /api/auth/me
```

`POST /api/auth/login` valida email/password con `bcryptjs` y devuelve un token JWT.

`GET /api/auth/me` devuelve el usuario autenticado a partir del token enviado en:

```text
Authorization: Bearer <token>
```

### POIs y categorias

```text
GET /api/categories
GET /api/pois
```

`/api/pois` acepta filtros:

```text
q
category
subcategory
neighborhoodZone
minRating
limit
```

Se usa para el catalogo de POIs del constructor manual y editor.

### Recomendacion

```text
POST /api/recommend-route
```

Recibe preferencias del usuario y llama internamente a:

```text
../../ml_service/recommend_route.py
```

El backend envia JSON por `stdin` y recibe JSON por `stdout`.

Despues de recibir la ruta del motor Python, el backend puede enriquecer las descripciones de los POIs con Gemini Flash. La descripcion generada se guarda en:

```text
poi_generated_descriptions
```

El LLM no decide la ruta. Solo transforma los datos tecnicos del POI en una descripcion turistica orientada al usuario final.

Detalles de la capa LLM:

- reutiliza descripciones existentes desde MySQL para no llamar a Gemini siempre
- versiona el prompt con `prompt_version`
- actualmente usa `touristic-poi-v4`
- humaniza etiquetas tecnicas antes de enviarlas al modelo
- repara caracteres corruptos frecuentes en nombres/descripciones
- aplica fallback local si Gemini falla o devuelve una descripcion pobre

### Rutas guardadas

```text
POST /api/routes
GET  /api/routes/my
GET  /api/routes/:publicId
```

`POST /api/routes` guarda:

- ruta completa
- resumen
- preferencias
- navegacion
- POIs y orden
- usuario creador, empresa y usuario final asignado si existe

`GET /api/routes/my` devuelve las rutas asignadas al usuario autenticado.

Tablas usadas:

```text
routes
route_pois
```

### Admin

```text
GET    /api/admin
POST   /api/admin/clients
POST   /api/admin/users
PATCH  /api/admin/users/:userId/status
```

Uso:

- listar roles, empresas, usuarios y estadisticas
- crear empresa
- crear usuario de acceso de empresa
- crear usuarios manualmente
- activar/desactivar usuarios

Passwords:

- se reciben en texto plano desde el formulario
- se hashean con `bcryptjs`
- se guardan en `users.password_hash`

### Empresa

```text
GET  /api/company/users
POST /api/company/users
```

Uso:

- listar usuarios finales de la empresa autenticada
- buscar usuarios finales desde frontend
- crear usuarios finales con password hasheada
- alimentar el selector de asignacion de rutas

Un usuario con rol `client` solo gestiona usuarios de su propia empresa. El rol `admin` puede consultar una vision mas amplia si se usa esta API.

## Estado de autenticacion

El backend ya tiene:

- tabla `users`
- tabla `roles`
- `password_hash`
- creacion de usuarios con bcrypt
- login con JWT
- endpoint `/api/auth/me`
- rutas asignadas a usuarios finales
- alta de usuarios finales desde la vista Empresa

Todavia falta:

- extender permisos por rol al resto de endpoints privados
- mejorar la gestion/listado de rutas guardadas desde la vista Empresa

## Ejecutar

```powershell
cd project-root/backend
npm install
$env:PYTHON_BIN="C:\Users\User\miniconda3\envs\master_ds_clean\python.exe"
npm run dev
```

Backend:

```text
http://localhost:4000
```

Health:

```text
http://localhost:4000/api/health
```

## Verificacion

Comprobar sintaxis de un archivo:

```powershell
node --check src/services/adminService.js
```

Probar endpoints:

- navegador para `GET`
- Thunder Client para `POST`/`PATCH`

## Notas

El backend no recomienda POIs por si solo. La recomendacion real la calcula el motor Python. Node.js actua como capa API, coordinacion, persistencia y comunicacion con frontend.
