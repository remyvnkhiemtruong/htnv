/// <reference types="node" />
import { randomUUID } from "node:crypto";
import { authenticate, body, send } from "../auth/auth.js";
import { academicAction } from "../_lib/academic-service.js";
import { normalizeAcademicActionInput } from "../_lib/content-compat.js";

const AXES = ["plot_situation", "character_detail", "narrator_pov", "space_time", "language_tone_symbol", "form_argument"];

const boundedText = (value: unknown, max: number) => String(value ?? "").slice(0, max);

function normalizeCreateAssignmentInput(input: any) {
  const workflow = input?.workflowConfig && typeof input.workflowConfig === "object" && !Array.isArray(input.workflowConfig)
    ? input.workflowConfig
    : {};
  const prediction = input?.predictionTemplate && typeof input.predictionTemplate === "object" && !Array.isArray(input.predictionTemplate)
    ? input.predictionTemplate
    : {};
  const starter = input?.starterTemplate && typeof input.starterTemplate === "object" && !Array.isArray(input.starterTemplate)
    ? input.starterTemplate
    : {};

  const starterTemplate = Object.fromEntries(
    AXES.filter(axis => typeof starter[axis] === "string")
      .map(axis => [axis, boundedText(starter[axis], 12000)])
  );

  const predictionEnabled = workflow.predictionEnabled !== false && prediction.enabled !== false;
  const predictionQuestions = Array.isArray(prediction.questions)
    ? prediction.questions.slice(0, 30).map((item: unknown) => boundedText(item, 1500).trim()).filter(Boolean)
    : [];
  if (predictionEnabled && predictionQuestions.length === 0) throw new Error("PREDICTION_QUESTIONS_REQUIRED");

  return {
    ...input,
    starterTemplate,
    predictionTemplate: {
      enabled: predictionEnabled,
      prompt: boundedText(prediction.prompt, 12000),
      questions: predictionQuestions,
      requireConfidence: prediction.requireConfidence !== false
    },
    workflowConfig: {
      predictionEnabled,
      aiReviewRequired: true,
      aiReviewStages: ['initial'],
      teacherApprovalRequired: true,
      reflectionRequired: true,
      officialRubricRequired: true
    }
  };
}

const clientMessage = (code: string) => {
  const messages: Record<string, string> = {
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    TEACHER_CLASS_FORBIDDEN: "Bạn không được phân công lớp này.",
    PEER_ASSIGNMENT_FORBIDDEN: "Bài hoặc phiên bản này không được phân công cho bạn.",
    PORTFOLIO_NOT_FOUND: "Không tìm thấy hồ sơ phù hợp.",
    ASSIGNMENT_CLOSED: "Nhiệm vụ này đã đóng. Bạn không thể lưu hoặc nộp thêm.",
    VERSION_NOT_FOUND: "Không tìm thấy phiên bản phù hợp.",
    VERSION_REQUIRED: "Cần chọn đúng phiên bản đã nộp.",
    SUBMISSION_KEY_REQUIRED: "Khóa nộp bài không hợp lệ. Vui lòng thử lại.",
    SCHEMA_MIGRATION_REQUIRED: "Hệ thống đang nâng cấp dữ liệu ngữ liệu. Vui lòng thử lại sau.",
    CSRF_ORIGIN_MISMATCH: "Yêu cầu không hợp lệ.",
    VALIDATION_ERROR: "Dữ liệu gửi lên không hợp lệ.",
    REFLECTION_REQUIRED: "Em cần hoàn thành đủ phần tự phản tư trước khi gửi.",
    REFLECTION_REQUIRES_REVISION: "Tự phản tư chỉ được thực hiện sau phiên bản chỉnh sửa V2 trở đi.",
    REFLECTION_REQUIRED_BEFORE_OFFICIAL_RUBRIC: "Học sinh cần hoàn thành tự phản tư sau V2 trước khi giáo viên chấm rubric chính thức.",
    PREDICTION_QUESTIONS_REQUIRED: "Đã bật V0 nhưng nhiệm vụ chưa có câu hỏi dự đoán trước đọc.",
    PREDICTION_REQUIRED_FIRST: "Em cần nộp phần dự đoán trước khi nộp bài làm đầu tiên.",
    RUBRIC_NOT_FOUND: "Nhiệm vụ chưa có rubric hợp lệ. Vui lòng liên hệ giáo viên phụ trách.",
    AI_REVIEW_CLAIMED: "Bài này đang được một tài khoản AI khác xử lý.",
    AI_REVIEW_CLOSED: "Phản hồi AI này đã được xử lý hoặc không còn mở.",
    DRAFT_CONFLICT: "Bản nháp đã được cập nhật ở một phiên khác. Hệ thống đã giữ nguyên nội dung trên máy này; hãy tải lại và đối chiếu trước khi lưu tiếp.",
    PORTFOLIO_READ_ONLY: "Hồ sơ hiện đã khóa theo quy trình và không thể chỉnh sửa hoặc nộp thêm.",
    PREDICTION_ALREADY_SUBMITTED: "Em đã nộp dự đoán. Hãy tải lại để bắt đầu bài làm đầu tiên.",
    INITIAL_ALREADY_SUBMITTED: "Em đã nộp bài đầu tiên. Hãy tải lại để xem bài đã lưu và chờ góp ý.",
    REVISION_ALREADY_SUBMITTED: "Em đã nộp bài chỉnh sửa. Hãy hoàn thành phần tự nhìn lại bài làm.",
    PREDICTION_WINDOW_CLOSED: "Em đã nộp bài đầu tiên nên không thể nộp thêm dự đoán.",
    INITIAL_VERSION_REQUIRED: "Em cần nộp bài đầu tiên trước khi nộp bài chỉnh sửa.",
    FEEDBACK_REQUIRED_BEFORE_REVISION: "Em cần chờ góp ý cho bài đầu tiên trước khi nộp bài chỉnh sửa.",
    REVISION_REASON_REQUIRED: "Em hãy ghi lý do sửa bài trước khi nộp.",
    INVALID_CONFIDENCE: "Em hãy chọn mức tự tin từ 1 đến 5."
  };
  if (code.startsWith("INVALID_RUBRIC_LEVEL")) return "Mức rubric không hợp lệ.";
  return messages[code] || "Không thể thực hiện thao tác. Vui lòng thử lại.";
};

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const requestId = String(req.headers?.["x-vercel-id"] || req.headers?.["x-request-id"] || randomUUID());
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Request-Id", requestId);

  if (req.method !== "POST") return send(res, 405, { code: "METHOD_NOT_ALLOWED" });

  try {
    const authStartedAt = Date.now();
    const user = await authenticate(req);
    const authMs = Date.now() - authStartedAt;
    if (!user) {
      res.setHeader("Server-Timing", `auth;dur=${authMs}, total;dur=${Date.now() - startedAt}`);
      return send(res, 401, { code: "UNAUTHENTICATED" });
    }

    const rawInput = body(req);
    const rawBytes = Buffer.byteLength(JSON.stringify(rawInput), "utf8");
    if (rawBytes > 1_000_000) throw new Error("CONTENT_TOO_LARGE");

    const actionStartedAt = Date.now();
    let input = normalizeAcademicActionInput(rawInput);
    if (input?.action === "create_assignment") input = normalizeCreateAssignmentInput(input);
    const result = await academicAction(user, input, req);
    const actionMs = Date.now() - actionStartedAt;
    res.setHeader("Server-Timing", `auth;dur=${authMs}, action;dur=${actionMs}, total;dur=${Date.now() - startedAt}`);
    return send(res, 200, result);
  } catch (error: any) {
    const code = String(error?.message || "ACADEMIC_ACTION_ERROR");
    let status = 500;
    if (code === "CSRF_ORIGIN_MISMATCH" || code === "FORBIDDEN" || code.endsWith("_FORBIDDEN") || code === "FORBIDDEN_STUDENT_RUBRIC") status = 403;
    else if (code.includes("NOT_FOUND")) status = 404;
    else if (code === "ASSIGNMENT_CLOSED" || code === "AI_REVIEW_CLAIMED" || code === "AI_REVIEW_CLOSED" || code === "DRAFT_CONFLICT" || code === "PORTFOLIO_READ_ONLY" || code === "PREDICTION_ALREADY_SUBMITTED" || code === "PREDICTION_WINDOW_CLOSED" || code === "INITIAL_ALREADY_SUBMITTED" || code === "REVISION_ALREADY_SUBMITTED") status = 409;
    else if (code.startsWith("INVALID") || code.includes("REQUIRED") || code === "EMPTY_RESPONSE" || code === "CANNOT_PEER_REVIEW_SELF" || code === "VALIDATION_ERROR" || code === "PREDICTION_ALREADY_SUBMITTED" || code === "PEER_REVIEWER_INVALID" || code === "PEER_STUDENT_INVALID" || code === "CONTENT_TOO_LARGE" || code === "SCHEMA_MIGRATION_REQUIRED") status = 400;

    const log = status >= 500 ? console.error : console.warn;
    log("[academic/action]", {
      requestId,
      code,
      status,
      route: "/api/academic/action",
      region: process.env.VERCEL_REGION || "unknown",
      durationMs: Date.now() - startedAt
    });
    res.setHeader("Server-Timing", `total;dur=${Date.now() - startedAt}`);
    return send(res, status, { code, message: clientMessage(code), requestId });
  }
}
