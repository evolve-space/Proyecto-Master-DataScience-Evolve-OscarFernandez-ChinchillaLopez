import {
  createCompanyUser,
  getCompanyUsers,
  setCompanyUserStatus,
  updateCompanyUser,
  updateCompanyUserPassword,
} from "../services/companyService.js";

export async function getCompanyUserList(req, res) {
  const users = await getCompanyUsers(req.user);
  res.json({ items: users });
}

export async function postCompanyUser(req, res) {
  const user = await createCompanyUser(req.user, req.body || {});
  res.status(201).json(user);
}

export async function patchCompanyUser(req, res) {
  const user = await updateCompanyUser(req.user, req.params.userId, req.body || {});
  res.json(user);
}

export async function patchCompanyUserStatus(req, res) {
  const user = await setCompanyUserStatus(req.user, req.params.userId, req.body?.isActive);
  res.json(user);
}

export async function patchCompanyUserPassword(req, res) {
  const user = await updateCompanyUserPassword(req.user, req.params.userId, req.body?.password);
  res.json({
    ...user,
    message: "Password actualizada correctamente.",
  });
}
