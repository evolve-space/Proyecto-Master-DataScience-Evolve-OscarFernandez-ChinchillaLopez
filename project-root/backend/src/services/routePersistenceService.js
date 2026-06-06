import { randomUUID } from "node:crypto";
import { getDbPool, withTransaction } from "./db.js";

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function parseJsonValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function intOrNull(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecommendationFromBody(body) {
  return body.recommendation || body.result || body;
}

function getStartLocation(recommendation) {
  const startLocation = recommendation.preferences?.startLocation;
  const lat = numberOrNull(startLocation?.lat);
  const lng = numberOrNull(startLocation?.lng);

  if (lat === null || lng === null) {
    const error = new Error("No se puede guardar la ruta porque falta la ubicacion inicial.");
    error.statusCode = 400;
    throw error;
  }

  return { lat, lng };
}

function validateRecommendation(recommendation) {
  if (!recommendation || typeof recommendation !== "object") {
    const error = new Error("No se ha recibido una ruta valida para guardar.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(recommendation.route) || recommendation.route.length === 0) {
    const error = new Error("No se puede guardar una ruta sin POIs.");
    error.statusCode = 400;
    throw error;
  }
}

function buildRouteName(body, recommendation) {
  if (body.name && String(body.name).trim()) {
    return String(body.name).trim();
  }

  const totalPois = recommendation.summary?.totalPois || recommendation.route?.length || 0;
  return `Ruta Barcelona - ${totalPois} POIs`;
}

function assertValidRouteId(routeId) {
  const parsedRouteId = intOrNull(routeId);

  if (!parsedRouteId) {
    const error = new Error("Ruta no valida.");
    error.statusCode = 400;
    throw error;
  }

  return parsedRouteId;
}

function getClientIdForScope(currentUser, explicitClientId = null) {
  if (currentUser?.role?.code === "client") {
    return currentUser.client?.id || null;
  }

  return intOrNull(explicitClientId);
}

async function getRouteOwnership(connection, routeId) {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        public_id AS publicId,
        client_id AS clientId,
        assigned_to_user_id AS assignedToUserId
      FROM routes
      WHERE id = :routeId
      LIMIT 1
    `,
    { routeId },
  );

  if (!rows.length) {
    const error = new Error("Ruta guardada no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

function assertCompanyCanManageRoute(route, currentUser) {
  if (
    currentUser?.role?.code === "client" &&
    Number(route.clientId) !== Number(currentUser.client?.id)
  ) {
    const error = new Error("No puedes gestionar rutas de otra empresa.");
    error.statusCode = 403;
    throw error;
  }
}

function buildRouteListWhere({ scope, currentUser, filters = {} }) {
  const clauses = [];
  const params = {};

  if (scope === "company") {
    clauses.push("rt.client_id = :clientId");
    params.clientId = currentUser.client?.id || null;
  } else if (filters.clientId) {
    clauses.push("rt.client_id = :clientId");
    params.clientId = intOrNull(filters.clientId);
  }

  if (filters.assignedToUserId) {
    clauses.push("rt.assigned_to_user_id = :assignedToUserId");
    params.assignedToUserId = intOrNull(filters.assignedToUserId);
  }

  if (filters.q) {
    clauses.push(
      "(rt.name LIKE :query OR rt.public_id LIKE :query OR c.name LIKE :query OR u.name LIKE :query OR u.email LIKE :query)",
    );
    params.query = `%${String(filters.q).trim()}%`;
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

async function getRouteList(scope, currentUser, filters = {}) {
  const pool = getDbPool();
  const { where, params } = buildRouteListWhere({ scope, currentUser, filters });
  const [rows] = await pool.execute(
    `
      SELECT
        rt.id,
        rt.public_id AS publicId,
        rt.name,
        rt.status,
        rt.generation_mode AS generationMode,
        rt.client_id AS clientId,
        c.name AS clientName,
        rt.assigned_to_user_id AS assignedToUserId,
        u.name AS assignedUserName,
        u.email AS assignedUserEmail,
        rt.total_pois AS totalPois,
        rt.requested_pois AS requestedPois,
        rt.total_distance_km AS totalDistanceKm,
        rt.total_visit_minutes AS totalVisitMinutes,
        rt.total_travel_minutes AS totalTravelMinutes,
        rt.total_experience_minutes AS totalExperienceMinutes,
        rt.created_at AS createdAt,
        rt.updated_at AS updatedAt
      FROM routes rt
      LEFT JOIN clients c ON c.id = rt.client_id
      LEFT JOIN users u ON u.id = rt.assigned_to_user_id
      ${where}
      ORDER BY rt.updated_at DESC, rt.id DESC
      LIMIT 300
    `,
    params,
  );

  return rows;
}

async function insertRoutePois(connection, routeId, route) {
  const sql = `
    INSERT INTO route_pois (
      route_id,
      poi_id,
      poi_source_id,
      route_position,
      name_snapshot,
      category_snapshot,
      subcategory_snapshot,
      latitude_snapshot,
      longitude_snapshot,
      visit_duration_minutes,
      distance_from_start_km,
      distance_from_previous_km,
      hybrid_candidate_score,
      similarity_score,
      quality_signal,
      route_utility,
      poi_data_json
    )
    VALUES (
      :routeId,
      (SELECT id FROM pois WHERE poi_source_id = :poiSourceId LIMIT 1),
      :poiSourceId,
      :routePosition,
      :name,
      :category,
      :subcategory,
      :latitude,
      :longitude,
      :visitDurationMinutes,
      :distanceFromStartKm,
      :distanceFromPreviousKm,
      :hybridCandidateScore,
      :similarityScore,
      :qualitySignal,
      :routeUtility,
      CAST(:poiDataJson AS JSON)
    )
  `;

  for (const [index, poi] of route.entries()) {
    const poiSourceId = String(poi.id ?? poi.poiSourceId ?? "");

    if (!poiSourceId) {
      continue;
    }

    await connection.execute(sql, {
      routeId,
      poiSourceId,
      routePosition: intOrNull(poi.routePosition) || index + 1,
      name: poi.name || "POI sin nombre",
      category: poi.category || null,
      subcategory: poi.subcategory || null,
      latitude: numberOrNull(poi.latitude),
      longitude: numberOrNull(poi.longitude),
      visitDurationMinutes: numberOrNull(poi.visitDuration),
      distanceFromStartKm: numberOrNull(poi.distanceFromStartKm),
      distanceFromPreviousKm: numberOrNull(poi.distanceFromPreviousKm),
      hybridCandidateScore: numberOrNull(poi.hybridCandidateScore),
      similarityScore: numberOrNull(poi.similarityScore),
      qualitySignal: numberOrNull(poi.qualitySignal),
      routeUtility: numberOrNull(poi.routeUtility),
      poiDataJson: toJson(poi),
    });
  }
}

async function validateAssignedUser(connection, assignedToUserId, currentUser) {
  const parsedAssignedToUserId = intOrNull(assignedToUserId);

  if (!parsedAssignedToUserId) {
    return null;
  }

  const [rows] = await connection.execute(
    `
      SELECT u.id, u.client_id AS clientId, r.code AS roleCode
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = :userId
        AND u.is_active = TRUE
      LIMIT 1
    `,
    { userId: parsedAssignedToUserId },
  );

  if (!rows.length || rows[0].roleCode !== "user") {
    const error = new Error("El usuario asignado no existe o no es un usuario final activo.");
    error.statusCode = 400;
    throw error;
  }

  if (
    currentUser?.role?.code === "client" &&
    Number(rows[0].clientId) !== Number(currentUser.client?.id)
  ) {
    const error = new Error("No puedes asignar rutas a usuarios de otra empresa.");
    error.statusCode = 403;
    throw error;
  }

  return parsedAssignedToUserId;
}

export async function saveGeneratedRoute(body, currentUser = null) {
  const recommendation = getRecommendationFromBody(body || {});
  validateRecommendation(recommendation);

  const publicId = randomUUID();
  const startLocation = getStartLocation(recommendation);
  const summary = recommendation.summary || {};
  const meta = recommendation.meta || {};
  const navigation = body.navigation || recommendation.navigation || null;
  const totalTravelMinutes = numberOrNull(
    navigation?.durationMinutes || summary.totalTravelMinutes,
  );
  const totalVisitMinutes = numberOrNull(summary.totalVisitMinutes);
  const totalExperienceMinutes =
    totalVisitMinutes !== null && totalTravelMinutes !== null
      ? totalVisitMinutes + totalTravelMinutes
      : null;

  return withTransaction(async (connection) => {
    const assignedToUserId = await validateAssignedUser(
      connection,
      body.assignedToUserId,
      currentUser,
    );
    const createdByUserId = currentUser?.id || intOrNull(body.createdByUserId);
    const clientId =
      currentUser?.role?.code === "client"
        ? currentUser.client?.id
        : intOrNull(body.clientId || currentUser?.client?.id);

    const [routeResult] = await connection.execute(
      `
        INSERT INTO routes (
          public_id,
          name,
          status,
          generation_mode,
          created_by_user_id,
          assigned_to_user_id,
          client_id,
          start_latitude,
          start_longitude,
          total_pois,
          requested_pois,
          total_distance_km,
          total_visit_minutes,
          total_travel_minutes,
          total_experience_minutes,
          avg_candidate_score,
          avg_similarity_score,
          preferences_json,
          summary_json,
          route_json,
          navigation_json,
          model_meta_json
        )
        VALUES (
          :publicId,
          :name,
          'generated',
          :generationMode,
          :createdByUserId,
          :assignedToUserId,
          :clientId,
          :startLatitude,
          :startLongitude,
          :totalPois,
          :requestedPois,
          :totalDistanceKm,
          :totalVisitMinutes,
          :totalTravelMinutes,
          :totalExperienceMinutes,
          :avgCandidateScore,
          :avgSimilarityScore,
          CAST(:preferencesJson AS JSON),
          CAST(:summaryJson AS JSON),
          CAST(:routeJson AS JSON),
          CAST(:navigationJson AS JSON),
          CAST(:modelMetaJson AS JSON)
        )
      `,
      {
        publicId,
        name: buildRouteName(body, recommendation),
        generationMode: meta.mode || "python-hybrid-recommender",
        createdByUserId,
        assignedToUserId,
        clientId,
        startLatitude: startLocation.lat,
        startLongitude: startLocation.lng,
        totalPois: intOrNull(summary.totalPois) || recommendation.route.length,
        requestedPois: intOrNull(summary.requestedPois || recommendation.preferences?.maxPois),
        totalDistanceKm: numberOrNull(summary.totalDistanceKm),
        totalVisitMinutes,
        totalTravelMinutes,
        totalExperienceMinutes,
        avgCandidateScore: numberOrNull(summary.avgCandidateScore),
        avgSimilarityScore: numberOrNull(summary.avgSimilarityScore),
        preferencesJson: toJson(recommendation.preferences || {}),
        summaryJson: toJson(summary),
        routeJson: toJson(recommendation),
        navigationJson: toJson(navigation),
        modelMetaJson: toJson(meta),
      },
    );

    const routeId = routeResult.insertId;
    await insertRoutePois(connection, routeId, recommendation.route);

    return {
      publicId,
      routeId,
      totalPois: recommendation.route.length,
      message: "Ruta guardada correctamente.",
    };
  });
}

export async function getRoutesForAdmin(filters = {}) {
  return getRouteList("admin", null, filters);
}

export async function getRoutesForCompany(currentUser, filters = {}) {
  if (!currentUser?.client?.id) {
    const error = new Error("La cuenta de empresa no esta asociada a ninguna empresa.");
    error.statusCode = 400;
    throw error;
  }

  return getRouteList("company", currentUser, filters);
}

export async function updateRouteMetadata(routeId, payload = {}, currentUser = null, options = {}) {
  const parsedRouteId = assertValidRouteId(routeId);
  const nextName = String(payload.name || "").trim();
  const nextClientId = getClientIdForScope(currentUser, payload.clientId);

  return withTransaction(async (connection) => {
    const route = await getRouteOwnership(connection, parsedRouteId);
    const targetClientId = nextClientId || route.clientId;

    if (!options.admin) {
      assertCompanyCanManageRoute(route, currentUser);
    }

    const shouldUpdateAssignedUser = Object.hasOwn(payload, "assignedToUserId");
    const assignedToUserId = shouldUpdateAssignedUser
      ? await validateAssignedUser(
          connection,
          payload.assignedToUserId,
          options.admin
            ? { role: { code: "admin" }, client: targetClientId ? { id: targetClientId } : null }
            : currentUser,
        )
      : route.assignedToUserId;

    if (assignedToUserId && targetClientId) {
      const [users] = await connection.execute(
        "SELECT client_id AS clientId FROM users WHERE id = :userId LIMIT 1",
        { userId: assignedToUserId },
      );

      if (users.length && Number(users[0].clientId) !== Number(targetClientId)) {
        const error = new Error("El usuario asignado debe pertenecer a la empresa seleccionada.");
        error.statusCode = 400;
        throw error;
      }
    }

    await connection.execute(
      `
        UPDATE routes
        SET
          name = COALESCE(:name, name),
          client_id = COALESCE(:clientId, client_id),
          assigned_to_user_id = :assignedToUserId
        WHERE id = :routeId
      `,
      {
        routeId: parsedRouteId,
        name: nextName || null,
        clientId: nextClientId,
        assignedToUserId,
      },
    );

    const [updatedRows] = await connection.execute(
      `
        SELECT
          id,
          public_id AS publicId,
          name,
          client_id AS clientId,
          assigned_to_user_id AS assignedToUserId,
          updated_at AS updatedAt
        FROM routes
        WHERE id = :routeId
      `,
      { routeId: parsedRouteId },
    );

    return updatedRows[0];
  });
}

export async function deleteSavedRoute(routeId, currentUser = null, options = {}) {
  const parsedRouteId = assertValidRouteId(routeId);

  return withTransaction(async (connection) => {
    const route = await getRouteOwnership(connection, parsedRouteId);

    if (!options.admin) {
      assertCompanyCanManageRoute(route, currentUser);
    }

    await connection.execute("DELETE FROM routes WHERE id = :routeId", {
      routeId: parsedRouteId,
    });

    return {
      id: parsedRouteId,
      publicId: route.publicId,
      deleted: true,
    };
  });
}

export async function duplicateSavedRoute(routeId, payload = {}, currentUser = null, options = {}) {
  const parsedRouteId = assertValidRouteId(routeId);

  return withTransaction(async (connection) => {
    const sourceRoute = await getRouteOwnership(connection, parsedRouteId);

    if (!options.admin) {
      assertCompanyCanManageRoute(sourceRoute, currentUser);
    }

    const [routes] = await connection.execute(
      "SELECT * FROM routes WHERE id = :routeId LIMIT 1",
      { routeId: parsedRouteId },
    );

    if (!routes.length) {
      const error = new Error("Ruta guardada no encontrada.");
      error.statusCode = 404;
      throw error;
    }

    const source = routes[0];
    const publicId = randomUUID();
    const targetClientId = getClientIdForScope(currentUser, payload.clientId) || source.client_id;
    const assignedToUserId = await validateAssignedUser(
      connection,
      payload.assignedToUserId,
      options.admin
        ? { role: { code: "admin" }, client: targetClientId ? { id: targetClientId } : null }
        : currentUser,
    );
    const name = String(payload.name || "").trim() || `${source.name} (copia)`;

    const [result] = await connection.execute(
      `
        INSERT INTO routes (
          public_id,
          name,
          status,
          generation_mode,
          created_by_user_id,
          assigned_to_user_id,
          client_id,
          start_latitude,
          start_longitude,
          total_pois,
          requested_pois,
          total_distance_km,
          total_visit_minutes,
          total_travel_minutes,
          total_experience_minutes,
          avg_candidate_score,
          avg_similarity_score,
          preferences_json,
          summary_json,
          route_json,
          navigation_json,
          model_meta_json
        )
        VALUES (
          :publicId,
          :name,
          :status,
          :generationMode,
          :createdByUserId,
          :assignedToUserId,
          :clientId,
          :startLatitude,
          :startLongitude,
          :totalPois,
          :requestedPois,
          :totalDistanceKm,
          :totalVisitMinutes,
          :totalTravelMinutes,
          :totalExperienceMinutes,
          :avgCandidateScore,
          :avgSimilarityScore,
          CAST(:preferencesJson AS JSON),
          CAST(:summaryJson AS JSON),
          CAST(:routeJson AS JSON),
          CAST(:navigationJson AS JSON),
          CAST(:modelMetaJson AS JSON)
        )
      `,
      {
        publicId,
        name,
        status: source.status,
        generationMode: source.generation_mode,
        createdByUserId: currentUser?.id || source.created_by_user_id,
        assignedToUserId,
        clientId: targetClientId,
        startLatitude: source.start_latitude,
        startLongitude: source.start_longitude,
        totalPois: source.total_pois,
        requestedPois: source.requested_pois,
        totalDistanceKm: source.total_distance_km,
        totalVisitMinutes: source.total_visit_minutes,
        totalTravelMinutes: source.total_travel_minutes,
        totalExperienceMinutes: source.total_experience_minutes,
        avgCandidateScore: source.avg_candidate_score,
        avgSimilarityScore: source.avg_similarity_score,
        preferencesJson: toJson(parseJsonValue(source.preferences_json)),
        summaryJson: toJson(parseJsonValue(source.summary_json)),
        routeJson: toJson(parseJsonValue(source.route_json)),
        navigationJson: toJson(parseJsonValue(source.navigation_json)),
        modelMetaJson: toJson(parseJsonValue(source.model_meta_json)),
      },
    );

    const [pois] = await connection.execute(
      "SELECT poi_data_json AS poiData FROM route_pois WHERE route_id = :routeId ORDER BY route_position ASC",
      { routeId: parsedRouteId },
    );
    await insertRoutePois(
      connection,
      result.insertId,
      pois.map((poi) => parseJsonValue(poi.poiData)).filter(Boolean),
    );

    return {
      routeId: result.insertId,
      publicId,
      name,
      message: "Ruta duplicada correctamente.",
    };
  });
}

export async function updateSavedRouteRecommendation(routeId, body = {}, currentUser = null) {
  const parsedRouteId = assertValidRouteId(routeId);
  const recommendation = getRecommendationFromBody(body || {});
  validateRecommendation(recommendation);

  const startLocation = getStartLocation(recommendation);
  const summary = recommendation.summary || {};
  const meta = recommendation.meta || {};
  const navigation = body.navigation || recommendation.navigation || null;
  const totalTravelMinutes = numberOrNull(
    navigation?.durationMinutes || summary.totalTravelMinutes,
  );
  const totalVisitMinutes = numberOrNull(summary.totalVisitMinutes);
  const totalExperienceMinutes =
    totalVisitMinutes !== null && totalTravelMinutes !== null
      ? totalVisitMinutes + totalTravelMinutes
      : numberOrNull(summary.totalExperienceMinutes);

  return withTransaction(async (connection) => {
    const route = await getRouteOwnership(connection, parsedRouteId);
    assertCompanyCanManageRoute(route, currentUser);

    await connection.execute(
      `
        UPDATE routes
        SET
          name = COALESCE(:name, name),
          generation_mode = :generationMode,
          start_latitude = :startLatitude,
          start_longitude = :startLongitude,
          total_pois = :totalPois,
          requested_pois = :requestedPois,
          total_distance_km = :totalDistanceKm,
          total_visit_minutes = :totalVisitMinutes,
          total_travel_minutes = :totalTravelMinutes,
          total_experience_minutes = :totalExperienceMinutes,
          avg_candidate_score = :avgCandidateScore,
          avg_similarity_score = :avgSimilarityScore,
          preferences_json = CAST(:preferencesJson AS JSON),
          summary_json = CAST(:summaryJson AS JSON),
          route_json = CAST(:routeJson AS JSON),
          navigation_json = CAST(:navigationJson AS JSON),
          model_meta_json = CAST(:modelMetaJson AS JSON)
        WHERE id = :routeId
      `,
      {
        routeId: parsedRouteId,
        name: String(body.name || recommendation.name || "").trim() || null,
        generationMode: meta.mode || "edited-company-route",
        startLatitude: startLocation.lat,
        startLongitude: startLocation.lng,
        totalPois: recommendation.route.length,
        requestedPois: intOrNull(summary.requestedPois || recommendation.preferences?.maxPois),
        totalDistanceKm: numberOrNull(summary.totalDistanceKm),
        totalVisitMinutes,
        totalTravelMinutes,
        totalExperienceMinutes,
        avgCandidateScore: numberOrNull(summary.avgCandidateScore),
        avgSimilarityScore: numberOrNull(summary.avgSimilarityScore),
        preferencesJson: toJson(recommendation.preferences || {}),
        summaryJson: toJson(summary),
        routeJson: toJson(recommendation),
        navigationJson: toJson(navigation),
        modelMetaJson: toJson(meta),
      },
    );

    await connection.execute("DELETE FROM route_pois WHERE route_id = :routeId", {
      routeId: parsedRouteId,
    });
    await insertRoutePois(connection, parsedRouteId, recommendation.route);

    return {
      routeId: parsedRouteId,
      publicId: route.publicId,
      totalPois: recommendation.route.length,
      message: "Ruta actualizada correctamente.",
    };
  });
}

export async function getSavedRoute(publicId) {
  const pool = getDbPool();

  const [routes] = await pool.execute(
    `
      SELECT
        id,
        public_id AS publicId,
        name,
        status,
        generation_mode AS generationMode,
        start_latitude AS startLatitude,
        start_longitude AS startLongitude,
        total_pois AS totalPois,
        requested_pois AS requestedPois,
        total_distance_km AS totalDistanceKm,
        total_visit_minutes AS totalVisitMinutes,
        total_travel_minutes AS totalTravelMinutes,
        total_experience_minutes AS totalExperienceMinutes,
        avg_candidate_score AS avgCandidateScore,
        avg_similarity_score AS avgSimilarityScore,
        preferences_json AS preferences,
        summary_json AS summary,
        route_json AS recommendation,
        navigation_json AS navigation,
        model_meta_json AS meta,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM routes
      WHERE public_id = :publicId
      LIMIT 1
    `,
    { publicId },
  );

  if (!routes.length) {
    const error = new Error("Ruta guardada no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const savedRoute = routes[0];
  const [pois] = await pool.execute(
    `
      SELECT
        poi_source_id AS poiSourceId,
        route_position AS routePosition,
        name_snapshot AS name,
        category_snapshot AS category,
        subcategory_snapshot AS subcategory,
        latitude_snapshot AS latitude,
        longitude_snapshot AS longitude,
        visit_duration_minutes AS visitDurationMinutes,
        distance_from_start_km AS distanceFromStartKm,
        distance_from_previous_km AS distanceFromPreviousKm,
        hybrid_candidate_score AS hybridCandidateScore,
        similarity_score AS similarityScore,
        quality_signal AS qualitySignal,
        route_utility AS routeUtility,
        poi_data_json AS poiData
      FROM route_pois
      WHERE route_id = :routeId
      ORDER BY route_position ASC
    `,
    { routeId: savedRoute.id },
  );

  return {
    ...savedRoute,
    pois,
  };
}

export async function getAssignedRoutesForUser(userId) {
  const pool = getDbPool();
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        public_id AS publicId,
        name,
        status,
        generation_mode AS generationMode,
        total_pois AS totalPois,
        requested_pois AS requestedPois,
        total_distance_km AS totalDistanceKm,
        total_visit_minutes AS totalVisitMinutes,
        total_travel_minutes AS totalTravelMinutes,
        total_experience_minutes AS totalExperienceMinutes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM routes
      WHERE assigned_to_user_id = :userId
      ORDER BY created_at DESC, id DESC
    `,
    { userId },
  );

  return rows;
}
