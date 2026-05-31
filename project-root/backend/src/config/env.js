import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

// __dirname no existe directamente en modulos ES, por eso reconstruimos la ruta
// del archivo actual a partir de import.meta.url.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// projectRoot apunta a project-root/, que contiene backend/, frontend/, docs/, etc.
const projectRoot = path.resolve(__dirname, "../../..");
const repositoryRoot = path.resolve(projectRoot, "..");

// CSV usado por endpoints auxiliares como /api/categories y /api/pois.
// Para que la web este alineada con el modelo final, usamos el CSV hibrido.
const defaultDatasetPath = path.resolve(projectRoot, "../data/pois_barcelona_hibrido.csv");
const configuredDatasetPath = process.env.DATASET_PATH
  ? path.resolve(projectRoot, process.env.DATASET_PATH)
  : defaultDatasetPath;

// Script Python que contiene la version productiva del recomendador hibrido.
const defaultHybridRecommenderPath = path.resolve(
  projectRoot,
  "../ml_service/recommend_route.py",
);
const configuredHybridRecommenderPath = process.env.HYBRID_RECOMMENDER_PATH
  ? path.resolve(projectRoot, process.env.HYBRID_RECOMMENDER_PATH)
  : defaultHybridRecommenderPath;

const defaultDbConfigPath = path.resolve(repositoryRoot, "database/db_config.local.json");

function loadLocalDbConfig() {
  if (!fs.existsSync(defaultDbConfigPath)) {
    return {};
  }

  const rawConfig = fs.readFileSync(defaultDbConfigPath, "utf8");
  return JSON.parse(rawConfig);
}

const localDbConfig = loadLocalDbConfig();

export const env = {
  // Puerto del backend Express.
  port: Number(process.env.PORT || 4000),

  // Origen permitido para CORS. Vite suele arrancar el frontend en 5173.
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",

  // Dataset CSV usado por servicios auxiliares de POIs/categorias.
  datasetPath: configuredDatasetPath,

  // Ruta del motor Python del recomendador.
  hybridRecommenderPath: configuredHybridRecommenderPath,

  // Interprete Python. En desarrollo se pasa desde start-dev.ps1 para usar Conda.
  pythonBin: process.env.PYTHON_BIN || "python",

  // Configuracion de autenticacion JWT.
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },

  // Configuracion opcional para enriquecer descripciones de POIs con Gemini.
  // Si no hay GEMINI_API_KEY, el backend mantiene las descripciones originales.
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    apiBaseUrl:
      process.env.GEMINI_API_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta",
  },

  // Configuracion MySQL. Por defecto reutiliza database/db_config.local.json.
  db: {
    host: process.env.MYSQL_HOST || localDbConfig.host || "localhost",
    port: Number(process.env.MYSQL_PORT || localDbConfig.port || 3306),
    database: process.env.MYSQL_DATABASE || localDbConfig.database || "pois_recommender_bcn",
    user: process.env.MYSQL_USER || localDbConfig.user || "root",
    password: process.env.MYSQL_PASSWORD || localDbConfig.password || "",
  },
};
