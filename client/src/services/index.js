/*
|--------------------------------------------------------------------------
| Services Barrel
|--------------------------------------------------------------------------
| A single entry point for every API module, so components import from
| "../services" without needing to know which file a call lives in.
*/

export * from "./apiClient";
export * from "./authService";
export * from "./passwordRecoveryService";
export * from "./profileService";
export * from "./dashboardService";
export * from "./contestService";
export * from "./dailyProblemService";
export * from "./adminService";

export { default as notificationService } from "./notificationService";
export { default as reminderService } from "./reminderService";
