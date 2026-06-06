import { useState } from "react";
import ResultsSidebar from "../components/ResultsSidebar.jsx";
import RouteMap from "../components/RouteMap.jsx";
import AppSidebar from "../components/AppSidebar.jsx";
import PoiCatalog from "../components/PoiCatalog.jsx";
import RouteEditor from "../components/RouteEditor.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import CompanyUsersPanel from "../components/CompanyUsersPanel.jsx";
import CompanyRoutesPanel from "../components/CompanyRoutesPanel.jsx";
import appLogo from "../assets/icono_web.png";

export default function HomePage({
  adminData,
  adminLoading,
  adminMessage,
  adminRoutes,
  adminRoutesLoading,
  assignedRoutes,
  categories,
  catalogLoading,
  catalogPois,
  companyMessage,
  companyRoutes,
  companyRoutesLoading,
  companyUsers,
  companyUsersLoading,
  defaultStart,
  error,
  health,
  language,
  loading,
  loadingSavedRoute,
  appMode,
  currentUser,
  userRoutes,
  onAppModeChange,
  onCreateAdminClient,
  onCreateAdminUser,
  onCreateCompanyUser,
  onDeleteAdminRoute,
  onDeleteCompanyRoute,
  onDuplicateAdminRoute,
  onLanguageChange,
  onLoadAdminData,
  onLoadAdminRoutes,
  onLoadCompanyRoutes,
  onLoadCompanyUsers,
  onLoadMyRoutes,
  onLoadSavedRoute,
  onManualPoiAdd,
  onManualPoiRemove,
  onPoiSelect,
  onRemoveUserRoute,
  onEditorAddPoi,
  onEditorConstraintChange,
  onEditorMovePoi,
  onEditorRemovePoi,
  onRouteDisplayModeChange,
  onSearchPois,
  onAssignedUserChange,
  onSaveUserRoute,
  onSaveRoute,
  onUpdateLoadedRoute,
  onBuildManualRoute,
  onSubmit,
  onThemeChange,
  onToggleAdminUserStatus,
  onToggleCompanyUserStatus,
  onUpdateAdminRoute,
  onUpdateAdminUserPassword,
  onUpdateCompanyRoute,
  onUpdateCompanyUser,
  onUpdateCompanyUserPassword,
  onLogout,
  routeData,
  routeDisplayMode,
  selectedAssignedUserId,
  manualPois,
  editorConstraints,
  savedRouteInfo,
  selectedPoi,
  savingRoute,
  submitting,
  t,
  theme,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [routeCode, setRouteCode] = useState("");
  const [companyTool, setCompanyTool] = useState("smart");
  const isAdminMode = appMode === "admin";
  const isUserMode = appMode === "user";
  const isCompanyMode = appMode === "company";
  const isSmartTool = isCompanyMode && companyTool === "smart";
  const isManualTool = isCompanyMode && companyTool === "manual";
  const isEditorTool = isCompanyMode && companyTool === "editor";
  const isCompanyUsersTool = isCompanyMode && companyTool === "users";
  const isCompanyRoutesTool = isCompanyMode && companyTool === "routes";
  const layoutMode = isSmartTool
    ? sidebarOpen
      ? "sidebar-open"
      : "sidebar-closed"
    : "no-sidebar";
  const visibleRouteData =
    isManualTool && routeData?.meta?.mode !== "manual-catalog-route" ? null : routeData;
  const sessionUser = currentUser || {
    name: "-",
    email: "-",
    role: { name: isAdminMode ? t.modes.admin : isUserMode ? t.modes.user : t.modes.company },
  };

  function submitRouteCode(event) {
    event.preventDefault();
    if (routeCode.trim()) {
      onLoadSavedRoute(routeCode.trim());
    }
  }

  async function openCompanyRouteInEditor(publicId) {
    await onLoadSavedRoute(publicId);
    setCompanyTool("editor");
  }

  return (
    <div className={`app-layout ${layoutMode} ${isUserMode ? "user-layout" : ""}`}>
      {isSmartTool && (
        <AppSidebar
          categories={categories}
          defaultStart={defaultStart}
          onClose={() => setSidebarOpen(false)}
          onSubmit={onSubmit}
          submitting={submitting}
          t={t}
        />
      )}

      <main className="app-shell">
      <div className="mobile-topbar">
        <button
          className="mobile-menu-button"
          onClick={() => {
            setCompanyTool("smart");
            setSidebarOpen(true);
          }}
          type="button"
        >
          ☰
        </button>
        <div className="mobile-brand">
          <img className="brand-logo mobile-brand-logo" src={appLogo} alt="" />
          <div>
            <strong>{t.topbar.title}</strong>
            <span>{t.topbar.subtitle}</span>
          </div>
        </div>
        <div className="mobile-topbar-actions">
          <span className={health?.status === "ok" ? "mobile-status ok" : "mobile-status"} />
          <button
            className={theme === "dark" ? "active" : ""}
            onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
            type="button"
          >
            {theme === "dark" ? t.controls.themeDarkShort : t.controls.themeLightShort}
          </button>
          <button
            onClick={() => onLanguageChange(language === "es" ? "en" : "es")}
            type="button"
          >
            {language === "es" ? t.controls.languageEs : t.controls.languageEn}
          </button>
        </div>
      </div>

      {adminData?.stats && (
        <div className="mobile-admin-summary">
          <div className="mobile-session-card">
            <strong>{sessionUser.name}</strong>
            <span>{sessionUser.email}</span>
          </div>
          <div className="mobile-metrics-strip">
            <span>
              <small>{t.admin.stats.clients}</small>
              <strong>{adminData.stats.totalClients ?? 0}</strong>
            </span>
            <span>
              <small>{t.admin.stats.users}</small>
              <strong>{adminData.stats.totalUsers ?? 0}</strong>
            </span>
            <span>
              <small>{t.admin.stats.activeUsers}</small>
              <strong>{adminData.stats.activeUsers ?? 0}</strong>
            </span>
            <span>
              <small>{t.admin.stats.routes}</small>
              <strong>{adminData.stats.totalRoutes ?? 0}</strong>
            </span>
            <span>
              <small>{t.admin.stats.pois}</small>
              <strong>{adminData.stats.totalPois ?? 0}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="content-toolbar">
        <div className="toolbar-left">
          <div className="topbar-brand toolbar-brand">
            <img className="brand-logo" src={appLogo} alt="" />
            <div>
              <strong>{t.topbar.title}</strong>
              <span>{t.topbar.subtitle}</span>
            </div>
          </div>

          {isSmartTool && !sidebarOpen && (
            <button
              aria-label={t.sidebar.show}
              className="sidebar-toggle-button icon-only"
              onClick={() => setSidebarOpen((current) => !current)}
              title={t.sidebar.show}
              type="button"
            >
              <span aria-hidden="true">☰</span>
            </button>
          )}

          <div className="toolbar-inline-controls">
            <div className="topbar-status" title={t.app.backend}>
              <span className={health?.status === "ok" ? "status-dot ok" : "status-dot"} />
              <span>{health?.status === "ok" ? t.app.backendActive : t.app.backendOffline}</span>
            </div>

            <div className="compact-control" aria-label={t.controls.theme}>
              <button
                className={theme === "dark" ? "active" : ""}
                onClick={() => onThemeChange("dark")}
                title={t.controls.themeDark}
                type="button"
              >
                {t.controls.themeDarkShort}
              </button>
              <button
                className={theme === "light" ? "active" : ""}
                onClick={() => onThemeChange("light")}
                title={t.controls.themeLight}
                type="button"
              >
                {t.controls.themeLightShort}
              </button>
            </div>

            <div className="compact-control" aria-label={t.controls.language}>
              <button
                className={language === "es" ? "active" : ""}
                onClick={() => onLanguageChange("es")}
                type="button"
              >
                {t.controls.languageEs}
              </button>
              <button
                className={language === "en" ? "active" : ""}
                onClick={() => onLanguageChange("en")}
                type="button"
              >
                {t.controls.languageEn}
              </button>
            </div>
          </div>
        </div>

        <div className="content-toolbar-controls">
          {adminData?.stats && (
            <div className="topbar-metrics" aria-label={t.admin.title}>
              <span>
                <small>{t.admin.stats.clients}</small>
                <strong>{adminData.stats.totalClients ?? 0}</strong>
              </span>
              <span>
                <small>{t.admin.stats.users}</small>
                <strong>{adminData.stats.totalUsers ?? 0}</strong>
              </span>
              <span>
                <small>{t.admin.stats.activeUsers}</small>
                <strong>{adminData.stats.activeUsers ?? 0}</strong>
              </span>
              <span>
                <small>{t.admin.stats.routes}</small>
                <strong>{adminData.stats.totalRoutes ?? 0}</strong>
              </span>
              <span>
                <small>{t.admin.stats.pois}</small>
                <strong>{adminData.stats.totalPois ?? 0}</strong>
              </span>
            </div>
          )}

          <div className="session-card" title={currentUser.email}>
            <span>{sessionUser.role?.name || sessionUser.role?.code}</span>
            <strong>{sessionUser.name}</strong>
            <small>{sessionUser.email}</small>
          </div>

          <button className="secondary-button logout-button" onClick={onLogout} type="button">
            {t.auth.logout}
          </button>

        </div>
      </div>

      {loading && (
        <section className="panel">
          <p>{t.app.loading}</p>
        </section>
      )}
      {error && (
        <section className="panel error-panel">
          <p>{error}</p>
        </section>
      )}

      {!loading && (
        <>
          {!isSmartTool && !isAdminMode && (
            <section className="view-brand-bar">
              <div className="topbar-brand">
                <img className="brand-logo" src={appLogo} alt="" />
                <div>
                  <strong>{t.topbar.title}</strong>
                  <span>
                    {isAdminMode ? t.modes.admin : isUserMode ? t.modes.user : t.modes.company}
                  </span>
                </div>
              </div>
            </section>
          )}

          {isCompanyMode && (
            <section className="company-tools-panel">
              <div className="company-tool-tabs" aria-label={t.companyTools.label}>
                <button
                  className={companyTool === "smart" ? "active" : ""}
                  onClick={() => setCompanyTool("smart")}
                  type="button"
                >
                  {t.companyTools.smart}
                </button>
                <button
                  className={companyTool === "manual" ? "active" : ""}
                  onClick={() => setCompanyTool("manual")}
                  type="button"
                >
                  {t.companyTools.manual}
                </button>
                <button
                  className={companyTool === "editor" ? "active" : ""}
                  onClick={() => setCompanyTool("editor")}
                  type="button"
                >
                  {t.companyTools.editor}
                </button>
                <button
                  className={companyTool === "users" ? "active" : ""}
                  onClick={() => setCompanyTool("users")}
                  type="button"
                >
                  {t.companyTools.users}
                </button>
                <button
                  className={companyTool === "routes" ? "active" : ""}
                  onClick={() => setCompanyTool("routes")}
                  type="button"
                >
                  {t.companyTools.routes}
                </button>
              </div>
              <p>{t.companyTools.description[companyTool]}</p>
            </section>
          )}

          {isAdminMode && (
            <AdminPanel
              adminData={adminData}
              loading={adminLoading}
              message={adminMessage}
              onCreateClient={onCreateAdminClient}
              onCreateUser={onCreateAdminUser}
              onRefresh={onLoadAdminData}
              onDeleteRoute={onDeleteAdminRoute}
              onDuplicateRoute={onDuplicateAdminRoute}
              onRefreshRoutes={onLoadAdminRoutes}
              onUpdateRoute={onUpdateAdminRoute}
              onToggleUserStatus={onToggleAdminUserStatus}
              onUpdateUserPassword={onUpdateAdminUserPassword}
              routes={adminRoutes}
              routesLoading={adminRoutesLoading}
              t={t}
            />
          )}

          {isUserMode && (
            <section className="panel user-loader-panel">
              <div>
                <p className="eyebrow">{t.userAccess.eyebrow}</p>
                <h2>{t.userAccess.title}</h2>
              <p>{t.userAccess.description}</p>
              </div>
              <form className="user-loader-form" onSubmit={submitRouteCode}>
                <label>
                  <span>{t.userAccess.codeLabel}</span>
                  <input
                    onChange={(event) => setRouteCode(event.target.value)}
                    placeholder={t.userAccess.codePlaceholder}
                    value={routeCode}
                  />
                </label>
                <button className="primary-button" disabled={loadingSavedRoute} type="submit">
                  {loadingSavedRoute ? t.userAccess.loading : t.userAccess.load}
                </button>
              </form>
              <div className="user-routes-wallet assigned-routes-box">
                <div className="user-routes-wallet-head">
                  <div>
                    <p className="eyebrow">{t.userRoutes.assignedEyebrow}</p>
                    <h3>{t.userRoutes.assignedTitle}</h3>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={loadingSavedRoute}
                    onClick={onLoadMyRoutes}
                    type="button"
                  >
                    {loadingSavedRoute ? t.userAccess.loading : t.admin.refresh}
                  </button>
                </div>

                {assignedRoutes.length ? (
                  <div className="user-route-list">
                    {assignedRoutes.map((route) => (
                      <article className="user-route-item" key={route.publicId}>
                        <div>
                          <strong>{route.name}</strong>
                          <span>{route.totalPois} POIs</span>
                          <code>{route.publicId}</code>
                        </div>
                        <div className="user-route-actions">
                          <button
                            className="secondary-button"
                            disabled={loadingSavedRoute}
                            onClick={() => onLoadSavedRoute(route.publicId)}
                            type="button"
                          >
                            {t.userRoutes.open}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="user-routes-empty">{t.userRoutes.noAssigned}</p>
                )}
              </div>
              <div className="user-routes-wallet">
                <div className="user-routes-wallet-head">
                  <div>
                    <p className="eyebrow">{t.userRoutes.eyebrow}</p>
                    <h3>{t.userRoutes.title}</h3>
                  </div>
                  {routeData?.route?.length && savedRouteInfo?.publicId ? (
                    <button className="secondary-button" onClick={onSaveUserRoute} type="button">
                      {t.userRoutes.saveCurrent}
                    </button>
                  ) : null}
                </div>

                {userRoutes.length ? (
                  <div className="user-route-list">
                    {userRoutes.map((route) => (
                      <article className="user-route-item" key={route.publicId}>
                        <div>
                          <strong>{route.name}</strong>
                          <span>{route.totalPois} POIs</span>
                          <code>{route.publicId}</code>
                        </div>
                        <div className="user-route-actions">
                          <button
                            className="secondary-button"
                            disabled={loadingSavedRoute}
                            onClick={() => onLoadSavedRoute(route.publicId)}
                            type="button"
                          >
                            {t.userRoutes.open}
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => onRemoveUserRoute(route.publicId)}
                            type="button"
                          >
                            {t.userRoutes.remove}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="user-routes-empty">{t.userRoutes.empty}</p>
                )}
              </div>
            </section>
          )}

          {!isAdminMode && (
          <section className="workspace-grid">
            <div className="workspace-main">
              {isManualTool && (
                <PoiCatalog
                  categories={categories}
                  loading={catalogLoading}
                  onAddPoi={onManualPoiAdd}
                  onBuildRoute={onBuildManualRoute}
                  onRemovePoi={onManualPoiRemove}
                  onSearch={onSearchPois}
                  pois={catalogPois}
                  selectedPois={manualPois}
                  t={t}
                />
              )}

              {isManualTool && routeData && routeData.meta?.mode !== "manual-catalog-route" && (
                <section className="panel manual-view-note">
                  <p>{t.catalog.routeHiddenInManual}</p>
                </section>
              )}

              {isEditorTool && (
                <RouteEditor
                  categories={categories}
                  constraints={editorConstraints}
                  loading={catalogLoading}
                  onAddPoi={onEditorAddPoi}
                  onConstraintChange={onEditorConstraintChange}
                  onMovePoi={onEditorMovePoi}
                  onRemovePoi={onEditorRemovePoi}
                  onSearch={onSearchPois}
                  pois={catalogPois}
                  route={routeData?.route || []}
                  t={t}
                />
              )}

              {isCompanyUsersTool && (
                <CompanyUsersPanel
                  loading={companyUsersLoading}
                  message={companyMessage}
                  onCreateUser={onCreateCompanyUser}
                  onRefresh={onLoadCompanyUsers}
                  onToggleUserStatus={onToggleCompanyUserStatus}
                  onUpdateUser={onUpdateCompanyUser}
                  onUpdateUserPassword={onUpdateCompanyUserPassword}
                  t={t}
                  users={companyUsers}
                />
              )}

              {isCompanyRoutesTool && (
                <CompanyRoutesPanel
                  loading={companyRoutesLoading}
                  message={companyMessage}
                  onDeleteRoute={onDeleteCompanyRoute}
                  onEditRoute={openCompanyRouteInEditor}
                  onRefresh={onLoadCompanyRoutes}
                  onUpdateRoute={onUpdateCompanyRoute}
                  routes={companyRoutes}
                  t={t}
                  users={companyUsers}
                />
              )}

              {!isCompanyUsersTool && !isCompanyRoutesTool && visibleRouteData ? (
                <section className="panel route-overview">
                  <div className="route-overview-heading">
                    <p className="eyebrow">{t.overview.eyebrow}</p>
                    <h2>{t.overview.title}</h2>
                  </div>

                  <div className="overview-grid">
                    <div className="overview-card">
                      <span>{t.overview.generatedPois}</span>
                      <strong>
                        {visibleRouteData.summary.totalPois} / {visibleRouteData.summary.requestedPois}
                      </strong>
                    </div>
                    <div className="overview-card">
                      <span>{t.overview.routeDistance}</span>
                      <strong>{visibleRouteData.summary.totalDistanceKm} km</strong>
                    </div>
                    <div className="overview-card">
                      <span>{t.overview.visitTime}</span>
                      <strong>{visibleRouteData.summary.totalVisitMinutes} min</strong>
                    </div>
                    <div className="overview-card">
                      <span>{t.overview.travelTime}</span>
                      <strong>
                        {visibleRouteData.summary.totalTravelMinutes === null
                          ? t.common.notAvailable
                          : `${visibleRouteData.summary.totalTravelMinutes} min`}
                      </strong>
                    </div>
                    <div className="overview-card">
                      <span>{t.overview.totalTime}</span>
                      <strong>{visibleRouteData.summary.totalExperienceMinutes} min</strong>
                    </div>
                    <div className="overview-card">
                      <span>{t.overview.routeMode}</span>
                      <strong>
                        {routeDisplayMode === "walking"
                          ? t.overview.routeModeWalking
                          : t.overview.routeModeDirect}
                      </strong>
                    </div>
                  </div>
                  {!isUserMode && (
                    <div className="save-route-actions">
                      <label className="assign-route-field">
                        <span>{t.saved.assignToUser}</span>
                        {companyUsers.length ? (
                          <select
                            onChange={(event) => onAssignedUserChange(event.target.value)}
                            value={selectedAssignedUserId}
                          >
                            <option value="">{t.saved.noAssignedUser}</option>
                            {companyUsers.filter((user) => user.isActive).map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} - {user.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="assign-route-empty">
                            {companyUsersLoading ? t.companyUsers.loading : t.saved.noUsersToAssign}
                          </p>
                        )}
                      </label>
                      <button
                        className="primary-button"
                        disabled={savingRoute}
                        onClick={onSaveRoute}
                        type="button"
                      >
                        {savingRoute ? t.saved.saving : t.saved.save}
                      </button>
                      {isEditorTool && savedRouteInfo?.routeId && (
                        <button
                          className="secondary-button"
                          disabled={savingRoute}
                          onClick={onUpdateLoadedRoute}
                          type="button"
                        >
                          {savingRoute ? t.saved.saving : t.saved.updateLoaded}
                        </button>
                      )}
                      {savedRouteInfo?.publicId && (
                        <div className="saved-route-box">
                          <span>{t.saved.success}</span>
                          <strong>{savedRouteInfo.publicId}</strong>
                        </div>
                      )}
                    </div>
                  )}
                  {isUserMode && savedRouteInfo?.publicId && (
                    <p className="saved-route-note">
                      {t.saved.loaded}: {savedRouteInfo.publicId}
                    </p>
                  )}
                </section>
              ) : null}

              {!isCompanyUsersTool && !isCompanyRoutesTool && (
              <RouteMap
                onPoiSelect={onPoiSelect}
                onRouteDisplayModeChange={onRouteDisplayModeChange}
                route={visibleRouteData?.route || []}
                routeDisplayMode={routeDisplayMode}
                routeGeometry={visibleRouteData?.navigation?.geometry || []}
                selectedPoi={visibleRouteData ? selectedPoi : null}
                startLocation={visibleRouteData?.preferences?.startLocation || defaultStart}
                t={t}
                theme={theme}
              />
              )}
              {!isCompanyUsersTool && !isCompanyRoutesTool && visibleRouteData ? (
                <ResultsSidebar
                  meta={visibleRouteData.meta}
                  onPoiSelect={onPoiSelect}
                  route={visibleRouteData.route}
                  selectedPoi={selectedPoi}
                  summary={visibleRouteData.summary}
                  t={t}
                />
              ) : !isCompanyUsersTool && !isCompanyRoutesTool ? (
                <section className="panel empty-panel">
                  <p className="eyebrow">{t.empty.eyebrow}</p>
                  <h2>{t.empty.title}</h2>
                  <p>{t.empty.description}</p>
                </section>
              ) : null}
            </div>
          </section>
          )}
        </>
      )}
      </main>
    </div>
  );
}
