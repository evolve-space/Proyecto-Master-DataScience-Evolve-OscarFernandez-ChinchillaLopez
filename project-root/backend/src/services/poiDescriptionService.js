import { env } from "../config/env.js";
import { getDbPool } from "./db.js";

const DESCRIPTION_TYPE = "touristic";
const MAX_DESCRIPTION_LENGTH = 900;
const MIN_DESCRIPTION_WORDS = 45;
const PROMPT_VERSION = "touristic-poi-v4";

const ES_LABELS = {
  tourist_attraction: "punto de interes turistico",
  attraction: "punto de interes",
  religious: "patrimonio religioso",
  church: "iglesia historica",
  cultural: "espacio cultural",
  theatre: "teatro o sala escenica",
  museum: "museo",
  library: "biblioteca o espacio cultural",
  arts_centre: "centro artistico",
  artwork: "obra artistica",
  monument: "monumento",
  historic: "lugar historico",
  fountain: "fuente urbana",
  park: "parque",
  bridge: "puente",
  square: "plaza",
  gallery: "galeria",
};

const EN_LABELS = {
  tourist_attraction: "tourist point of interest",
  attraction: "point of interest",
  religious: "religious heritage",
  church: "historic church",
  cultural: "cultural venue",
  theatre: "theatre or performance venue",
  museum: "museum",
  library: "library or cultural space",
  arts_centre: "arts centre",
  artwork: "artwork",
  monument: "monument",
  historic: "historic place",
  fountain: "urban fountain",
  park: "park",
  bridge: "bridge",
  square: "square",
  gallery: "gallery",
};

function normalizeLanguageCode(value) {
  return String(value || "es").toLowerCase().startsWith("en") ? "en" : "es";
}

function getPoiSourceId(poi) {
  return String(poi?.id ?? poi?.poiSourceId ?? "").trim();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function humanizeLabel(value, languageCode) {
  const rawValue = cleanText(value);
  const key = rawValue.toLowerCase();
  const dictionary = languageCode === "en" ? EN_LABELS : ES_LABELS;

  return dictionary[key] || rawValue.replace(/_/g, " ");
}

function cleanOriginalDescription(value, languageCode) {
  const text = cleanText(value);
  const lowerText = text.toLowerCase();

  if (!text || lowerText === "no description available.") {
    return "";
  }

  return humanizeLabel(text, languageCode);
}

function sanitizeGeneratedText(value) {
  return cleanText(value)
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .slice(0, MAX_DESCRIPTION_LENGTH);
}

function countWords(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function isDescriptionTooShort(value) {
  return countWords(value) < MIN_DESCRIPTION_WORDS;
}

function buildFallbackTouristicDescription(poi, languageCode) {
  const name = cleanText(poi.name) || "este punto de interes";
  const category = humanizeLabel(poi.category, languageCode);
  const subcategory = humanizeLabel(poi.subcategory, languageCode);
  const area = cleanText(poi.neighborhoodZone || poi.cityArea);
  const visitDuration = poi.visitDuration || poi.visitDurationMinutes;
  const originalDescription = cleanOriginalDescription(poi.description, languageCode);

  if (languageCode === "en") {
    return sanitizeGeneratedText(
      `${name} is an interesting stop within this Barcelona route, especially for visitors who want to discover places connected with ${subcategory || category || "local culture"}. ` +
        `${area ? `Located around ${area}, ` : ""}it can fit naturally into a walking itinerary because it adds context and variety between the main points of interest. ` +
        `${originalDescription ? `Its profile suggests a ${originalDescription} type of stop, ` : ""}` +
        `so it is best approached as a short, calm visit that adds local flavour without making the route too dense. ` +
        `${visitDuration ? `The estimated visit time is around ${visitDuration} minutes, making it easy to combine with nearby POIs.` : "It is a practical stop to combine with nearby POIs without making the route too heavy."}`,
    );
  }

  return sanitizeGeneratedText(
    `${name} es una parada interesante dentro de esta ruta por Barcelona, especialmente para visitantes que quieran descubrir lugares relacionados con ${subcategory || category || "la cultura local"}. ` +
      `${area ? `Al estar en la zona de ${area}, ` : ""}encaja bien en un recorrido a pie porque aporta contexto y variedad entre los puntos principales de la visita. ` +
      `${originalDescription ? `Su perfil lo presenta como un tipo de parada vinculada a ${originalDescription}, ` : ""}` +
      `por lo que conviene plantearlo como una visita breve y tranquila que aporta variedad sin hacer la ruta demasiado densa. ` +
      `${visitDuration ? `La duracion estimada es de unos ${visitDuration} minutos, lo que permite combinarlo facilmente con otros POIs cercanos.` : "Es una parada practica para combinar con otros POIs cercanos sin hacer la ruta demasiado pesada."}`,
  );
}

function buildPrompt(poi, languageCode) {
  const targetLanguage =
    languageCode === "en" ? "English" : "Spanish";
  const originalDescription = cleanOriginalDescription(poi.description, languageCode);
  const tags = cleanText(poi.tags)
    .split("|")
    .filter(Boolean)
    .map((tag) => humanizeLabel(tag, languageCode))
    .join(", ");
  const category = humanizeLabel(poi.category, languageCode);
  const subcategory = humanizeLabel(poi.subcategory, languageCode);

  return `
You are a tourism copywriter for a Barcelona route recommendation app.
Write a natural, useful and attractive POI description for a final tourist user.

Rules:
- Write in ${targetLanguage}.
- Use exactly 4 complete sentences.
- Write at least 60 words and at most 100 words.
- Do not invent specific historical facts, dates, prices or opening hours.
- Use only the available POI data and general tourist context.
- Avoid technical words such as score, cluster, confidence or database.
- Do not use raw category codes such as tourist_attraction, attraction, has_schedule or underscores.
- Make it appealing but realistic.
- Mention why this stop can be interesting inside a walking route.
- If the available data is generic, explain the visit in a careful and non-exaggerated way.
- Never answer with only a title or one short phrase.
- Return only the final description, without bullets or titles.

POI data:
Name: ${cleanText(poi.name)}
Category: ${category}
Subcategory: ${subcategory}
Area: ${cleanText(poi.neighborhoodZone || poi.cityArea)}
Original description: ${originalDescription || "Not available"}
Tags: ${tags || "Not available"}
Rating: ${poi.rating ?? "Not available"}
Estimated visit duration: ${poi.visitDuration || poi.visitDurationMinutes || "Not available"} minutes
`.trim();
}

function buildExpansionPrompt({ poi, languageCode, previousText }) {
  const targetLanguage = languageCode === "en" ? "English" : "Spanish";

  return `
Rewrite and expand the following tourist POI description.

Language: ${targetLanguage}
Required output:
- Exactly 4 complete sentences.
- Between 60 and 100 words.
- Natural tone for a tourist using a walking route app.
- Do not invent dates, prices, opening hours or specific historical facts.
- Return only the improved description.

Current text:
${cleanText(previousText)}

POI context:
Name: ${cleanText(poi.name)}
Category: ${humanizeLabel(poi.category, languageCode)}
Subcategory: ${humanizeLabel(poi.subcategory, languageCode)}
Area: ${cleanText(poi.neighborhoodZone || poi.cityArea)}
Original description: ${cleanOriginalDescription(poi.description, languageCode) || "Not available"}
Tags: ${cleanText(poi.tags) || "Not available"}
Estimated visit duration: ${poi.visitDuration || poi.visitDurationMinutes || "Not available"} minutes
`.trim();
}

async function requestGeminiText(prompt) {
  if (!env.gemini.apiKey) {
    return null;
  }

  const endpoint = `${env.gemini.apiBaseUrl}/models/${encodeURIComponent(
    env.gemini.model,
  )}:generateContent?key=${encodeURIComponent(env.gemini.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 260,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.error?.message || "No se pudo generar la descripcion con Gemini.",
    );
    error.statusCode = response.status;
    throw error;
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join(" ");

  return sanitizeGeneratedText(text);
}

async function requestGeminiDescription(poi, languageCode) {
  let generatedText = await requestGeminiText(buildPrompt(poi, languageCode));

  if (generatedText && isDescriptionTooShort(generatedText)) {
    generatedText = await requestGeminiText(
      buildExpansionPrompt({ poi, languageCode, previousText: generatedText }),
    );
  }

  if (!generatedText || isDescriptionTooShort(generatedText)) {
    return buildFallbackTouristicDescription(poi, languageCode);
  }

  return generatedText;
}

async function findPoiAndDescription(connection, poiSourceId, languageCode) {
  const [rows] = await connection.execute(
    `
      SELECT
        p.id AS poiId,
        gd.generated_text AS generatedText
      FROM pois p
      LEFT JOIN poi_generated_descriptions gd
        ON gd.poi_id = p.id
        AND gd.language_code = :languageCode
        AND gd.description_type = :descriptionType
        AND gd.prompt_version = :promptVersion
      WHERE p.poi_source_id = :poiSourceId
      LIMIT 1
    `,
    {
      poiSourceId,
      languageCode,
      descriptionType: DESCRIPTION_TYPE,
      promptVersion: PROMPT_VERSION,
    },
  );

  return rows[0] || null;
}

async function storeGeneratedDescription(connection, poiId, languageCode, generatedText) {
  if (!poiId) {
    return;
  }

  await connection.execute(
    `
      INSERT INTO poi_generated_descriptions (
        poi_id,
        language_code,
        description_type,
        generated_text,
        model_name,
        prompt_version
      )
      VALUES (
        :poiId,
        :languageCode,
        :descriptionType,
        :generatedText,
        :modelName,
        :promptVersion
      )
      ON DUPLICATE KEY UPDATE
        generated_text = VALUES(generated_text),
        model_name = VALUES(model_name),
        prompt_version = VALUES(prompt_version),
        updated_at = CURRENT_TIMESTAMP
    `,
    {
      poiId,
      languageCode,
      descriptionType: DESCRIPTION_TYPE,
      generatedText,
      modelName: env.gemini.model,
      promptVersion: PROMPT_VERSION,
    },
  );
}

async function enrichPoiDescription(connection, poi, languageCode) {
  const poiSourceId = getPoiSourceId(poi);

  if (!poiSourceId) {
    const fallbackText = buildFallbackTouristicDescription(poi, languageCode);

    return {
      ...poi,
      originalDescription: poi.description || null,
      aiDescription: fallbackText,
      description: fallbackText,
      descriptionSource: "local-fallback",
    };
  }

  const existing = await findPoiAndDescription(connection, poiSourceId, languageCode);

  if (existing?.generatedText) {
    return {
      ...poi,
      originalDescription: poi.description || null,
      aiDescription: existing.generatedText,
      description: existing.generatedText,
      descriptionSource: "gemini-cache",
    };
  }

  if (!env.gemini.apiKey) {
    const fallbackText = buildFallbackTouristicDescription(poi, languageCode);

    return {
      ...poi,
      originalDescription: poi.description || null,
      aiDescription: fallbackText,
      description: fallbackText,
      descriptionSource: "local-fallback",
    };
  }

  let generatedText;

  try {
    generatedText = await requestGeminiDescription(poi, languageCode);
  } catch {
    generatedText = buildFallbackTouristicDescription(poi, languageCode);
  }

  if (!generatedText) {
    generatedText = buildFallbackTouristicDescription(poi, languageCode);
  }

  await storeGeneratedDescription(
    connection,
    existing?.poiId,
    languageCode,
    generatedText,
  );

  return {
    ...poi,
    originalDescription: poi.description || null,
    aiDescription: generatedText,
    description: generatedText,
    descriptionSource: existing?.poiId ? "gemini-generated" : "gemini-uncached",
  };
}

export async function enrichRecommendationDescriptions(recommendation, options = {}) {
  if (!recommendation?.route?.length) {
    return recommendation;
  }

  const languageCode = normalizeLanguageCode(
    options.languageCode || recommendation.preferences?.language,
  );
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    const enrichedRoute = [];

    for (const poi of recommendation.route) {
      try {
        enrichedRoute.push(await enrichPoiDescription(connection, poi, languageCode));
      } catch {
        const fallbackText = buildFallbackTouristicDescription(poi, languageCode);

        enrichedRoute.push({
          ...poi,
          originalDescription: poi.description || null,
          aiDescription: fallbackText,
          description: fallbackText,
          descriptionSource: "local-fallback",
        });
      }
    }

    return {
      ...recommendation,
      route: enrichedRoute,
      meta: {
        ...(recommendation.meta || {}),
        descriptionEnrichment: env.gemini.apiKey
          ? "gemini-cache-or-generated"
          : "disabled-no-api-key",
      },
    };
  } finally {
    connection.release();
  }
}

export async function tryEnrichRecommendationDescriptions(recommendation, options = {}) {
  try {
    return await enrichRecommendationDescriptions(recommendation, options);
  } catch {
    return recommendation;
  }
}
