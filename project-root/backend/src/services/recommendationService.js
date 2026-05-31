import { getAllPois } from "./poiDataService.js";
import { spawn } from "node:child_process";
import { env } from "../config/env.js";
import { clamp, haversineDistanceKm } from "../utils/geo.js";
import { toSlug } from "../utils/text.js";
import { tryEnrichRecommendationDescriptions } from "./poiDescriptionService.js";

// Este servicio tiene dos responsabilidades:
// 1. Mantener endpoints auxiliares de POIs/categorias usados por la web.
// 2. Conectar /api/recommend-route con el motor Python del recomendador hibrido.
//
// La heuristica antigua de Node se conserva al final del archivo como respaldo
// historico, pero recommendRoute() ya usa el modelo hibrido real.

function normalizeArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function enrichCandidate(poi, startLocation) {
  return {
    ...poi,
    distanceFromStartKm: haversineDistanceKm(startLocation, {
      lat: poi.latitude,
      lng: poi.longitude,
    }),
  };
}

function scoreCandidate(candidate, maxDistanceKm) {
  const ratingScore = candidate.rating ? candidate.rating / 5 : 0.6;
  const baseScore = candidate.score ? clamp(candidate.score / 5, 0, 1) : ratingScore;
  const proximityScore = maxDistanceKm
    ? clamp(1 - candidate.distanceFromStartKm / maxDistanceKm, 0, 1)
    : clamp(1 - candidate.distanceFromStartKm / 10, 0, 1);
  const confidenceScore = candidate.matchConfidence
    ? clamp(candidate.matchConfidence, 0, 1)
    : 0.45;

  return ratingScore * 0.35 + baseScore * 0.35 + proximityScore * 0.2 + confidenceScore * 0.1;
}

function buildGreedyRoute(candidates, startLocation, maxDistanceKm, maxPois, availableTimeMinutes) {
  const route = [];
  const remaining = [...candidates];
  let currentPoint = { ...startLocation };
  let totalDistanceKm = 0;
  let totalVisitMinutes = 0;

  while (remaining.length && route.length < maxPois) {
    let nextIndex = -1;
    let bestUtility = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const travelDistanceKm = haversineDistanceKm(currentPoint, {
        lat: candidate.latitude,
        lng: candidate.longitude,
      });
      const projectedDistanceKm =
        totalDistanceKm +
        travelDistanceKm +
        haversineDistanceKm(
          { lat: candidate.latitude, lng: candidate.longitude },
          startLocation,
        );
      const visitMinutes = candidate.visitDuration || 45;
      const projectedMinutes = totalVisitMinutes + visitMinutes;

      if (
        projectedDistanceKm > maxDistanceKm ||
        projectedMinutes > availableTimeMinutes
      ) {
        continue;
      }

      const utility = candidate.relevanceScore * 0.65 + (1 / (travelDistanceKm + 0.2)) * 0.35;

      if (utility > bestUtility) {
        bestUtility = utility;
        nextIndex = index;
      }
    }

    if (nextIndex === -1) {
      break;
    }

    const [nextPoi] = remaining.splice(nextIndex, 1);
    const legDistanceKm = haversineDistanceKm(currentPoint, {
      lat: nextPoi.latitude,
      lng: nextPoi.longitude,
    });

    totalDistanceKm += legDistanceKm;
    totalVisitMinutes += nextPoi.visitDuration || 45;
    currentPoint = { lat: nextPoi.latitude, lng: nextPoi.longitude };

    route.push({
      ...nextPoi,
      routePosition: route.length + 1,
      distanceFromPreviousKm: legDistanceKm,
    });
  }

  const returnToStartKm = route.length
    ? haversineDistanceKm(currentPoint, startLocation)
    : 0;

  return {
    route,
    totalDistanceKm: totalDistanceKm + returnToStartKm,
    totalVisitMinutes,
    returnToStartKm,
  };
}

function buildFallbackRoute(candidates, startLocation, maxPois, availableTimeMinutes) {
  const route = [];
  const remaining = [...candidates];
  let currentPoint = { ...startLocation };
  let totalDistanceKm = 0;
  let totalVisitMinutes = 0;

  while (remaining.length && route.length < maxPois) {
    let nextIndex = -1;
    let bestUtility = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const travelDistanceKm = haversineDistanceKm(currentPoint, {
        lat: candidate.latitude,
        lng: candidate.longitude,
      });
      const visitMinutes = candidate.visitDuration || 45;

      if (totalVisitMinutes + visitMinutes > availableTimeMinutes) {
        continue;
      }

      const utility = candidate.relevanceScore * 0.7 + (1 / (travelDistanceKm + 0.2)) * 0.3;

      if (utility > bestUtility) {
        bestUtility = utility;
        nextIndex = index;
      }
    }

    if (nextIndex === -1) {
      break;
    }

    const [nextPoi] = remaining.splice(nextIndex, 1);
    const legDistanceKm = haversineDistanceKm(currentPoint, {
      lat: nextPoi.latitude,
      lng: nextPoi.longitude,
    });

    totalDistanceKm += legDistanceKm;
    totalVisitMinutes += nextPoi.visitDuration || 45;
    currentPoint = { lat: nextPoi.latitude, lng: nextPoi.longitude };

    route.push({
      ...nextPoi,
      routePosition: route.length + 1,
      distanceFromPreviousKm: legDistanceKm,
    });
  }

  const returnToStartKm = route.length
    ? haversineDistanceKm(currentPoint, startLocation)
    : 0;

  return {
    route,
    totalDistanceKm: totalDistanceKm + returnToStartKm,
    totalVisitMinutes,
    returnToStartKm,
  };
}

function buildGenerationNotes({
  requestedPois,
  returnedPois,
  candidatePool,
  maxDistanceKm,
  availableTimeMinutes,
  filtersApplied,
  usedFallback,
}) {
  const notes = [
    "Filtered by category, subcategory, rating and distance from the start point.",
    "Ranked by score, rating, confidence and proximity.",
    "Ordered with a greedy route heuristic constrained by distance and visit time.",
  ];

  if (usedFallback) {
    notes.push(
      "A softer fallback route builder was used to approach the requested number of POIs when the strict route was too short.",
    );
  }

  if (returnedPois < requestedPois) {
    notes.push(
      `Requested ${requestedPois} POIs, but only ${returnedPois} fit the current filters, time budget (${availableTimeMinutes} min) and distance budget (${maxDistanceKm} km).`,
    );
  }

  if (!candidatePool) {
    notes.push(`No candidates remained after applying filters: ${filtersApplied.join(", ") || "none"}.`);
  }

  return notes;
}

export async function getFilteredPois({
  category,
  subcategory,
  q,
  minRating,
  neighborhoodZone,
  limit,
}) {
  const pois = await getAllPois();
  const categorySlug = category ? toSlug(category) : null;
  const subcategorySlug = subcategory ? toSlug(subcategory) : null;
  const query = q ? toSlug(q) : null;
  const minRatingValue = Number(minRating || 0);

  let filtered = pois;

  if (categorySlug) {
    filtered = filtered.filter((poi) => poi.categorySlug === categorySlug);
  }

  if (subcategorySlug) {
    filtered = filtered.filter((poi) => poi.subcategorySlug === subcategorySlug);
  }

  if (neighborhoodZone) {
    filtered = filtered.filter((poi) => poi.neighborhoodZone === neighborhoodZone);
  }

  if (Number.isFinite(minRatingValue) && minRatingValue > 0) {
    filtered = filtered.filter((poi) => poi.rating === null || poi.rating >= minRatingValue);
  }

  if (query) {
    filtered = filtered.filter((poi) => {
      const searchableText = toSlug([
        poi.name,
        poi.category,
        poi.subcategory,
        poi.description,
        poi.tags,
        poi.neighborhoodZone,
      ].join(" "));

      return searchableText.includes(query);
    });
  }

  return filtered.slice(0, limit || 200);
}

function runHybridRecommender(preferences) {
  // Ejecuta el script Python productivo del recomendador hibrido.
  //
  // Node no calcula TF-IDF ni rutas directamente. Su papel aqui es actuar como
  // puente: recibe el JSON del frontend, lo manda al proceso Python por stdin y
  // devuelve al frontend el JSON que Python escribe por stdout.
  return new Promise((resolve, reject) => {
    // env.pythonBin apunta al Python del entorno con pandas/scikit-learn.
    // env.hybridRecommenderPath apunta a ml_service/recommend_route.py.
    const child = spawn(env.pythonBin, [env.hybridRecommenderPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Acumulamos stdout y stderr porque los procesos hijos entregan datos en chunks.
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      // Error al lanzar el proceso, por ejemplo Python no encontrado.
      reject(error);
    });

    child.on("close", (code) => {
      // Cuando Python termina, intentamos parsear su stdout como JSON.
      let payload = {};

      try {
        payload = JSON.parse(stdout || "{}");
      } catch {
        const parseError = new Error("The hybrid recommender returned invalid JSON.");
        parseError.statusCode = 500;
        parseError.details = stdout;
        reject(parseError);
        return;
      }

      if (code !== 0 || payload.error) {
        // Si Python sale con codigo != 0 o devuelve { error }, lo convertimos
        // en error HTTP para que Express responda correctamente.
        const errorMessage = payload.error?.message || stderr || "Hybrid recommender failed.";
        const recommenderError = new Error(
          errorMessage,
        );
        recommenderError.statusCode = [
          "Invalid start location.",
          "MIN_POIS_GREATER_THAN_MAX_POIS",
          "MIN_POIS_NOT_REACHED",
        ].includes(errorMessage)
          ? 400
          : 500;
        recommenderError.details = {
          code,
          stderr,
          type: payload.error?.type,
        };
        reject(recommenderError);
        return;
      }

      resolve({
        // Aniadimos timestamp en Node para indicar cuando se genero la respuesta API.
        ...payload,
        summary: {
          ...payload.summary,
          generatedAt: new Date().toISOString(),
        },
      });
    });

    // Enviamos al motor Python exactamente las preferencias recibidas de React.
    child.stdin.write(JSON.stringify(preferences || {}));
    child.stdin.end();
  });
}

export async function recommendRoute(preferences) {
  // Funcion usada por recommendationController.js.
  // Mantiene el mismo contrato de API, pero ahora delega en Python.
  const recommendation = await runHybridRecommender(preferences);

  return tryEnrichRecommendationDescriptions(recommendation, {
    languageCode: preferences.language,
  });
}

export async function recommendRouteWithTemporaryHeuristic(preferences) {
  // Implementacion anterior en Node.js. Se deja como referencia/backup para
  // comparar el sistema temporal con el sistema hibrido final.
  const pois = await getAllPois();
  const categories = normalizeArray(preferences.categories).map(toSlug);
  const subcategories = normalizeArray(preferences.subcategories).map(toSlug);
  const minRating = Number(preferences.minRating || 0);
  const maxPois = clamp(Number(preferences.maxPois || 6), 1, 12);
  const maxDistanceKm = clamp(Number(preferences.maxDistanceKm || 6), 1, 30);
  const availableTimeMinutes = clamp(
    Number(preferences.availableTimeMinutes || 8 * 60),
    30,
    12 * 60,
  );
  const startLocation = {
    lat: Number(preferences.startLocation?.lat),
    lng: Number(preferences.startLocation?.lng),
  };

  if (!Number.isFinite(startLocation.lat) || !Number.isFinite(startLocation.lng)) {
    const error = new Error("Invalid start location.");
    error.statusCode = 400;
    throw error;
  }

  let filtered = pois.filter((poi) => poi.rating === null || poi.rating >= minRating);

  if (categories.length) {
    filtered = filtered.filter((poi) => categories.includes(poi.categorySlug));
  }

  if (subcategories.length) {
    filtered = filtered.filter((poi) => subcategories.includes(poi.subcategorySlug));
  }

  const filtersApplied = [];

  if (categories.length) {
    filtersApplied.push(`categories=${categories.join("|")}`);
  }

  if (subcategories.length) {
    filtersApplied.push(`subcategories=${subcategories.join("|")}`);
  }

  if (minRating > 0) {
    filtersApplied.push(`minRating=${minRating}`);
  }

  filtersApplied.push(`maxDistanceKm=${maxDistanceKm}`);
  filtersApplied.push(`availableTimeMinutes=${availableTimeMinutes}`);

  const enriched = filtered
    .map((poi) => enrichCandidate(poi, startLocation))
    .filter((poi) => poi.distanceFromStartKm <= maxDistanceKm)
    .map((poi) => ({
      ...poi,
      relevanceScore: scoreCandidate(poi, maxDistanceKm),
    }))
    .sort((left, right) => right.relevanceScore - left.relevanceScore);

  const shortlist = enriched.slice(0, Math.max(maxPois * 4, maxPois));
  const strictRouteResult = buildGreedyRoute(
    shortlist,
    startLocation,
    maxDistanceKm,
    maxPois,
    availableTimeMinutes,
  );
  const fallbackRouteResult =
    strictRouteResult.route.length < maxPois
      ? buildFallbackRoute(shortlist, startLocation, maxPois, availableTimeMinutes)
      : strictRouteResult;

  const routeResult =
    fallbackRouteResult.route.length > strictRouteResult.route.length
      ? fallbackRouteResult
      : strictRouteResult;
  const usedFallback = routeResult === fallbackRouteResult && routeResult !== strictRouteResult;

  return {
    preferences: {
      startLocation,
      categories,
      subcategories,
      minRating,
      maxPois,
      maxDistanceKm,
      availableTimeMinutes,
    },
    route: routeResult.route,
    summary: {
      totalPois: routeResult.route.length,
      totalDistanceKm: Number(routeResult.totalDistanceKm.toFixed(2)),
      totalVisitMinutes: routeResult.totalVisitMinutes,
      returnToStartKm: Number(routeResult.returnToStartKm.toFixed(2)),
      candidatePool: enriched.length,
      requestedPois: maxPois,
      generatedAt: new Date().toISOString(),
    },
    meta: {
      mode: "node-temporary-heuristic",
      dataset: "pois_barcelona_procesados.csv",
      notes: buildGenerationNotes({
        requestedPois: maxPois,
        returnedPois: routeResult.route.length,
        candidatePool: enriched.length,
        maxDistanceKm,
        availableTimeMinutes,
        filtersApplied,
        usedFallback,
      }),
    },
  };
}
