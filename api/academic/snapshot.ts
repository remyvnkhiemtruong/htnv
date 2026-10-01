/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { authenticate, send } from "../auth/auth.js";
import { getAcademicSnapshot } from "../_lib/academic-service.js";
import { normalizeAcademicSnapshot } from "../_lib/content-compat.js";
import { getStudentOverview, getStudentWorkspace } from "../_lib/student-resources.js";

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const requestId = String(req.headers?.["x-vercel-id"] || req.headers?.["x-request-id"] || randomUUID());
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Request-Id", requestId);

  if (req.method !== "GET") return send(res, 405, { code: "METHOD_NOT_ALLOWED" });

  try {
    const authStartedAt = Date.now();
    const user = await authenticate(req);
    const authMs = Date.now() - authStartedAt;
    if (!user) {
      res.setHeader("Server-Timing", `auth;dur=${authMs}, total;dur=${Date.now() - startedAt}`);
      return send(res, 401, { code: "UNAUTHENTICATED" });
    }

    const scopeRaw = Array.isArray(req.query?.scope) ? req.query.scope[0] : req.query?.scope;
    const scope = String(scopeRaw || "");

    const dataStartedAt = Date.now();
    if (scope === "student-overview") {
      if (user.role !== "student") return send(res, 403, { code: "FORBIDDEN" });
      const overview = await getStudentOverview(user);
      const dataMs = Date.now() - dataStartedAt;
      res.setHeader("Server-Timing", `auth;dur=${authMs}, data;dur=${dataMs}, total;dur=${Date.now() - startedAt}`);
      return send(res, 200, { overview, requestId });
    }

    if (scope === "student-workspace") {
      if (user.role !== "student") return send(res, 403, { code: "FORBIDDEN" });
      const assignmentRaw = Array.isArray(req.query?.assignmentId) ? req.query.assignmentId[0] : req.query?.assignmentId;
      const assignmentId = String(assignmentRaw || "").trim().slice(0, 200);
      if (!assignmentId) return send(res, 400, { code: "ASSIGNMENT_REQUIRED", message: "Thiếu mã nhiệm vụ." });
      const workspace = await getStudentWorkspace(user, assignmentId);
      const dataMs = Date.now() - dataStartedAt;
      res.setHeader("Server-Timing", `auth;dur=${authMs}, data;dur=${dataMs}, total;dur=${Date.now() - startedAt}`);
      return send(res, 200, { workspace, requestId });
    }

    const snapshot = normalizeAcademicSnapshot(await getAcademicSnapshot(user));
    const dataMs = Date.now() - dataStartedAt;
    res.setHeader("Server-Timing", `auth;dur=${authMs}, data;dur=${dataMs}, total;dur=${Date.now() - startedAt}`);
    return send(res, 200, { snapshot, requestId });
  } catch (error: any) {
    const code = String(error?.message || "ACADEMIC_SNAPSHOT_ERROR");
    const status = code === "FORBIDDEN" ? 403 : code.includes("NOT_FOUND") ? 404 : 500;
    const log = status >= 500 ? console.error : console.warn;
    log("[academic/snapshot]", {
      requestId,
      code,
      route: "/api/academic/snapshot",
      region: process.env.VERCEL_REGION || "unknown",
      durationMs: Date.now() - startedAt,
      stack: process.env.NODE_ENV === "production" ? undefined : error?.stack
    });
    res.setHeader("Server-Timing", `total;dur=${Date.now() - startedAt}`);
    return send(res, status, {
      code: status === 500 ? "ACADEMIC_SNAPSHOT_ERROR" : code,
      message: status === 404 ? "Không tìm thấy nhiệm vụ hoặc bạn chưa được phân công." : status === 403 ? "Bạn không có quyền truy cập." : "Không thể tải dữ liệu học tập.",
      requestId
    });
  }
}
