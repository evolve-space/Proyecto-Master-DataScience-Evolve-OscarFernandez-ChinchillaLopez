import bcrypt from "bcryptjs";
import { getDbPool, withTransaction } from "./db.js";

const DEFAULT_PASSWORD = "demo1234";
const BCRYPT_ROUNDS = 10;

function requiredText(value, fieldName) {
  const text = String(value || "").trim();

  if (!text) {
    const error = new Error(`${fieldName} es obligatorio.`);
    error.statusCode = 400;
    throw error;
  }

  return text;
}

function optionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeEmail(value) {
  return requiredText(value, "El email").toLowerCase();
}

function assertValidEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("El email no tiene un formato valido.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeSpanishPhone(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const phone = text.replace(/\D/g, "");

  if (phone.length !== 9) {
    const error = new Error("El telefono debe tener 9 numeros sin contar el prefijo +34.");
    error.statusCode = 400;
    throw error;
  }

  return `+34${phone}`;
}

async function getRoleByCode(connection, roleCode) {
  const [rows] = await connection.execute(
    "SELECT id, code, name FROM roles WHERE code = :roleCode LIMIT 1",
    { roleCode },
  );

  if (!rows.length) {
    const error = new Error("El rol indicado no existe.");
    error.statusCode = 400;
    throw error;
  }

  return rows[0];
}

async function getClientIdForUser(connection, roleCode, clientId) {
  if (roleCode === "admin") {
    return null;
  }

  const parsedClientId = Number.parseInt(clientId, 10);

  if (!Number.isFinite(parsedClientId)) {
    const error = new Error("Debes seleccionar una empresa para este usuario.");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await connection.execute(
    "SELECT id FROM clients WHERE id = :clientId LIMIT 1",
    { clientId: parsedClientId },
  );

  if (!rows.length) {
    const error = new Error("La empresa seleccionada no existe.");
    error.statusCode = 400;
    throw error;
  }

  return parsedClientId;
}

export async function getAdminOverview() {
  const pool = getDbPool();
  const [roles] = await pool.execute("SELECT id, code, name, description FROM roles ORDER BY id");
  const [clients] = await pool.execute(
    `
      SELECT
        c.id,
        c.name,
        c.client_type AS clientType,
        c.contact_email AS contactEmail,
        c.contact_phone AS contactPhone,
        c.notes,
        c.created_at AS createdAt,
        COUNT(DISTINCT u.id) AS userCount,
        COUNT(DISTINCT rt.id) AS routeCount
      FROM clients c
      LEFT JOIN users u ON u.client_id = c.id
      LEFT JOIN routes rt ON rt.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC, c.id DESC
    `,
  );
  const [users] = await pool.execute(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_active AS isActive,
        u.created_at AS createdAt,
        r.code AS roleCode,
        r.name AS roleName,
        c.id AS clientId,
        c.name AS clientName,
        CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END AS hasPassword
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN clients c ON c.id = u.client_id
      ORDER BY u.created_at DESC, u.id DESC
    `,
  );
  const [statsRows] = await pool.execute(
    `
      SELECT
        (SELECT COUNT(*) FROM clients) AS totalClients,
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS activeUsers,
        (SELECT COUNT(*) FROM routes) AS totalRoutes,
        (SELECT COUNT(*) FROM pois) AS totalPois
    `,
  );

  return {
    roles,
    clients,
    users,
    stats: statsRows[0] || {},
  };
}

export async function createClient(payload) {
  const name = requiredText(payload.name, "El nombre de la empresa");
  const clientType = optionalText(payload.clientType) || "empresa";
  const contactEmail = optionalText(payload.contactEmail);
  const contactPhone = normalizeSpanishPhone(payload.contactPhone);
  const notes = optionalText(payload.notes);
  const createCompanyUser = Boolean(payload.createCompanyUser);
  const companyUserName = optionalText(payload.companyUserName) || name;
  const companyUserEmail = optionalText(payload.companyUserEmail) || contactEmail;
  const companyUserPassword = String(payload.companyUserPassword || DEFAULT_PASSWORD);

  if (contactEmail) {
    assertValidEmail(contactEmail);
  }

  if (createCompanyUser) {
    if (!companyUserEmail) {
      const error = new Error("Indica el email de acceso de la empresa.");
      error.statusCode = 400;
      throw error;
    }

    assertValidEmail(companyUserEmail);

    if (companyUserPassword.length < 6) {
      const error = new Error("La password debe tener al menos 6 caracteres.");
      error.statusCode = 400;
      throw error;
    }
  }

  return withTransaction(async (connection) => {
    const [clientResult] = await connection.execute(
      `
        INSERT INTO clients (name, client_type, contact_email, contact_phone, notes)
        VALUES (:name, :clientType, :contactEmail, :contactPhone, :notes)
      `,
      { name, clientType, contactEmail, contactPhone, notes },
    );

    const clientId = clientResult.insertId;
    let companyUser = null;

    if (createCompanyUser) {
      const role = await getRoleByCode(connection, "client");
      const normalizedUserEmail = companyUserEmail.toLowerCase();
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE email = :email LIMIT 1",
        { email: normalizedUserEmail },
      );

      if (existingUsers.length) {
        const error = new Error("Ya existe un usuario con ese email.");
        error.statusCode = 409;
        throw error;
      }

      const passwordHash = await bcrypt.hash(companyUserPassword, BCRYPT_ROUNDS);
      const [userResult] = await connection.execute(
        `
          INSERT INTO users (role_id, client_id, name, email, password_hash, is_active)
          VALUES (:roleId, :clientId, :name, :email, :passwordHash, TRUE)
        `,
        {
          roleId: role.id,
          clientId,
          name: companyUserName,
          email: normalizedUserEmail,
          passwordHash,
        },
      );

      companyUser = {
        id: userResult.insertId,
        name: companyUserName,
        email: normalizedUserEmail,
        roleCode: role.code,
      };
    }

    return {
      id: clientId,
      name,
      clientType,
      contactEmail,
      contactPhone,
      notes,
      companyUser,
    };
  });
}

export async function createUser(payload) {
  const name = requiredText(payload.name, "El nombre del usuario");
  const email = normalizeEmail(payload.email);
  const roleCode = requiredText(payload.roleCode, "El rol");
  const password = String(payload.password || DEFAULT_PASSWORD);

  assertValidEmail(email);

  if (password.length < 6) {
    const error = new Error("La password debe tener al menos 6 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (connection) => {
    const role = await getRoleByCode(connection, roleCode);
    const clientId = await getClientIdForUser(connection, role.code, payload.clientId);
    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { email },
    );

    if (existingUsers.length) {
      const error = new Error("Ya existe un usuario con ese email.");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [result] = await connection.execute(
      `
        INSERT INTO users (role_id, client_id, name, email, password_hash, is_active)
        VALUES (:roleId, :clientId, :name, :email, :passwordHash, TRUE)
      `,
      {
        roleId: role.id,
        clientId,
        name,
        email,
        passwordHash,
      },
    );

    return {
      id: result.insertId,
      name,
      email,
      roleCode: role.code,
      roleName: role.name,
      clientId,
      hasPassword: true,
      defaultPasswordUsed: !payload.password,
    };
  });
}

export async function setUserActiveStatus(userId, isActive) {
  const parsedUserId = Number.parseInt(userId, 10);

  if (!Number.isFinite(parsedUserId)) {
    const error = new Error("Usuario no valido.");
    error.statusCode = 400;
    throw error;
  }

  const pool = getDbPool();
  const [result] = await pool.execute(
    "UPDATE users SET is_active = :isActive WHERE id = :userId",
    { userId: parsedUserId, isActive: Boolean(isActive) },
  );

  if (result.affectedRows === 0) {
    const error = new Error("Usuario no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: parsedUserId,
    isActive: Boolean(isActive),
  };
}

export async function updateUserPassword(userId, password) {
  const parsedUserId = Number.parseInt(userId, 10);
  const nextPassword = String(password || "");

  if (!Number.isFinite(parsedUserId)) {
    const error = new Error("Usuario no valido.");
    error.statusCode = 400;
    throw error;
  }

  if (nextPassword.length < 6) {
    const error = new Error("La password debe tener al menos 6 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(nextPassword, BCRYPT_ROUNDS);
  const pool = getDbPool();
  const [result] = await pool.execute(
    "UPDATE users SET password_hash = :passwordHash WHERE id = :userId",
    { userId: parsedUserId, passwordHash },
  );

  if (result.affectedRows === 0) {
    const error = new Error("Usuario no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: parsedUserId,
    hasPassword: true,
  };
}
