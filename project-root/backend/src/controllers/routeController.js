import {
  deleteSavedRoute,
  duplicateSavedRoute,
  getAssignedRoutesForUser,
  getRoutesForAdmin,
  getRoutesForCompany,
  getSavedRoute,
  saveGeneratedRoute,
  updateRouteMetadata,
  updateSavedRouteRecommendation,
} from "../services/routePersistenceService.js";

export async function postSavedRoute(req, res) {
  const savedRoute = await saveGeneratedRoute(req.body || {}, req.user || null);
  res.status(201).json(savedRoute);
}

export async function getRouteByPublicId(req, res) {
  const savedRoute = await getSavedRoute(req.params.publicId);
  res.json(savedRoute);
}

export async function getMyRoutes(req, res) {
  const routes = await getAssignedRoutesForUser(req.user.id);
  res.json({ items: routes });
}

export async function getAdminRoutes(req, res) {
  const routes = await getRoutesForAdmin(req.query || {});
  res.json({ items: routes });
}

export async function patchAdminRoute(req, res) {
  const route = await updateRouteMetadata(req.params.routeId, req.body || {}, req.user, {
    admin: true,
  });
  res.json(route);
}

export async function deleteAdminRoute(req, res) {
  const route = await deleteSavedRoute(req.params.routeId, req.user, { admin: true });
  res.json(route);
}

export async function postAdminRouteDuplicate(req, res) {
  const route = await duplicateSavedRoute(req.params.routeId, req.body || {}, req.user, {
    admin: true,
  });
  res.status(201).json(route);
}

export async function getCompanyRoutes(req, res) {
  const routes = await getRoutesForCompany(req.user, req.query || {});
  res.json({ items: routes });
}

export async function patchCompanyRoute(req, res) {
  const route = await updateRouteMetadata(req.params.routeId, req.body || {}, req.user);
  res.json(route);
}

export async function deleteCompanyRoute(req, res) {
  const route = await deleteSavedRoute(req.params.routeId, req.user);
  res.json(route);
}

export async function putCompanyRouteRecommendation(req, res) {
  const route = await updateSavedRouteRecommendation(req.params.routeId, req.body || {}, req.user);
  res.json(route);
}
