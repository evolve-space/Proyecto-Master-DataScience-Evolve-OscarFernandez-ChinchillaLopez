import { useMemo, useState } from "react";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export default function CompanyRoutesPanel({
  loading,
  message,
  onDeleteRoute,
  onEditRoute,
  onRefresh,
  onUpdateRoute,
  routes,
  t,
  users,
}) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingRouteId, setEditingRouteId] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    assignedToUserId: "",
  });

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (routes || []).filter((route) => {
      const matchesUser =
        !selectedUserId || Number(route.assignedToUserId) === Number(selectedUserId);
      const matchesQuery =
        !query ||
        [route.name, route.publicId, route.assignedUserName, route.assignedUserEmail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesUser && matchesQuery;
    });
  }, [routes, search, selectedUserId]);

  function startEdit(route) {
    setEditingRouteId(route.id);
    setEditForm({
      name: route.name || "",
      assignedToUserId: route.assignedToUserId ? String(route.assignedToUserId) : "",
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    await onUpdateRoute(editingRouteId, {
      name: editForm.name,
      assignedToUserId: editForm.assignedToUserId || null,
    });
    setEditingRouteId("");
  }

  return (
    <section className="panel company-routes-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t.companyRoutes.eyebrow}</p>
          <h2>{t.companyRoutes.title}</h2>
          <p>{t.companyRoutes.description}</p>
        </div>
        <button className="secondary-button" disabled={loading} onClick={() => onRefresh()} type="button">
          {loading ? t.companyRoutes.loading : t.companyRoutes.refresh}
        </button>
      </div>

      {message && <div className="success-panel compact">{message}</div>}

      <div className="route-manager-filters">
        <label>
          <span>{t.companyRoutes.search}</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.companyRoutes.searchPlaceholder}
            value={search}
          />
        </label>
        <label>
          <span>{t.companyRoutes.userFilter}</span>
          <select
            onChange={(event) => setSelectedUserId(event.target.value)}
            value={selectedUserId}
          >
            <option value="">{t.companyRoutes.allUsers}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {editingRouteId && (
        <form className="route-inline-editor" onSubmit={submitEdit}>
          <label>
            <span>{t.companyRoutes.routeName}</span>
            <input
              onChange={(event) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
              required
              value={editForm.name}
            />
          </label>
          <label>
            <span>{t.companyRoutes.assignedUser}</span>
            <select
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  assignedToUserId: event.target.value,
                }))
              }
              value={editForm.assignedToUserId}
            >
              <option value="">{t.saved.noAssignedUser}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-actions">
            <button className="primary-button compact" disabled={loading} type="submit">
              {t.companyRoutes.saveChanges}
            </button>
            <button
              className="secondary-button compact"
              onClick={() => setEditingRouteId("")}
              type="button"
            >
              {t.companyRoutes.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="route-manager-list">
        {filteredRoutes.length ? (
          filteredRoutes.map((route) => (
            <article className="route-manager-card" key={route.id}>
              <div>
                <strong>{route.name}</strong>
                <span>
                  {route.totalPois || 0} POIs · {route.totalDistanceKm || "-"} km ·{" "}
                  {route.assignedUserName || t.saved.noAssignedUser}
                </span>
                <code>{route.publicId}</code>
                <small>{formatDate(route.updatedAt || route.createdAt)}</small>
              </div>
              <div className="route-manager-actions">
                <button
                  className="secondary-button compact"
                  onClick={() => onEditRoute(route.publicId)}
                  type="button"
                >
                  {t.companyRoutes.editRoute}
                </button>
                <button className="secondary-button compact" onClick={() => startEdit(route)} type="button">
                  {t.companyRoutes.renameAssign}
                </button>
                <button
                  className="secondary-button compact danger"
                  onClick={() => onDeleteRoute(route.id)}
                  type="button"
                >
                  {t.companyRoutes.delete}
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state-text">{t.companyRoutes.empty}</p>
        )}
      </div>
    </section>
  );
}
