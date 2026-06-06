import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./components/LoginPage.jsx";
import {
  createAdminClient,
  createAdminUser,
  createCompanyUser,
  deleteAdminRoute,
  deleteCompanyRoute,
  duplicateAdminRoute,
  fetchCategories,
  fetchAdminData,
  fetchAdminRoutes,
  fetchCompanyRoutes,
  fetchCompanyUsers,
  fetchCurrentUser,
  fetchHealth,
  fetchMyRoutes,
  fetchPois,
  fetchSavedRoute,
  fetchStreetRoute,
  login,
  recommendRoute,
  saveRoute,
  setAuthToken,
  updateAdminRoute,
  updateAdminUserPassword,
  updateAdminUserStatus,
  updateCompanyRoute,
  updateCompanyRouteRecommendation,
  updateCompanyUser,
  updateCompanyUserPassword,
  updateCompanyUserStatus,
} from "./services/api.js";
import { translations } from "./i18n/translations.js";

const DEFAULT_START = {
  lat: 41.3874,
  lng: 2.1686,
};

const USER_ROUTES_STORAGE_KEY = "user-saved-routes";
const AUTH_TOKEN_STORAGE_KEY = "auth-token";

function haversineDistanceKm(origin, destination) {
  const radiusKm = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFriendlyErrorMessage(message, t) {
  if (message === "MIN_POIS_NOT_REACHED") {
    return t.errors.minPoisNotReached;
  }

  if (message === "MIN_POIS_GREATER_THAN_MAX_POIS") {
    return t.errors.minPoisGreaterThanMax;
  }

  if (message === "Invalid start location.") {
    return t.errors.invalidLocation;
  }

  if (/Failed to fetch|NetworkError|fetch/i.test(message || "")) {
    return t.errors.network;
  }

  return t.errors.generic;
}

function getInitialPreference(key, fallback) {
  return window.localStorage.getItem(key) || fallback;
}

function getInitialUserRoutes() {
  try {
    return JSON.parse(window.localStorage.getItem(USER_ROUTES_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function App() {
  const [categories, setCategories] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [savedRouteInfo, setSavedRouteInfo] = useState(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [loadingSavedRoute, setLoadingSavedRoute] = useState(false);
  const [appMode, setAppMode] = useState("company");
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [companyMessage, setCompanyMessage] = useState("");
  const [companyUsersLoading, setCompanyUsersLoading] = useState(false);
  const [assignedRoutes, setAssignedRoutes] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyRoutes, setCompanyRoutes] = useState([]);
  const [companyRoutesLoading, setCompanyRoutesLoading] = useState(false);
  const [adminRoutes, setAdminRoutes] = useState([]);
  const [adminRoutesLoading, setAdminRoutesLoading] = useState(false);
  const [selectedAssignedUserId, setSelectedAssignedUserId] = useState("");
  const [userRoutes, setUserRoutes] = useState(getInitialUserRoutes);
  const [catalogPois, setCatalogPois] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [manualPois, setManualPois] = useState([]);
  const [editorConstraints, setEditorConstraints] = useState({
    maxPois: 8,
    maxDistanceKm: 10,
    availableTimeMinutes: 360,
  });
  const [theme, setTheme] = useState(() => getInitialPreference("app-theme", "dark"));
  const [language, setLanguage] = useState(() =>
    getInitialPreference("app-language", "es"),
  );
  const [routeDisplayMode, setRouteDisplayMode] = useState("walking");

  const t = translations[language] || translations.es;

  function getModeFromUser(user) {
    if (user?.role?.code === "admin") {
      return "admin";
    }

    if (user?.role?.code === "user") {
      return "user";
    }

    return "company";
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = t.languageCode;
    window.localStorage.setItem("app-language", language);
  }, [language, t.languageCode]);

  useEffect(() => {
    window.localStorage.setItem(USER_ROUTES_STORAGE_KEY, JSON.stringify(userRoutes));
  }, [userRoutes]);

  useEffect(() => {
    async function restoreSession() {
      if (!window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        setCurrentUser(response.user);
        setAppMode(getModeFromUser(response.user));
      } catch {
        setAuthToken("");
        setCurrentUser(null);
      } finally {
        setCheckingSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [healthResponse, categoriesResponse] = await Promise.all([
          fetchHealth(),
          fetchCategories(),
        ]);
        setHealth(healthResponse);
        setCategories(categoriesResponse.items);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    handleSearchPois({ limit: 40 });
  }, [categories.length]);

  useEffect(() => {
    if (appMode !== "admin" || adminData || !currentUser) {
      return;
    }

    handleLoadAdminData();
  }, [appMode, adminData, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (currentUser.role.code === "client" || currentUser.role.code === "admin") {
      handleLoadCompanyUsers();
    }

    if (currentUser.role.code === "client") {
      handleLoadCompanyRoutes();
    }

    if (currentUser.role.code === "admin") {
      handleLoadAdminRoutes();
    }

    if (currentUser.role.code === "user") {
      handleLoadMyRoutes();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!routeData?.route?.length) {
      return;
    }

    setEditorConstraints({
      maxPois: Number(routeData.summary?.requestedPois || routeData.route.length),
      maxDistanceKm: Math.max(1, Math.ceil(Number(routeData.summary?.totalDistanceKm || 10))),
      availableTimeMinutes: Math.max(
        30,
        Math.ceil(Number(routeData.summary?.totalExperienceMinutes || routeData.summary?.totalVisitMinutes || 360)),
      ),
    });
  }, [routeData?.summary?.generatedAt, routeData?.meta?.mode]);

  function buildWaypoints(response) {
    return [
      response.preferences.startLocation,
      ...response.route.map((poi) => ({
        lat: poi.latitude,
        lng: poi.longitude,
      })),
    ];
  }

  async function buildRouteResponseFromPois({
    pois,
    baseRouteData = null,
    name,
    mode,
    methodology,
    note,
    constraints = {},
  }) {
    const startLocation = baseRouteData?.preferences?.startLocation || {
      lat: pois[0].latitude,
      lng: pois[0].longitude,
    };

    const route = pois.map((poi, index) => {
      const previousPoint =
        index === 0
          ? startLocation
          : {
              lat: pois[index - 1].latitude,
              lng: pois[index - 1].longitude,
            };
      const currentPoint = {
        lat: poi.latitude,
        lng: poi.longitude,
      };

      return {
        ...poi,
        routePosition: index + 1,
        distanceFromStartKm: Number(
          haversineDistanceKm(startLocation, currentPoint).toFixed(3),
        ),
        distanceFromPreviousKm: Number(
          haversineDistanceKm(previousPoint, currentPoint).toFixed(3),
        ),
        hybridCandidateScore: poi.hybridCandidateScore ?? poi.score ?? null,
        similarityScore: poi.similarityScore ?? null,
        qualitySignal: poi.qualitySignal ?? null,
        routeUtility: poi.routeUtility ?? null,
      };
    });
    const totalVisitMinutes = route.reduce(
      (total, poi) => total + Number(poi.visitDuration || poi.visitDurationMinutes || 45),
      0,
    );
    const straightDistanceKm = route.reduce(
      (total, poi) => total + Number(poi.distanceFromPreviousKm || 0),
      0,
    );

    let nextRouteData = {
      ...(baseRouteData || {}),
      name,
      preferences: {
        ...(baseRouteData?.preferences || {}),
        startLocation,
        editorConstraints: constraints,
      },
      candidates: baseRouteData?.candidates || route,
      route,
      summary: {
        ...(baseRouteData?.summary || {}),
        totalPois: route.length,
        requestedPois: constraints.maxPois || route.length,
        totalDistanceKm: Number(straightDistanceKm.toFixed(2)),
        distanceWithoutReturnKm: Number(straightDistanceKm.toFixed(2)),
        totalVisitMinutes,
        totalTravelMinutes: null,
        totalExperienceMinutes: totalVisitMinutes,
      },
      meta: {
        ...(baseRouteData?.meta || {}),
        mode,
        methodology,
        notes: [note, ...(baseRouteData?.meta?.notes || [])],
      },
    };

    if (route.length > 1) {
      try {
        const routeWaypoints = route.map((poi) => ({
          lat: poi.latitude,
          lng: poi.longitude,
        }));
        const firstRoutePoint = routeWaypoints[0];
        const startsAtFirstPoi =
          firstRoutePoint &&
          Math.abs(firstRoutePoint.lat - startLocation.lat) < 0.000001 &&
          Math.abs(firstRoutePoint.lng - startLocation.lng) < 0.000001;
        const streetRoute = await fetchStreetRoute([
          startLocation,
          ...(startsAtFirstPoi ? routeWaypoints.slice(1) : routeWaypoints),
        ]);

        nextRouteData = {
          ...nextRouteData,
          navigation: streetRoute,
          summary: {
            ...nextRouteData.summary,
            totalDistanceKm: streetRoute.distanceKm,
            totalTravelMinutes: streetRoute.durationMinutes,
            totalExperienceMinutes: totalVisitMinutes + streetRoute.durationMinutes,
          },
        };
      } catch {
        nextRouteData = {
          ...nextRouteData,
          navigation: {
            geometry: [startLocation, ...route].map((point) => [
              point.lat ?? point.latitude,
              point.lng ?? point.longitude,
            ]),
            mode: "straight-line-fallback",
          },
        };
      }
    }

    return nextRouteData;
  }

  async function handleSearchPois(filters) {
    setCatalogLoading(true);
    setError("");

    try {
      const response = await fetchPois(filters);
      setCatalogPois(response.items || []);
    } catch (requestError) {
      setError(requestError.message || t.catalog.searchError);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function handleLogin(credentials) {
    setAuthLoading(true);
    setAuthError("");
    setError("");

    try {
      const response = await login(credentials);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setAppMode(getModeFromUser(response.user));
      setAdminData(null);
      setAdminRoutes([]);
      setAssignedRoutes([]);
      setCompanyUsers([]);
      setCompanyRoutes([]);
      setSelectedAssignedUserId("");
      setRouteData(null);
      setSelectedPoi(null);
    } catch (requestError) {
      setAuthError(requestError.message || t.auth.loginError);
      setAuthToken("");
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setAuthToken("");
    setCurrentUser(null);
    setAdminData(null);
    setAdminRoutes([]);
    setAssignedRoutes([]);
    setCompanyUsers([]);
    setCompanyRoutes([]);
    setSelectedAssignedUserId("");
    setRouteData(null);
    setSelectedPoi(null);
    setSavedRouteInfo(null);
  }

  async function handleLoadAdminData() {
    setAdminLoading(true);
    setError("");

    try {
      const data = await fetchAdminData();
      setAdminData(data);
    } catch (requestError) {
      setError(requestError.message || t.admin.loadError);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleCreateAdminClient(payload) {
    setAdminLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await createAdminClient(payload);
      const data = await fetchAdminData();
      setAdminData(data);
      setAdminMessage(t.admin.clients.created);
    } catch (requestError) {
      setError(requestError.message || t.admin.clients.createError);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleCreateAdminUser(payload) {
    setAdminLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await createAdminUser(payload);
      const data = await fetchAdminData();
      setAdminData(data);
      setAdminMessage(t.admin.users.created);
    } catch (requestError) {
      setError(requestError.message || t.admin.users.createError);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleToggleAdminUserStatus(userId, isActive) {
    setAdminLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await updateAdminUserStatus(userId, isActive);
      const data = await fetchAdminData();
      setAdminData(data);
      setAdminMessage(isActive ? t.admin.users.enabled : t.admin.users.disabled);
    } catch (requestError) {
      setError(requestError.message || t.admin.users.statusError);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleUpdateAdminUserPassword(userId, password) {
    setAdminLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await updateAdminUserPassword(userId, password);
      const data = await fetchAdminData();
      setAdminData(data);
      setAdminMessage(t.admin.users.passwordUpdated);
    } catch (requestError) {
      setError(requestError.message || t.admin.users.passwordUpdateError);
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleLoadAdminRoutes(filters = {}) {
    setAdminRoutesLoading(true);
    setError("");

    try {
      const response = await fetchAdminRoutes(filters);
      setAdminRoutes(response.items || []);
    } catch (requestError) {
      setError(requestError.message || t.admin.routes.loadError);
      setAdminRoutes([]);
    } finally {
      setAdminRoutesLoading(false);
    }
  }

  async function handleUpdateAdminRoute(routeId, payload) {
    setAdminRoutesLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await updateAdminRoute(routeId, payload);
      await handleLoadAdminRoutes();
      setAdminMessage(t.admin.routes.updated);
    } catch (requestError) {
      setError(requestError.message || t.admin.routes.updateError);
    } finally {
      setAdminRoutesLoading(false);
    }
  }

  async function handleDuplicateAdminRoute(routeId, payload) {
    setAdminRoutesLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await duplicateAdminRoute(routeId, payload);
      await Promise.all([handleLoadAdminRoutes(), handleLoadAdminData()]);
      setAdminMessage(t.admin.routes.duplicated);
    } catch (requestError) {
      setError(requestError.message || t.admin.routes.duplicateError);
    } finally {
      setAdminRoutesLoading(false);
    }
  }

  async function handleDeleteAdminRoute(routeId) {
    if (!window.confirm(t.admin.routes.deleteConfirm)) {
      return;
    }

    setAdminRoutesLoading(true);
    setAdminMessage("");
    setError("");

    try {
      await deleteAdminRoute(routeId);
      await Promise.all([handleLoadAdminRoutes(), handleLoadAdminData()]);
      setAdminMessage(t.admin.routes.deleted);
    } catch (requestError) {
      setError(requestError.message || t.admin.routes.deleteError);
    } finally {
      setAdminRoutesLoading(false);
    }
  }

  async function handleLoadCompanyUsers() {
    setCompanyUsersLoading(true);

    try {
      const response = await fetchCompanyUsers();
      setCompanyUsers(response.items || []);
    } catch {
      setCompanyUsers([]);
    } finally {
      setCompanyUsersLoading(false);
    }
  }

  async function handleLoadCompanyRoutes(filters = {}) {
    setCompanyRoutesLoading(true);
    setError("");

    try {
      const response = await fetchCompanyRoutes(filters);
      setCompanyRoutes(response.items || []);
    } catch (requestError) {
      setError(requestError.message || t.companyRoutes.loadError);
      setCompanyRoutes([]);
    } finally {
      setCompanyRoutesLoading(false);
    }
  }

  async function handleUpdateCompanyRoute(routeId, payload) {
    setCompanyRoutesLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await updateCompanyRoute(routeId, payload);
      await handleLoadCompanyRoutes();
      setCompanyMessage(t.companyRoutes.updated);
    } catch (requestError) {
      setError(requestError.message || t.companyRoutes.updateError);
    } finally {
      setCompanyRoutesLoading(false);
    }
  }

  async function handleDeleteCompanyRoute(routeId) {
    if (!window.confirm(t.companyRoutes.deleteConfirm)) {
      return;
    }

    setCompanyRoutesLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await deleteCompanyRoute(routeId);
      await handleLoadCompanyRoutes();
      setCompanyMessage(t.companyRoutes.deleted);
    } catch (requestError) {
      setError(requestError.message || t.companyRoutes.deleteError);
    } finally {
      setCompanyRoutesLoading(false);
    }
  }

  async function handleCreateCompanyUser(payload) {
    setCompanyUsersLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await createCompanyUser(payload);
      const response = await fetchCompanyUsers();
      setCompanyUsers(response.items || []);
      setCompanyMessage(t.companyUsers.created);
    } catch (requestError) {
      setError(requestError.message || t.companyUsers.createError);
    } finally {
      setCompanyUsersLoading(false);
    }
  }

  async function handleUpdateCompanyUser(userId, payload) {
    setCompanyUsersLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await updateCompanyUser(userId, payload);
      const response = await fetchCompanyUsers();
      setCompanyUsers(response.items || []);
      setCompanyMessage(t.companyUsers.updated);
    } catch (requestError) {
      setError(requestError.message || t.companyUsers.updateError);
    } finally {
      setCompanyUsersLoading(false);
    }
  }

  async function handleToggleCompanyUserStatus(userId, isActive) {
    setCompanyUsersLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await updateCompanyUserStatus(userId, isActive);
      const response = await fetchCompanyUsers();
      setCompanyUsers(response.items || []);
      setCompanyMessage(isActive ? t.companyUsers.enabled : t.companyUsers.disabled);
    } catch (requestError) {
      setError(requestError.message || t.companyUsers.statusError);
    } finally {
      setCompanyUsersLoading(false);
    }
  }

  async function handleUpdateCompanyUserPassword(userId, password) {
    setCompanyUsersLoading(true);
    setCompanyMessage("");
    setError("");

    try {
      await updateCompanyUserPassword(userId, password);
      const response = await fetchCompanyUsers();
      setCompanyUsers(response.items || []);
      setCompanyMessage(t.companyUsers.passwordUpdated);
    } catch (requestError) {
      setError(requestError.message || t.companyUsers.passwordUpdateError);
    } finally {
      setCompanyUsersLoading(false);
    }
  }

  async function handleLoadMyRoutes() {
    setLoadingSavedRoute(true);
    setError("");

    try {
      const response = await fetchMyRoutes();
      setAssignedRoutes(response.items || []);
    } catch (requestError) {
      setError(requestError.message || t.saved.loadError);
      setAssignedRoutes([]);
    } finally {
      setLoadingSavedRoute(false);
    }
  }

  function handleAddManualPoi(poi) {
    setManualPois((currentPois) => {
      if (currentPois.some((item) => item.id === poi.id)) {
        return currentPois;
      }

      return [...currentPois, poi].slice(0, 12);
    });
  }

  function handleRemoveManualPoi(poiId) {
    setManualPois((currentPois) => currentPois.filter((poi) => poi.id !== poiId));
  }

  async function handleBuildManualRoute() {
    if (!manualPois.length) {
      setError(t.catalog.emptyManualRoute);
      return;
    }

    setSubmitting(true);
    setError("");

    const manualResponse = await buildRouteResponseFromPois({
      pois: manualPois,
      name: t.catalog.manualRouteName,
      mode: "manual-catalog-route",
      methodology: "manual_poi_selection",
      note: t.catalog.manualRouteNote,
      constraints: {
        maxPois: manualPois.length,
      },
    });

    setRouteData(manualResponse);
    setSavedRouteInfo(null);
    setSelectedPoi(manualResponse.route[0] || null);
    setSubmitting(false);
  }

  async function handleSubmit(preferences) {
    setSubmitting(true);
    setError("");

    try {
      const response = await recommendRoute({
        ...preferences,
        language,
      });
      const requestedMinimum = Number(preferences.minPois || 0);

      if (requestedMinimum > 0 && response.summary.totalPois < requestedMinimum) {
        throw new Error("MIN_POIS_NOT_REACHED");
      }

      let enrichedResponse = {
        ...response,
        summary: {
          ...response.summary,
          totalTravelMinutes: null,
          totalExperienceMinutes: response.summary.totalVisitMinutes,
        },
      };

      if (response.route.length > 0) {
        const waypoints = buildWaypoints(response);

        try {
          const streetRoute = await fetchStreetRoute(waypoints);

          enrichedResponse = {
            ...enrichedResponse,
            navigation: streetRoute,
            summary: {
              ...enrichedResponse.summary,
              totalDistanceKm: streetRoute.distanceKm,
              totalTravelMinutes: streetRoute.durationMinutes,
              totalExperienceMinutes:
                enrichedResponse.summary.totalVisitMinutes + streetRoute.durationMinutes,
            },
            meta: {
              ...enrichedResponse.meta,
              notes: [
                "La distancia y el trazado del mapa se calculan sobre red viaria peatonal.",
                ...(enrichedResponse.meta?.notes || []),
              ],
            },
          };
        } catch {
          enrichedResponse = {
            ...enrichedResponse,
            navigation: {
              geometry: waypoints.map((point) => [point.lat, point.lng]),
              mode: "straight-line-fallback",
            },
            summary: {
              ...enrichedResponse.summary,
              totalTravelMinutes: null,
              totalExperienceMinutes: enrichedResponse.summary.totalVisitMinutes,
            },
            meta: {
              ...enrichedResponse.meta,
              notes: [
                "No se pudo recuperar la ruta callejeando y se muestra trazado directo como respaldo.",
                ...(enrichedResponse.meta?.notes || []),
              ],
            },
          };
        }
      }

      setRouteData(enrichedResponse);
      setSavedRouteInfo(null);
      setSelectedPoi(enrichedResponse.route[0] || null);
    } catch (requestError) {
      setError(getFriendlyErrorMessage(requestError.message, t));
      setRouteData(null);
      setSelectedPoi(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveRoute() {
    if (!routeData?.route?.length) {
      setError(t.saved.noRouteToSave);
      return;
    }

    setSavingRoute(true);
    setError("");

    try {
      const saved = await saveRoute({
        name: `${t.saved.defaultRouteName} ${new Date().toLocaleString()}`,
        recommendation: routeData,
        navigation: routeData.navigation || null,
        createdByUserId: currentUser?.id,
        clientId: currentUser?.client?.id,
        assignedToUserId: selectedAssignedUserId || null,
      });
      setSavedRouteInfo(saved);
      if (currentUser?.role?.code === "client") {
        handleLoadCompanyRoutes();
      }
      if (currentUser?.role?.code === "admin") {
        handleLoadAdminRoutes();
      }
    } catch (requestError) {
      setError(requestError.message || t.saved.saveError);
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleUpdateLoadedRoute() {
    if (!routeData?.route?.length || !savedRouteInfo?.routeId) {
      setError(t.saved.noLoadedEditableRoute);
      return;
    }

    setSavingRoute(true);
    setError("");
    setCompanyMessage("");

    try {
      const updated = await updateCompanyRouteRecommendation(savedRouteInfo.routeId, {
        name: routeData.name,
        recommendation: routeData,
        navigation: routeData.navigation || null,
      });
      setSavedRouteInfo({
        ...savedRouteInfo,
        ...updated,
        message: t.saved.updated,
      });
      await handleLoadCompanyRoutes();
      setCompanyMessage(t.saved.updated);
    } catch (requestError) {
      setError(requestError.message || t.saved.updateError);
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleLoadSavedRoute(publicId) {
    setLoadingSavedRoute(true);
    setError("");
    setSavedRouteInfo(null);

    try {
      const saved = await fetchSavedRoute(publicId);
      const recommendation = saved.recommendation || {};
      const savedSummary = saved.summary || recommendation.summary || {};
      const totalVisitMinutes = savedSummary.totalVisitMinutes ?? saved.totalVisitMinutes ?? 0;
      const totalTravelMinutes = savedSummary.totalTravelMinutes ?? saved.totalTravelMinutes ?? null;
      const loadedRoute = {
        ...recommendation,
        name: saved.name,
        navigation: saved.navigation || recommendation.navigation || null,
        summary: {
          ...savedSummary,
          totalTravelMinutes,
          totalExperienceMinutes:
            savedSummary.totalExperienceMinutes ??
            saved.totalExperienceMinutes ??
            (totalTravelMinutes === null
              ? totalVisitMinutes
              : Number(totalVisitMinutes) + Number(totalTravelMinutes)),
        },
        meta: saved.meta || recommendation.meta || {},
        preferences: saved.preferences || recommendation.preferences || {},
        route: recommendation.route || saved.pois?.map((poi) => poi.poiData || poi) || [],
      };

      setRouteData(loadedRoute);
      setSelectedPoi(loadedRoute.route[0] || null);
      setSavedRouteInfo({
        publicId: saved.publicId,
        routeId: saved.id,
        totalPois: saved.totalPois,
        message: t.saved.loaded,
      });
      if (currentUser?.role?.code === "user") {
        setAppMode("user");
      }
    } catch (requestError) {
      setError(requestError.message || t.saved.loadError);
      setRouteData(null);
      setSelectedPoi(null);
    } finally {
      setLoadingSavedRoute(false);
    }
  }

  function handleSaveUserRoute() {
    if (!routeData?.route?.length || !savedRouteInfo?.publicId) {
      setError(t.userRoutes.noLoadedRoute);
      return;
    }

    const routeName = routeData.name || `${t.userRoutes.defaultName} ${userRoutes.length + 1}`;
    const newItem = {
      publicId: savedRouteInfo.publicId,
      name: routeName,
      totalPois: routeData.summary?.totalPois || routeData.route.length,
      savedAt: new Date().toISOString(),
    };

    setUserRoutes((currentRoutes) => {
      const withoutDuplicate = currentRoutes.filter(
        (route) => route.publicId !== newItem.publicId,
      );
      return [newItem, ...withoutDuplicate].slice(0, 12);
    });
  }

  function handleRemoveUserRoute(publicId) {
    setUserRoutes((currentRoutes) =>
      currentRoutes.filter((route) => route.publicId !== publicId),
    );
  }

  function handleEditorConstraintChange(name, value) {
    setEditorConstraints((current) => ({
      ...current,
      [name]: Number(value),
    }));
  }

  async function applyEditedRoute(nextPois) {
    if (!nextPois.length) {
      setRouteData(null);
      setSelectedPoi(null);
      setSavedRouteInfo(null);
      return;
    }

    const editedRoute = await buildRouteResponseFromPois({
      pois: nextPois,
      baseRouteData: routeData,
      name: routeData?.name || t.editor.editedRouteName,
      mode: "edited-company-route",
      methodology: "company_route_editor",
      note: t.editor.editedRouteNote,
      constraints: editorConstraints,
    });

    setRouteData(editedRoute);
    setSelectedPoi(editedRoute.route[0] || null);
  }

  async function handleEditorRemovePoi(poiId) {
    await applyEditedRoute((routeData?.route || []).filter((poi) => poi.id !== poiId));
  }

  async function handleEditorMovePoi(poiId, direction) {
    const route = [...(routeData?.route || [])];
    const index = route.findIndex((poi) => poi.id === poiId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= route.length) {
      return;
    }

    [route[index], route[nextIndex]] = [route[nextIndex], route[index]];
    await applyEditedRoute(route);
  }

  async function handleEditorAddPoi(poi) {
    const currentRoute = routeData?.route || [];

    if (currentRoute.some((item) => item.id === poi.id)) {
      return;
    }

    if (currentRoute.length >= Number(editorConstraints.maxPois || currentRoute.length)) {
      setError(t.editor.maxPoisReached);
      return;
    }

    await applyEditedRoute([...currentRoute, poi]);
  }

  if (checkingSession) {
    return (
      <main className="login-page">
        <section className="panel login-shell">
          <p>{t.auth.checkingSession}</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        error={authError}
        language={language}
        loading={authLoading}
        onLanguageChange={setLanguage}
        onLogin={handleLogin}
        onThemeChange={setTheme}
        t={t}
        theme={theme}
      />
    );
  }

  return (
    <HomePage
      adminData={adminData}
      adminLoading={adminLoading}
      adminMessage={adminMessage}
      adminRoutes={adminRoutes}
      adminRoutesLoading={adminRoutesLoading}
      assignedRoutes={assignedRoutes}
      categories={categories}
      catalogLoading={catalogLoading}
      catalogPois={catalogPois}
      companyMessage={companyMessage}
      companyRoutes={companyRoutes}
      companyRoutesLoading={companyRoutesLoading}
      companyUsers={companyUsers}
      companyUsersLoading={companyUsersLoading}
      defaultStart={DEFAULT_START}
      error={error}
      health={health}
      language={language}
      loading={loading}
      loadingSavedRoute={loadingSavedRoute}
      appMode={appMode}
      currentUser={currentUser}
      onAppModeChange={setAppMode}
      onCreateAdminClient={handleCreateAdminClient}
      onCreateAdminUser={handleCreateAdminUser}
      onCreateCompanyUser={handleCreateCompanyUser}
      onDeleteAdminRoute={handleDeleteAdminRoute}
      onDeleteCompanyRoute={handleDeleteCompanyRoute}
      onDuplicateAdminRoute={handleDuplicateAdminRoute}
      onLanguageChange={setLanguage}
      onLoadAdminData={handleLoadAdminData}
      onLoadAdminRoutes={handleLoadAdminRoutes}
      onLoadCompanyRoutes={handleLoadCompanyRoutes}
      onLoadMyRoutes={handleLoadMyRoutes}
      onLoadCompanyUsers={handleLoadCompanyUsers}
      onLoadSavedRoute={handleLoadSavedRoute}
      onManualPoiAdd={handleAddManualPoi}
      onManualPoiRemove={handleRemoveManualPoi}
      onPoiSelect={setSelectedPoi}
      onRemoveUserRoute={handleRemoveUserRoute}
      onEditorAddPoi={handleEditorAddPoi}
      onEditorConstraintChange={handleEditorConstraintChange}
      onEditorMovePoi={handleEditorMovePoi}
      onEditorRemovePoi={handleEditorRemovePoi}
      onRouteDisplayModeChange={setRouteDisplayMode}
      onSearchPois={handleSearchPois}
      onSaveUserRoute={handleSaveUserRoute}
      onAssignedUserChange={setSelectedAssignedUserId}
      onSaveRoute={handleSaveRoute}
      onBuildManualRoute={handleBuildManualRoute}
      onSubmit={handleSubmit}
      onThemeChange={setTheme}
      onToggleAdminUserStatus={handleToggleAdminUserStatus}
      onToggleCompanyUserStatus={handleToggleCompanyUserStatus}
      onUpdateAdminUserPassword={handleUpdateAdminUserPassword}
      onUpdateAdminRoute={handleUpdateAdminRoute}
      onUpdateCompanyRoute={handleUpdateCompanyRoute}
      onUpdateCompanyUser={handleUpdateCompanyUser}
      onUpdateCompanyUserPassword={handleUpdateCompanyUserPassword}
      onUpdateLoadedRoute={handleUpdateLoadedRoute}
      onLogout={handleLogout}
      routeData={routeData}
      routeDisplayMode={routeDisplayMode}
      selectedAssignedUserId={selectedAssignedUserId}
      manualPois={manualPois}
      editorConstraints={editorConstraints}
      userRoutes={userRoutes}
      savedRouteInfo={savedRouteInfo}
      selectedPoi={selectedPoi}
      savingRoute={savingRoute}
      submitting={submitting}
      t={t}
      theme={theme}
    />
  );
}
