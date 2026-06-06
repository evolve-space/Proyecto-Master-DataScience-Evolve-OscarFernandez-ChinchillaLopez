import bcrypt from "bcryptjs";
import { getDbPool } from "./db.js";

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

function assertCompanyAccount(currentUser) {
  if (currentUser.role.code === "client" && !currentUser.client?.id) {
    const error = new Error("La cuenta de empresa no esta asociada a ningun cliente.");
    error.statusCode = 400;
    throw error;
  }
}

async function getManageableCompanyUser(connection, currentUser, userId) {
  const parsedUserId = Number.parseInt(userId, 10);

  if (!Number.isFinite(parsedUserId)) {
    const error = new Error("Usuario no valido.");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await connection.execute(
    `
      SELECT
        u.id,
        u.client_id AS clientId,
        r.code AS roleCode
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = :userId
      LIMIT 1
    `,
    { userId: parsedUserId },
  );

  if (!rows.length || rows[0].roleCode !== "user") {
    const error = new Error("El usuario indicado no existe o no es un usuario final.");
    error.statusCode = 404;
    throw error;
  }

  if (
    currentUser.role.code === "client" &&
    Number(rows[0].clientId) !== Number(currentUser.client?.id)
  ) {
    const error = new Error("No puedes gestionar usuarios de otra empresa.");
    error.statusCode = 403;
    throw error;
  }

  return rows[0];
}

export async function getCompanyUsers(currentUser) {
  const pool = getDbPool();
  const params = {};
  let clientFilter = "";

  if (currentUser.role.code === "client") {
    clientFilter = "AND u.client_id = :clientId";
    params.clientId = currentUser.client?.id || null;
  }

  const [rows] = await pool.execute(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_active AS isActive,
        u.created_at AS createdAt,
        c.id AS clientId,
        c.name AS clientName
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN clients c ON c.id = u.client_id
      WHERE r.code = 'user'
        ${clientFilter}
      ORDER BY u.created_at DESC, u.id DESC
    `,
    params,
  );

  return rows;
}

export async function createCompanyUser(currentUser, payload) {
  assertCompanyAccount(currentUser);

  const name = requiredText(payload.name, "El nombre del usuario");
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || DEFAULT_PASSWORD);
  const clientId =
    currentUser.role.code === "client"
      ? currentUser.client.id
      : Number.parseInt(payload.clientId, 10);

  assertValidEmail(email);

  if (!Number.isFinite(clientId)) {
    const error = new Error("No se ha podido determinar la empresa del usuario.");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error("La password debe tener al menos 6 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { email },
    );

    if (existingUsers.length) {
      const error = new Error("Ya existe un usuario con ese email.");
      error.statusCode = 409;
      throw error;
    }

    const [roles] = await connection.execute(
      "SELECT id, name FROM roles WHERE code = 'user' LIMIT 1",
    );

    if (!roles.length) {
      const error = new Error("No existe el rol de usuario final.");
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await connection.execute(
      `
        INSERT INTO users (role_id, client_id, name, email, password_hash, is_active)
        VALUES (:roleId, :clientId, :name, :email, :passwordHash, TRUE)
      `,
      {
        roleId: roles[0].id,
        clientId,
        name,
        email,
        passwordHash,
      },
    );

    await connection.commit();

    return {
      id: result.insertId,
      name,
      email,
      clientId,
      roleCode: "user",
      roleName: roles[0].name,
      isActive: true,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCompanyUser(currentUser, userId, payload) {
  assertCompanyAccount(currentUser);

  const name = requiredText(payload.name, "El nombre del usuario");
  const email = normalizeEmail(payload.email);
  assertValidEmail(email);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getManageableCompanyUser(connection, currentUser, userId);

    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = :email AND id <> :userId LIMIT 1",
      { email, userId: Number.parseInt(userId, 10) },
    );

    if (existingUsers.length) {
      const error = new Error("Ya existe otro usuario con ese email.");
      error.statusCode = 409;
      throw error;
    }

    await connection.execute(
      "UPDATE users SET name = :name, email = :email WHERE id = :userId",
      { userId: Number.parseInt(userId, 10), name, email },
    );

    await connection.commit();

    return {
      id: Number.parseInt(userId, 10),
      name,
      email,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setCompanyUserStatus(currentUser, userId, isActive) {
  assertCompanyAccount(currentUser);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getManageableCompanyUser(connection, currentUser, userId);

    await connection.execute(
      "UPDATE users SET is_active = :isActive WHERE id = :userId",
      { userId: Number.parseInt(userId, 10), isActive: Boolean(isActive) },
    );

    await connection.commit();

    return {
      id: Number.parseInt(userId, 10),
      isActive: Boolean(isActive),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCompanyUserPassword(currentUser, userId, password) {
  assertCompanyAccount(currentUser);

  const nextPassword = String(password || "");

  if (nextPassword.length < 6) {
    const error = new Error("La password debe tener al menos 6 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getManageableCompanyUser(connection, currentUser, userId);

    const passwordHash = await bcrypt.hash(nextPassword, BCRYPT_ROUNDS);
    await connection.execute(
      "UPDATE users SET password_hash = :passwordHash WHERE id = :userId",
      { userId: Number.parseInt(userId, 10), passwordHash },
    );

    await connection.commit();

    return {
      id: Number.parseInt(userId, 10),
      hasPassword: true,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
