# Frontend

Frontend React de Barcelona POIs.

Su funcion es ofrecer la interfaz web para:

- administrar empresas y usuarios
- generar rutas inteligentes
- construir rutas manuales
- editar rutas
- cargar rutas como usuario final
- visualizar rutas y POIs en mapa
- mostrar descripciones turisticas enriquecidas si el backend las devuelve
- mostrar fallback turistico cuando el backend no puede usar Gemini

## Tecnologias

```text
React
Vite
Leaflet
React Leaflet
```

Dependencias:

```text
react@^18.3.1
react-dom@^18.3.1
leaflet@^1.9.4
react-leaflet@^4.2.1
```

Dependencias de desarrollo:

```text
vite@^5.4.11
@vitejs/plugin-react@^4.3.4
```

## Scripts

```powershell
npm run dev
npm run build
npm run preview
```

## Estructura

```text
frontend/
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   |-- pages/
|   |-- components/
|   |-- services/
|   |-- hooks/
|   |-- i18n/
|   |-- styles/
|   `-- assets/
|-- public/
|-- package.json
`-- README.md
```

## Vistas actuales

### Admin

Panel para administracion:

- resumen en topbar de empresas, usuarios, activos, rutas y POIs
- crear empresas
- crear cuenta de acceso para empresa
- crear usuarios
- asignar usuario a empresa
- activar/desactivar usuarios
- buscadores de empresas y usuarios
- tablas con scroll interno
- responsive para desktop, tablet y movil

Los datos de usuario conectado vienen del login JWT mediante `/api/auth/me`.

### Empresa

Incluye tres herramientas:

```text
Generador inteligente
Constructor manual
Editor de ruta
Usuarios
```

Generador inteligente:

- usa la sidebar de preferencias
- llama al backend `/api/recommend-route`
- muestra ruta en mapa

Constructor manual:

- usa el catalogo de POIs
- permite buscar y filtrar POIs
- crea una ruta manual desde POIs seleccionados

Editor de ruta:

- parte de una ruta activa
- permite quitar POIs
- reordenar POIs
- anadir POIs desde catalogo
- recalcular resumen basico

Usuarios:

- crear usuarios finales de la empresa
- buscar/listar usuarios finales
- usar esos usuarios en el selector de asignacion al guardar una ruta

### Usuario

Permite:

- ver rutas asignadas desde MySQL
- cargar ruta por codigo publico
- guardar accesos rapidos a rutas cargadas en localStorage
- consultar mapa, resumen y detalle de POIs

## Servicios API

Archivo:

```text
src/services/api.js
```

Funciones principales:

```text
fetchHealth
login
fetchCurrentUser
fetchCategories
fetchPois
recommendRoute
saveRoute
fetchSavedRoute
fetchMyRoutes
fetchCompanyUsers
createCompanyUser
fetchAdminData
createAdminClient
createAdminUser
updateAdminUserStatus
fetchStreetRoute
```

`fetchStreetRoute` llama a OSRM para calcular trazado peatonal. OSRM no recomienda POIs; solo dibuja/calcula el trayecto entre puntos ya seleccionados.

## Mapa

El mapa usa:

```text
Leaflet
React Leaflet
```

Muestra:

- punto inicial
- POIs ordenados
- marcador seleccionado
- linea directa o geometria peatonal
- seleccion desde mapa/lista

## Tema e idioma

La app tiene:

- modo oscuro
- modo claro
- idioma ES/EN

Las preferencias se guardan en `localStorage`.

## Responsive

La interfaz esta adaptada para:

- desktop
- portatil
- tablet
- movil

En movil se usa topbar compacta, formularios a una columna y scroll interno en tablas/listados largos.

## Ejecutar

```powershell
cd project-root/frontend
npm install
npm run dev
```

URL:

```text
http://localhost:5173
```

Build:

```powershell
npm run build
```

## Estado actual

El frontend ya esta conectado con:

- backend Node.js
- recomendador Python
- MySQL para rutas/admin
- MySQL para usuarios finales y rutas asignadas
- descripciones IA de POIs generadas/cacheadas por backend cuando Gemini esta configurado
- textos de POI ya normalizados por backend para evitar etiquetas tecnicas en el detalle
- OSRM para trazado peatonal

Siguiente paso:

- mejorar la gestion/listado de rutas guardadas desde Empresa
- completar permisos por rol en todos los flujos privados
