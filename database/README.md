# Base de datos MySQL

Esta carpeta contiene todo lo relacionado con la base de datos MySQL del proyecto.

La BDD se usa como capa de persistencia y gestion:

- empresas/clientes
- usuarios y roles
- POIs importados
- rutas guardadas
- asignacion de rutas a usuarios finales
- POIs incluidos en cada ruta
- JSON con preferencias, resumen, ruta y navegacion
- descripciones generadas por IA para POIs, con version de prompt

Para el MVP actual, el recomendador sigue leyendo el dataset hibrido desde parquet/CSV. MySQL no sustituye todavia al dataset del modelo.

## Archivos

```text
database/
|-- 01_create_database.sql
|-- 02_create_tables.sql
|-- 03_seed_initial_data.sql
|-- 04_seed_auth_demo_users.sql
|-- db_config.example.json
|-- db_config.local.json
|-- import_pois_to_mysql.py
`-- README.md
```

## Orden recomendado

En MySQL Workbench:

```text
01_create_database.sql
02_create_tables.sql
03_seed_initial_data.sql
04_seed_auth_demo_users.sql
```

Despues, desde consola:

```powershell
python database/import_pois_to_mysql.py
```

## Scripts SQL

### 01_create_database.sql

Crea la base de datos:

```text
pois_recommender_bcn
```

### 02_create_tables.sql

Crea las tablas principales:

- `roles`
- `clients`
- `users`
- `pois`
- `routes`
- `route_pois`
- `poi_generated_descriptions`

Relaciones principales:

```text
users.role_id -> roles.id
users.client_id -> clients.id
routes.created_by_user_id -> users.id
routes.assigned_to_user_id -> users.id
routes.client_id -> clients.id
route_pois.route_id -> routes.id
route_pois.poi_id -> pois.id
```

### 03_seed_initial_data.sql

Inserta datos base:

- roles iniciales
- cliente demo inicial
- usuarios demo iniciales

### 04_seed_auth_demo_users.sql

Actualiza/crea usuarios preparados para pruebas de login:

```text
admin.demo@example.com    / demo1234
empresa.demo@example.com  / demo1234
usuario.demo@example.com  / demo1234
cliente.demo@example.com  / demo1234
```

La password no se guarda en texto plano. Se guarda en:

```text
users.password_hash
```

como hash bcrypt.

## Modelo de usuarios y empresas

La tabla `clients` representa la empresa como entidad:

```text
clients
id
name
client_type
contact_email
contact_phone
notes
```

La tabla `users` representa las cuentas que pueden iniciar sesion:

```text
users
id
role_id
client_id
name
email
password_hash
is_active
```

Una empresa no tiene password directamente. La password pertenece al usuario asociado.

Ejemplo:

```text
clients
id: 4
name: Barcelona Tours

users
id: 10
role: client
client_id: 4
email: acceso@barcelonatours.com
password_hash: bcrypt(...)
```

Asi una misma empresa podra tener varios usuarios en el futuro.

## Roles

Roles actuales:

```text
admin   -> administra empresas, usuarios y estado general
client  -> empresa/cliente que crea rutas, usuarios finales y asigna rutas
user    -> usuario final que consulta rutas asignadas
```

Actualmente el panel admin permite crear empresas y usuarios, el login JWT ya esta activo en backend/frontend y la vista Empresa permite crear usuarios finales de su propia empresa.

## Panel admin y BDD

El panel admin usa estos endpoints del backend:

```text
GET    /api/admin
POST   /api/admin/clients
POST   /api/admin/users
PATCH  /api/admin/users/:userId/status
```

Funcionalidades actuales:

- ver numero de empresas, usuarios, usuarios activos, rutas y POIs
- crear empresa
- crear usuario de acceso de empresa al crear empresa
- crear usuarios manualmente
- asignar usuario a empresa
- activar/desactivar usuarios
- buscar empresas y usuarios desde frontend
- crear usuarios finales desde la vista Empresa
- asignar rutas guardadas a usuarios finales
- consultar rutas asignadas desde la vista Usuario

El backend usa `bcryptjs` para guardar passwords hasheadas.

## Configuracion local

El backend y el importador leen:

```text
database/db_config.local.json
```

Ejemplo:

```json
{
  "host": "localhost",
  "port": 3306,
  "database": "pois_recommender_bcn",
  "user": "root",
  "password": "tu_password_de_mysql"
}
```

El archivo de referencia es:

```text
database/db_config.example.json
```

`db_config.local.json` no deberia subirse con credenciales reales.

## Importar POIs

Script:

```text
database/import_pois_to_mysql.py
```

Dependencia Python usada por el importador:

```text
Python 3.11.15
pandas==3.0.2
pyarrow==16.1.0
mysql-connector-python==9.7.0
```

Prueba sin insertar:

```powershell
python database/import_pois_to_mysql.py --dry-run --limit 5
```

Importacion completa:

```powershell
python database/import_pois_to_mysql.py
```

Importacion parcial:

```powershell
python database/import_pois_to_mysql.py --limit 10
```

El importador:

1. lee `db_config.local.json`
2. carga `data/pois_barcelona_hibrido.parquet`
3. si parquet no esta disponible, usa `data/pois_barcelona_hibrido.csv`
4. limpia valores nulos, arrays y tipos de pandas/numpy
5. convierte cada fila al formato de la tabla `pois`
6. asigna zona turistica a partir de `cluster_geo`
7. guarda la fila original completa en `raw_data`
8. inserta o actualiza con `ON DUPLICATE KEY UPDATE`

Se puede ejecutar varias veces sin duplicar POIs.

## Rutas guardadas

Las rutas se guardan en:

```text
routes
route_pois
```

`routes` guarda:

- identificador publico `public_id`
- usuario creador
- usuario asignado
- empresa
- resumen de distancia/tiempo
- preferencias JSON
- ruta completa JSON
- navegacion JSON
- metadatos del modelo

`route_pois` guarda:

- orden de cada POI
- snapshots de nombre/categoria/coordenadas
- metricas de score, similitud y calidad
- JSON del POI dentro de la ruta

Esto permite recuperar una ruta aunque el dataset o el modelo cambien mas adelante.

## Descripciones generadas por IA

La tabla:

```text
poi_generated_descriptions
```

guarda descripciones turisticas generadas para cada POI.

Campos relevantes:

```text
poi_id
language_code
description_type
generated_text
model_name
prompt_version
```

Uso previsto:

```text
el recomendador genera una ruta
el backend busca si cada POI ya tiene descripcion IA para idioma y version de prompt
si existe, la reutiliza desde MySQL
si no existe y hay GEMINI_API_KEY, llama a Gemini Flash
guarda la descripcion generada
la devuelve al frontend para mostrarla al usuario final
```

La descripcion IA no participa en la seleccion de la ruta. Es una capa de enriquecimiento visual y explicativo posterior al sistema hibrido.

La version actual del prompt es:

```text
touristic-poi-v4
```

Las versiones anteriores pueden mantenerse como historico de iteracion del prompt, aunque la aplicacion solo reutiliza la version activa.

## Estado actual

La BDD ya esta preparada para:

- persistir rutas
- importar POIs
- gestionar empresas
- gestionar usuarios
- login con bcrypt/JWT
- guardar rutas asignadas a usuarios reales
- recuperar rutas del usuario autenticado

Falta como siguiente paso:

- extender permisos por rol a todos los endpoints privados
- mejorar la gestion/listado de rutas desde la vista Empresa
