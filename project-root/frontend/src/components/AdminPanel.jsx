import { useMemo, useState } from "react";

const EMPTY_CLIENT = {
  name: "",
  clientType: "empresa",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  createCompanyUser: true,
  companyUserName: "",
  companyUserEmail: "",
  companyUserPassword: "demo1234",
};

const EMPTY_USER = {
  name: "",
  email: "",
  roleCode: "client",
  clientId: "",
  password: "demo1234",
};

const EMPTY_PASSWORD_RESET = {
  userId: "",
  password: "demo1234",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

export default function AdminPanel({
  adminData,
  loading,
  message,
  onCreateClient,
  onCreateUser,
  onDeleteRoute,
  onDuplicateRoute,
  onRefresh,
  onRefreshRoutes,
  onToggleUserStatus,
  onUpdateRoute,
  onUpdateUserPassword,
  routes,
  routesLoading,
  t,
}) {
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [passwordResetForm, setPasswordResetForm] = useState(EMPTY_PASSWORD_RESET);
  const [clientSearch, setClientSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [routeClientFilter, setRouteClientFilter] = useState("");
  const [routeEditId, setRouteEditId] = useState("");
  const [routeDuplicateId, setRouteDuplicateId] = useState("");
  const [routeForm, setRouteForm] = useState({
    name: "",
    clientId: "",
    assignedToUserId: "",
  });
  const [userSearch, setUserSearch] = useState("");

  const clientOptions = useMemo(() => adminData?.clients || [], [adminData?.clients]);
  const roleOptions = useMemo(() => adminData?.roles || [], [adminData?.roles]);
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();

    if (!query) {
      return clientOptions;
    }

    return clientOptions.filter((client) =>
      [client.name, client.clientType, client.contactEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [clientOptions, clientSearch]);
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const users = adminData?.users || [];

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.roleName, user.clientName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [adminData?.users, userSearch]);
  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();

    return (routes || []).filter((route) => {
      const matchesClient =
        !routeClientFilter || Number(route.clientId) === Number(routeClientFilter);
      const matchesQuery =
        !query ||
        [route.name, route.publicId, route.clientName, route.assignedUserName, route.assignedUserEmail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesClient && matchesQuery;
    });
  }, [routes, routeSearch, routeClientFilter]);
  const routeUserOptions = useMemo(() => {
    if (!routeForm.clientId) {
      return (adminData?.users || []).filter((user) => user.roleCode === "user");
    }

    return (adminData?.users || []).filter(
      (user) => user.roleCode === "user" && Number(user.clientId) === Number(routeForm.clientId),
    );
  }, [adminData?.users, routeForm.clientId]);

  function updateClientField(name, value) {
    setClientForm((current) => ({ ...current, [name]: value }));
  }

  function updateClientPhone(value) {
    updateClientField("contactPhone", value.replace(/\D/g, "").slice(0, 9));
  }

  function updateUserField(name, value) {
    setUserForm((current) => ({ ...current, [name]: value }));
  }

  function updatePasswordResetField(name, value) {
    setPasswordResetForm((current) => ({ ...current, [name]: value }));
  }

  async function submitClient(event) {
    event.preventDefault();
    await onCreateClient(clientForm);
    setClientForm(EMPTY_CLIENT);
  }

  async function submitUser(event) {
    event.preventDefault();
    await onCreateUser(userForm);
    setUserForm(EMPTY_USER);
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    await onUpdateUserPassword(passwordResetForm.userId, passwordResetForm.password);
    setPasswordResetForm(EMPTY_PASSWORD_RESET);
  }

  function startRouteEdit(route) {
    setRouteDuplicateId("");
    setRouteEditId(route.id);
    setRouteForm({
      name: route.name || "",
      clientId: route.clientId ? String(route.clientId) : "",
      assignedToUserId: route.assignedToUserId ? String(route.assignedToUserId) : "",
    });
  }

  function startRouteDuplicate(route) {
    setRouteEditId("");
    setRouteDuplicateId(route.id);
    setRouteForm({
      name: `${route.name || t.admin.routes.defaultName} - copia`,
      clientId: route.clientId ? String(route.clientId) : "",
      assignedToUserId: "",
    });
  }

  async function submitRouteForm(event) {
    event.preventDefault();
    const payload = {
      name: routeForm.name,
      clientId: routeForm.clientId || null,
      assignedToUserId: routeForm.assignedToUserId || null,
    };

    if (routeDuplicateId) {
      await onDuplicateRoute(routeDuplicateId, payload);
    } else {
      await onUpdateRoute(routeEditId, payload);
    }

    setRouteEditId("");
    setRouteDuplicateId("");
  }

  return (
    <section className="admin-panel">
      <div className="panel admin-hero">
        <div>
          <p className="eyebrow">{t.admin.eyebrow}</p>
          <h2>{t.admin.title}</h2>
          <p>{t.admin.description}</p>
        </div>
        <button className="secondary-button" disabled={loading} onClick={onRefresh} type="button">
          {loading ? t.admin.loading : t.admin.refresh}
        </button>
      </div>

      {message && <div className="panel success-panel">{message}</div>}

      <div className="admin-forms-grid">
        <form className="panel admin-form" onSubmit={submitClient}>
          <div>
            <p className="eyebrow">{t.admin.clients.eyebrow}</p>
            <h3>{t.admin.clients.createTitle}</h3>
          </div>
          <label>
            <span>{t.admin.clients.name}</span>
            <input
              onChange={(event) => {
                const nextName = event.target.value;
                setClientForm((current) => ({
                  ...current,
                  name: nextName,
                  companyUserName: current.companyUserName || nextName,
                }));
              }}
              required
              value={clientForm.name}
            />
          </label>
          <div className="form-grid two">
            <label>
              <span>{t.admin.clients.type}</span>
              <input
                onChange={(event) => updateClientField("clientType", event.target.value)}
                value={clientForm.clientType}
              />
            </label>
            <label>
              <span>{t.admin.clients.email}</span>
              <input
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  setClientForm((current) => ({
                    ...current,
                    contactEmail: nextEmail,
                    companyUserEmail: current.companyUserEmail || nextEmail,
                  }));
                }}
                type="email"
                value={clientForm.contactEmail}
              />
            </label>
          </div>
          <label>
            <span>{t.admin.clients.phone}</span>
            <div className="phone-input">
              <span className="phone-prefix" aria-hidden="true">
                <span className="spain-flag" />
              </span>
              <input
                inputMode="numeric"
                maxLength="9"
                onChange={(event) => updateClientPhone(event.target.value)}
                pattern="[0-9]{9}"
                placeholder="600000000"
                value={clientForm.contactPhone}
              />
            </div>
          </label>
          <label>
            <span>{t.admin.clients.notes}</span>
            <textarea
              onChange={(event) => updateClientField("notes", event.target.value)}
              rows="3"
              value={clientForm.notes}
            />
          </label>
          <div className="admin-linked-user-box">
            <label className="checkbox-row">
              <input
                checked={clientForm.createCompanyUser}
                onChange={(event) =>
                  updateClientField("createCompanyUser", event.target.checked)
                }
                type="checkbox"
              />
              <span>{t.admin.clients.createAccessUser}</span>
            </label>
            {clientForm.createCompanyUser && (
              <div className="form-grid two">
                <label>
                  <span>{t.admin.users.name}</span>
                  <input
                    onChange={(event) =>
                      updateClientField("companyUserName", event.target.value)
                    }
                    required
                    value={clientForm.companyUserName}
                  />
                </label>
                <label>
                  <span>{t.admin.users.email}</span>
                  <input
                    onChange={(event) =>
                      updateClientField("companyUserEmail", event.target.value)
                    }
                    placeholder={clientForm.contactEmail || ""}
                    required
                    type="email"
                    value={clientForm.companyUserEmail}
                  />
                </label>
                <label>
                  <span>{t.admin.users.password}</span>
                  <input
                    onChange={(event) =>
                      updateClientField("companyUserPassword", event.target.value)
                    }
                    required
                    value={clientForm.companyUserPassword}
                  />
                </label>
              </div>
            )}
          </div>
          <button className="primary-button" disabled={loading} type="submit">
            {t.admin.clients.create}
          </button>
        </form>

        <form className="panel admin-form" onSubmit={submitUser}>
          <div>
            <p className="eyebrow">{t.admin.users.eyebrow}</p>
            <h3>{t.admin.users.createTitle}</h3>
          </div>
          <div className="form-grid two">
            <label>
              <span>{t.admin.users.name}</span>
              <input
                onChange={(event) => updateUserField("name", event.target.value)}
                required
                value={userForm.name}
              />
            </label>
            <label>
              <span>{t.admin.users.email}</span>
              <input
                onChange={(event) => updateUserField("email", event.target.value)}
                required
                type="email"
                value={userForm.email}
              />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              <span>{t.admin.users.role}</span>
              <select
                onChange={(event) => updateUserField("roleCode", event.target.value)}
                value={userForm.roleCode}
              >
                {roleOptions.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.admin.users.client}</span>
              <select
                disabled={userForm.roleCode === "admin"}
                onChange={(event) => updateUserField("clientId", event.target.value)}
                required={userForm.roleCode !== "admin"}
                value={userForm.roleCode === "admin" ? "" : userForm.clientId}
              >
                <option value="">{t.admin.users.selectClient}</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>{t.admin.users.password}</span>
            <input
              onChange={(event) => updateUserField("password", event.target.value)}
              required
              value={userForm.password}
            />
          </label>
          <p className="admin-help">{t.admin.users.passwordHelp}</p>
          <button className="primary-button" disabled={loading} type="submit">
            {t.admin.users.create}
          </button>
        </form>

        <form className="panel admin-form" onSubmit={submitPasswordReset}>
          <div>
            <p className="eyebrow">{t.admin.users.securityEyebrow}</p>
            <h3>{t.admin.users.passwordTitle}</h3>
          </div>
          <label>
            <span>{t.admin.users.user}</span>
            <select
              onChange={(event) => updatePasswordResetField("userId", event.target.value)}
              required
              value={passwordResetForm.userId}
            >
              <option value="">{t.admin.users.selectUser}</option>
              {(adminData?.users || []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.admin.users.newPassword}</span>
            <input
              minLength="6"
              onChange={(event) => updatePasswordResetField("password", event.target.value)}
              required
              type="text"
              value={passwordResetForm.password}
            />
          </label>
          <p className="admin-help">{t.admin.users.passwordResetHelp}</p>
          <button className="primary-button" disabled={loading} type="submit">
            {t.admin.users.updatePassword}
          </button>
        </form>
      </div>

      <div className="admin-tables-grid">
        <section className="panel admin-table-card">
          <div className="admin-table-head">
            <div>
              <p className="eyebrow">{t.admin.clients.eyebrow}</p>
              <h3>{t.admin.clients.listTitle}</h3>
            </div>
            <label className="admin-search-field">
              <span>{t.admin.search}</span>
              <input
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder={t.admin.clients.searchPlaceholder}
                value={clientSearch}
              />
            </label>
          </div>
          <div className="admin-table-wrap scrollable">
            <table>
              <thead>
                <tr>
                  <th>{t.admin.clients.name}</th>
                  <th>{t.admin.clients.type}</th>
                  <th>{t.admin.clients.email}</th>
                  <th>{t.admin.clients.users}</th>
                  <th>{t.admin.clients.routes}</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.clientType || "-"}</td>
                    <td>{client.contactEmail || "-"}</td>
                    <td>{client.userCount}</td>
                    <td>{client.routeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel admin-table-card">
          <div className="admin-table-head">
            <div>
              <p className="eyebrow">{t.admin.users.eyebrow}</p>
              <h3>{t.admin.users.listTitle}</h3>
            </div>
            <label className="admin-search-field">
              <span>{t.admin.search}</span>
              <input
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder={t.admin.users.searchPlaceholder}
                value={userSearch}
              />
            </label>
          </div>
          <div className="admin-table-wrap scrollable">
            <table>
              <thead>
                <tr>
                  <th>{t.admin.users.name}</th>
                  <th>{t.admin.users.email}</th>
                  <th>{t.admin.users.role}</th>
                  <th>{t.admin.users.client}</th>
                  <th>{t.admin.users.status}</th>
                  <th>{t.admin.users.createdAt}</th>
                  <th>{t.admin.users.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.roleName}</td>
                    <td>{user.clientName || "-"}</td>
                    <td>
                      <span className={user.isActive ? "status-badge active" : "status-badge"}>
                        {user.isActive ? t.admin.users.active : t.admin.users.inactive}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="table-actions-stack">
                        <button
                          className="secondary-button table-action-button"
                          onClick={() => onToggleUserStatus(user.id, !user.isActive)}
                          type="button"
                        >
                          {user.isActive ? t.admin.users.disable : t.admin.users.enable}
                        </button>
                        <button
                          className="secondary-button table-action-button"
                          onClick={() =>
                            setPasswordResetForm({
                              userId: String(user.id),
                              password: "demo1234",
                            })
                          }
                          type="button"
                        >
                          {t.admin.users.resetPassword}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel admin-table-card admin-routes-card">
        <div className="admin-table-head">
          <div>
            <p className="eyebrow">{t.admin.routes.eyebrow}</p>
            <h3>{t.admin.routes.listTitle}</h3>
          </div>
          <div className="admin-route-tools">
            <label className="admin-search-field">
              <span>{t.admin.search}</span>
              <input
                onChange={(event) => setRouteSearch(event.target.value)}
                placeholder={t.admin.routes.searchPlaceholder}
                value={routeSearch}
              />
            </label>
            <label className="admin-search-field">
              <span>{t.admin.routes.companyFilter}</span>
              <select
                onChange={(event) => setRouteClientFilter(event.target.value)}
                value={routeClientFilter}
              >
                <option value="">{t.admin.routes.allCompanies}</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button table-action-button"
              disabled={routesLoading}
              onClick={() => onRefreshRoutes()}
              type="button"
            >
              {routesLoading ? t.admin.loading : t.admin.refresh}
            </button>
          </div>
        </div>

        {(routeEditId || routeDuplicateId) && (
          <form className="route-inline-editor admin-route-editor" onSubmit={submitRouteForm}>
            <label>
              <span>{t.admin.routes.name}</span>
              <input
                onChange={(event) =>
                  setRouteForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={routeForm.name}
              />
            </label>
            <label>
              <span>{t.admin.routes.company}</span>
              <select
                onChange={(event) =>
                  setRouteForm((current) => ({
                    ...current,
                    clientId: event.target.value,
                    assignedToUserId: "",
                  }))
                }
                required
                value={routeForm.clientId}
              >
                <option value="">{t.admin.users.selectClient}</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.admin.routes.assignedUser}</span>
              <select
                onChange={(event) =>
                  setRouteForm((current) => ({
                    ...current,
                    assignedToUserId: event.target.value,
                  }))
                }
                value={routeForm.assignedToUserId}
              >
                <option value="">{t.saved.noAssignedUser}</option>
                {routeUserOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-actions">
              <button className="primary-button compact" disabled={routesLoading} type="submit">
                {routeDuplicateId ? t.admin.routes.duplicate : t.admin.routes.save}
              </button>
              <button
                className="secondary-button compact"
                onClick={() => {
                  setRouteEditId("");
                  setRouteDuplicateId("");
                }}
                type="button"
              >
                {t.admin.routes.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="admin-table-wrap scrollable route-admin-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.admin.routes.name}</th>
                <th>{t.admin.routes.company}</th>
                <th>{t.admin.routes.assignedUser}</th>
                <th>{t.admin.routes.totalPois}</th>
                <th>{t.admin.routes.updatedAt}</th>
                <th>{t.admin.users.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => (
                <tr key={route.id}>
                  <td>
                    <strong>{route.name}</strong>
                    <br />
                    <code>{route.publicId}</code>
                  </td>
                  <td>{route.clientName || "-"}</td>
                  <td>{route.assignedUserName || "-"}</td>
                  <td>{route.totalPois || 0}</td>
                  <td>{formatDate(route.updatedAt || route.createdAt)}</td>
                  <td>
                    <div className="table-actions-stack">
                      <button
                        className="secondary-button table-action-button"
                        onClick={() => startRouteEdit(route)}
                        type="button"
                      >
                        {t.admin.routes.edit}
                      </button>
                      <button
                        className="secondary-button table-action-button"
                        onClick={() => startRouteDuplicate(route)}
                        type="button"
                      >
                        {t.admin.routes.reuse}
                      </button>
                      <button
                        className="secondary-button table-action-button danger"
                        onClick={() => onDeleteRoute(route.id)}
                        type="button"
                      >
                        {t.admin.routes.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRoutes.length && <p className="empty-state-text">{t.admin.routes.empty}</p>}
        </div>
      </section>
    </section>
  );
}
