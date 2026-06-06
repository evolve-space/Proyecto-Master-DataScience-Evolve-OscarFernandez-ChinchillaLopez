import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { getCategories, getPois } from "../controllers/poiController.js";
import { postRecommendRoute } from "../controllers/recommendationController.js";
import {
  deleteAdminRoute,
  deleteCompanyRoute,
  getAdminRoutes,
  getCompanyRoutes,
  getMyRoutes,
  getRouteByPublicId,
  patchAdminRoute,
  patchCompanyRoute,
  postAdminRouteDuplicate,
  postSavedRoute,
  putCompanyRouteRecommendation,
} from "../controllers/routeController.js";
import {
  getCompanyUserList,
  patchCompanyUser,
  patchCompanyUserPassword,
  patchCompanyUserStatus,
  postCompanyUser,
} from "../controllers/companyController.js";
import {
  getAdminPanelData,
  patchAdminUserPassword,
  patchAdminUserStatus,
  postAdminClient,
  postAdminUser,
} from "../controllers/adminController.js";
import { getMe, postLogin } from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/health", getHealth);
router.post("/auth/login", asyncHandler(postLogin));
router.get("/auth/me", asyncHandler(requireAuth), asyncHandler(getMe));
router.get("/pois", asyncHandler(getPois));
router.get("/categories", asyncHandler(getCategories));
router.post("/recommend-route", asyncHandler(postRecommendRoute));
router.post(
  "/routes",
  asyncHandler(requireAuth),
  requireRole("admin", "client"),
  asyncHandler(postSavedRoute),
);
router.get("/routes/my", asyncHandler(requireAuth), requireRole("user"), asyncHandler(getMyRoutes));
router.get("/routes/:publicId", asyncHandler(getRouteByPublicId));
router.get(
  "/company/routes",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(getCompanyRoutes),
);
router.patch(
  "/company/routes/:routeId",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(patchCompanyRoute),
);
router.put(
  "/company/routes/:routeId/recommendation",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(putCompanyRouteRecommendation),
);
router.delete(
  "/company/routes/:routeId",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(deleteCompanyRoute),
);
router.get(
  "/company/users",
  asyncHandler(requireAuth),
  requireRole("admin", "client"),
  asyncHandler(getCompanyUserList),
);
router.post(
  "/company/users",
  asyncHandler(requireAuth),
  requireRole("admin", "client"),
  asyncHandler(postCompanyUser),
);
router.patch(
  "/company/users/:userId",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(patchCompanyUser),
);
router.patch(
  "/company/users/:userId/status",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(patchCompanyUserStatus),
);
router.patch(
  "/company/users/:userId/password",
  asyncHandler(requireAuth),
  requireRole("client"),
  asyncHandler(patchCompanyUserPassword),
);
router.get("/admin", asyncHandler(requireAuth), requireRole("admin"), asyncHandler(getAdminPanelData));
router.post("/admin/clients", asyncHandler(requireAuth), requireRole("admin"), asyncHandler(postAdminClient));
router.post("/admin/users", asyncHandler(requireAuth), requireRole("admin"), asyncHandler(postAdminUser));
router.patch(
  "/admin/users/:userId/status",
  asyncHandler(requireAuth),
  requireRole("admin"),
  asyncHandler(patchAdminUserStatus),
);
router.patch(
  "/admin/users/:userId/password",
  asyncHandler(requireAuth),
  requireRole("admin"),
  asyncHandler(patchAdminUserPassword),
);
router.get("/admin/routes", asyncHandler(requireAuth), requireRole("admin"), asyncHandler(getAdminRoutes));
router.patch(
  "/admin/routes/:routeId",
  asyncHandler(requireAuth),
  requireRole("admin"),
  asyncHandler(patchAdminRoute),
);
router.post(
  "/admin/routes/:routeId/duplicate",
  asyncHandler(requireAuth),
  requireRole("admin"),
  asyncHandler(postAdminRouteDuplicate),
);
router.delete(
  "/admin/routes/:routeId",
  asyncHandler(requireAuth),
  requireRole("admin"),
  asyncHandler(deleteAdminRoute),
);

export default router;
