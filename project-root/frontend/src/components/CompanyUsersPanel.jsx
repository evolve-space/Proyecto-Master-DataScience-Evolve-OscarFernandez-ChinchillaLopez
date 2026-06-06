import { useMemo, useState } from "react";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "demo1234",
};

export default function CompanyUsersPanel({
  loading,
  message,
  onCreateUser,
  onRefresh,
  onToggleUserStatus,
  onUpdateUser,
  onUpdateUserPassword,
  t,
  users,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [passwordUserId, setPasswordUserId] = useState("");
  const [newPassword, setNewPassword] = useState("demo1234");
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.clientName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, users]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    await onCreateUser(form);
    setForm(EMPTY_FORM);
  }

  function startEdit(user) {
    setPasswordUserId("");
    setEditingUserId(user.id);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    await onUpdateUser(editingUserId, editForm);
    setEditingUserId("");
  }

  function startPasswordReset(user) {
    setEditingUserId("");
    setPasswordUserId(user.id);
    setNewPassword("demo1234");
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    await onUpdateUserPassword(passwordUserId, newPassword);
    setPasswordUserId("");
  }

  return (
    <section className="company-users-panel">
      <div className="panel company-users-hero">
        <div>
          <p className="eyebrow">{t.companyUsers.eyebrow}</p>
          <h2>{t.companyUsers.title}</h2>
          <p>{t.companyUsers.description}</p>
        </div>
        <button className="secondary-button" disabled={loading} onClick={onRefresh} type="button">
          {loading ? t.companyUsers.loading : t.companyUsers.refresh}
        </button>
      </div>

      {message && <div className="panel success-panel">{message}</div>}

      <div className="company-users-grid">
        <form className="panel admin-form company-user-form" onSubmit={submitForm}>
          <div>
            <p className="eyebrow">{t.companyUsers.createEyebrow}</p>
            <h3>{t.companyUsers.createTitle}</h3>
          </div>
          <label>
            <span>{t.admin.users.name}</span>
            <input
              onChange={(event) => updateField("name", event.target.value)}
              required
              value={form.name}
            />
          </label>
          <label>
            <span>{t.admin.users.email}</span>
            <input
              onChange={(event) => updateField("email", event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            <span>{t.admin.users.password}</span>
            <input
              onChange={(event) => updateField("password", event.target.value)}
              required
              value={form.password}
            />
          </label>
          <p className="admin-help">{t.companyUsers.passwordHelp}</p>
          <button className="primary-button" disabled={loading} type="submit">
            {t.companyUsers.create}
          </button>
        </form>

        <section className="panel admin-table-card">
          <div className="admin-table-head">
            <div>
              <p className="eyebrow">{t.companyUsers.listEyebrow}</p>
              <h3>{t.companyUsers.listTitle}</h3>
            </div>
            <label className="admin-search-field">
              <span>{t.admin.search}</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.companyUsers.searchPlaceholder}
                value={search}
              />
            </label>
          </div>

          <div className="company-user-list">
            {editingUserId && (
              <form className="route-inline-editor company-user-inline-form" onSubmit={submitEdit}>
                <label>
                  <span>{t.admin.users.name}</span>
                  <input
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    value={editForm.name}
                  />
                </label>
                <label>
                  <span>{t.admin.users.email}</span>
                  <input
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                    type="email"
                    value={editForm.email}
                  />
                </label>
                <div className="inline-actions">
                  <button className="primary-button compact" disabled={loading} type="submit">
                    {t.companyUsers.saveChanges}
                  </button>
                  <button
                    className="secondary-button compact"
                    onClick={() => setEditingUserId("")}
                    type="button"
                  >
                    {t.companyUsers.cancel}
                  </button>
                </div>
              </form>
            )}

            {passwordUserId && (
              <form className="route-inline-editor company-user-inline-form" onSubmit={submitPasswordReset}>
                <label>
                  <span>{t.admin.users.newPassword}</span>
                  <input
                    minLength="6"
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    type="text"
                    value={newPassword}
                  />
                </label>
                <div className="inline-actions">
                  <button className="primary-button compact" disabled={loading} type="submit">
                    {t.companyUsers.updatePassword}
                  </button>
                  <button
                    className="secondary-button compact"
                    onClick={() => setPasswordUserId("")}
                    type="button"
                  >
                    {t.companyUsers.cancel}
                  </button>
                </div>
              </form>
            )}

            {filteredUsers.length ? (
              filteredUsers.map((user) => (
                <article className="company-user-card" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <small>{user.clientName || t.modes.company}</small>
                  </div>
                  <div className="company-user-management">
                    <span className={user.isActive ? "status-badge active" : "status-badge"}>
                      {user.isActive ? t.admin.users.active : t.admin.users.inactive}
                    </span>
                    <button
                      className="secondary-button compact"
                      onClick={() => startEdit(user)}
                      type="button"
                    >
                      {t.companyUsers.edit}
                    </button>
                    <button
                      className="secondary-button compact"
                      onClick={() => startPasswordReset(user)}
                      type="button"
                    >
                      {t.companyUsers.resetPassword}
                    </button>
                    <button
                      className="secondary-button compact"
                      onClick={() => onToggleUserStatus(user.id, !user.isActive)}
                      type="button"
                    >
                      {user.isActive ? t.admin.users.disable : t.admin.users.enable}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="user-routes-empty">{t.companyUsers.empty}</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
