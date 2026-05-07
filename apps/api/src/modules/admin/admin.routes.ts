import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminController } from "./admin.controller";

export const adminRouter: Router = Router();

const guard = [requireAuth, requireRole("admin")];

// Stream must be registered before /:id to avoid route collision.
// It uses its own query-param token auth (EventSource can't send headers).
adminRouter.get("/orders/stream", adminController.stream);

adminRouter.get("/orders", ...guard, asyncHandler(adminController.listOrders));
adminRouter.get("/orders/:id", ...guard, asyncHandler(adminController.getOrder));
adminRouter.patch("/orders/:id/status", ...guard, asyncHandler(adminController.updateStatus));
adminRouter.post("/orders/:id/notes", ...guard, asyncHandler(adminController.addNote));
adminRouter.get("/orders/:id/files/:fileType", ...guard, asyncHandler(adminController.getDownloadUrl));
