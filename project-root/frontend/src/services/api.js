let authToken = window.localStorage.getItem("auth-token") || "";

export function setAuthToken(token) {
  authToken = token || "";

  if (authToken) {
    window.localStorage.setItem("auth-token", authToken);
  } else {
    window.localStorage.removeItem("auth-token");
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function fetchHealth() {
  return request("/api/health");
}

export function login(payload) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser() {
  return request("/api/auth/me");
}

export function fetchCategories() {
  return request("/api/categories");
}

export function fetchPois(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return request(`/api/pois${query ? `?${query}` : ""}`);
}

export function recommendRoute(payload) {
  return request("/api/recommend-route", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveRoute(payload) {
  return request("/api/routes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSavedRoute(publicId) {
  return request(`/api/routes/${encodeURIComponent(publicId)}`);
}

export function fetchMyRoutes() {
  return request("/api/routes/my");
}

export function fetchCompanyRoutes(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return request(`/api/company/routes${query ? `?${query}` : ""}`);
}

export function updateCompanyRoute(routeId, payload) {
  return request(`/api/company/routes/${encodeURIComponent(routeId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateCompanyRouteRecommendation(routeId, payload) {
  return request(`/api/company/routes/${encodeURIComponent(routeId)}/recommendation`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCompanyRoute(routeId) {
  return request(`/api/company/routes/${encodeURIComponent(routeId)}`, {
    method: "DELETE",
  });
}

export function fetchCompanyUsers() {
  return request("/api/company/users");
}

export function createCompanyUser(payload) {
  return request("/api/company/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCompanyUser(userId, payload) {
  return request(`/api/company/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateCompanyUserStatus(userId, isActive) {
  return request(`/api/company/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function updateCompanyUserPassword(userId, password) {
  return request(`/api/company/users/${encodeURIComponent(userId)}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export function fetchAdminData() {
  return request("/api/admin");
}

export function createAdminClient(payload) {
  return request("/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createAdminUser(payload) {
  return request("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserStatus(userId, isActive) {
  return request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function updateAdminUserPassword(userId, password) {
  return request(`/api/admin/users/${encodeURIComponent(userId)}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export function fetchAdminRoutes(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return request(`/api/admin/routes${query ? `?${query}` : ""}`);
}

export function updateAdminRoute(routeId, payload) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function duplicateAdminRoute(routeId, payload) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}/duplicate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRoute(routeId) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}`, {
    method: "DELETE",
  });
}

export async function fetchStreetRoute(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return null;
  }

  const coordinates = waypoints
    .map((point) => `${point.lng},${point.lat}`)
    .join(";");

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson&steps=false`,
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.routes?.length) {
    throw new Error("No se pudo calcular la ruta peatonal.");
  }

  const route = data.routes[0];

  return {
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMinutes: Math.round(route.duration / 60),
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    mode: "walking-network",
  };
}
