const { z } = require("zod");

// Registration Schema
const registerSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username cannot exceed 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters")
}).strict();

// OTP Request Schema
const requestOtpSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string()
}).strict().refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

// Login Schema
const loginSchema = z.object({
    username: z.string().min(1, "Username cannot be empty").optional(),
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(1, "Password is required")
}).refine(data => data.username || data.email, {
    message: "You must provide either a username or an email to log in.",
    path: ["username"] // Attaches the error to a field for the frontend to display
});

// Reminder Schema
const reminderSchema = z.object({
    contestId: z.string().min(1, "Contest ID is required"),
    contestStartTime: z.string().datetime({ message: "Invalid ISO datetime string" }),
    offsetMinutes: z.number().int().min(1).max(1440).optional().default(10)
}).strict();

const verifyOtpSchema = z.object({
    registrationId: z.string().min(1, "Registration ID is required"),
    otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must only contain numbers")
}).strict();

const resendOtpSchema = z.object({
    registrationId: z.string().min(1, "Registration ID is required")
}).strict();

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format")
}).strict();

// Password Reset Schema (Isolated with confirmPassword support)
const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required")
}).strict().refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

module.exports = {
    registerSchema,
    requestOtpSchema,
    loginSchema,
    reminderSchema,
    verifyOtpSchema,
    resendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};