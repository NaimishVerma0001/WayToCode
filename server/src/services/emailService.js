// server/src/services/emailService.js

const nodemailer = require("nodemailer");
const { createRegistrationOtpEmail } = require("../emails/registrationOtpTemplate");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/
const DEFAULT_SMTP_PORT = 587;
let transporter = null;

/*
|--------------------------------------------------------------------------
| Configuration Helpers
|--------------------------------------------------------------------------
*/
const parseBoolean = (value) => {
    return String(value).toLowerCase().trim() === "true";
};

const hasSmtpConfiguration = () => {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.EMAIL_FROM
    );
};

const getRequiredConfiguration = () => {
    const configuration = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT,
        secure: parseBoolean(process.env.SMTP_SECURE),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM
    };

    const missingFields = [];
    if (!configuration.host) missingFields.push("SMTP_HOST");
    if (!configuration.user) missingFields.push("SMTP_USER");
    if (!configuration.password) missingFields.push("SMTP_PASS");
    if (!configuration.from) missingFields.push("EMAIL_FROM");

    if (missingFields.length > 0) {
        const error = new Error("Email configuration is incomplete.");
        error.code = "EMAIL_CONFIGURATION_MISSING";
        error.status = 503;
        error.missingFields = missingFields;
        throw error;
    }

    return configuration;
};

/*
|--------------------------------------------------------------------------
| HTML Escaping
|--------------------------------------------------------------------------
*/
const escapeHtml = (value) => {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/*
|--------------------------------------------------------------------------
| Reusable Transporter
|--------------------------------------------------------------------------
*/
const getTransporter = () => {
    if (transporter) return transporter;

    const configuration = getRequiredConfiguration();

    transporter = nodemailer.createTransport({
        host: configuration.host,
        port: configuration.port,
        secure: configuration.secure,
        auth: {
            user: configuration.user,
            pass: configuration.password
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });

    return transporter;
};

/*
|--------------------------------------------------------------------------
| Shared Email Delivery
|--------------------------------------------------------------------------
*/
const deliverEmail = async ({ to, subject, text, html }) => {
    if (!to?.trim() || !subject?.trim() || !text?.trim() || !html?.trim()) {
        const error = new Error("Email delivery details are incomplete.");
        error.code = "EMAIL_DETAILS_INCOMPLETE";
        error.status = 500;
        throw error;
    }

    const configuration = getRequiredConfiguration();
    const mailTransporter = getTransporter();

    const information = await mailTransporter.sendMail({
        from: configuration.from,
        to: to.trim(),
        subject: subject.trim(),
        text,
        html
    });

    return {
        delivered: true,
        developmentMode: false,
        messageId: information.messageId
    };
};

/*
|--------------------------------------------------------------------------
| Registration OTP Email
|--------------------------------------------------------------------------
*/
const sendRegistrationOtpEmail = async ({ to, username, otp, expiresInMinutes = 10 }) => {
    if (!to?.trim() || !/^\d{6}$/.test(otp)) {
        const error = new Error("Registration OTP email details are incomplete.");
        error.code = "REGISTRATION_EMAIL_DETAILS_INCOMPLETE";
        error.status = 500;
        throw error;
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Local development fallback
    if (!hasSmtpConfiguration() && !isProduction) {
        console.log("\n========== REGISTRATION OTP ==========");
        console.log("Recipient:", to.trim());
        console.log("OTP:", otp);
        console.log("Expires in:", `${expiresInMinutes} minutes`);
        console.log("======================================\n");

        return {
            delivered: false,
            developmentMode: true,
            messageId: null
        };
    }

    const emailContent = createRegistrationOtpEmail({ username, otp, expiresInMinutes });

    return deliverEmail({
        to,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
    });
};

/*
|--------------------------------------------------------------------------
| Password Reset Email
|--------------------------------------------------------------------------
*/
const sendPasswordResetEmail = async ({ to, username, resetUrl, expiresInMinutes = 15 }) => {
    if (!to || !resetUrl) {
        const error = new Error("Password reset email details are incomplete.");
        error.code = "PASSWORD_RESET_EMAIL_DETAILS_INCOMPLETE";
        error.status = 500;
        throw error;
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Local development fallback
    if (!hasSmtpConfiguration() && !isProduction) {
        console.log("\n========== PASSWORD RESET ==========");
        console.log("Recipient:", to);
        console.log("Reset URL:", resetUrl);
        console.log("Expires in:", `${expiresInMinutes} minutes`);
        console.log("====================================\n");

        return {
            delivered: false,
            developmentMode: true,
            messageId: null
        };
    }

    const safeUsername = escapeHtml(username || "Developer");
    const safeResetUrl = escapeHtml(resetUrl);
    const safeExpiration = Number(expiresInMinutes) || 15;
    const subject = "Reset your Way2Code password";

    const text = [
        `Hello ${username || "Developer"},`,
        "",
        "We received a request to reset your Way2Code password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        `This link expires in ${safeExpiration} minutes.`,
        "",
        "If you did not request this reset, you can ignore this email.",
        "",
        "— Way2Code Security"
    ].join("\n");

    const html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Reset your Way2Code password</title>
            </head>
            <body style="margin:0; padding:0; background:#070d19; font-family: Arial, Helvetica, sans-serif; color:#e2e8f0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px; background:#070d19;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; background:#101a2c; border: 1px solid #243148; border-radius:20px; overflow:hidden;">
                                <tr>
                                    <td style="padding:28px 32px; background: linear-gradient(135deg, #111c30, #101a2c); border-bottom: 1px solid #243148;">
                                        <div style="color:#818cf8; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">
                                            Way2Code Security
                                        </div>
                                        <h1 style="margin:10px 0 0; color:#ffffff; font-size:26px; line-height:1.25;">
                                            Reset your password
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:32px;">
                                        <p style="margin:0 0 16px; color:#cbd5e1; font-size:15px; line-height:1.7;">
                                            Hello <strong>${safeUsername}</strong>,
                                        </p>
                                        <p style="margin:0 0 24px; color:#94a3b8; font-size:14px; line-height:1.7;">
                                            We received a request to reset the password for your Way2Code account.
                                        </p>
                                        <a href="${safeResetUrl}" style="display:inline-block; padding:14px 22px; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; background: linear-gradient(135deg, #4f46e5, #2563eb); border-radius:11px;">
                                            Reset password
                                        </a>
                                        <p style="margin:24px 0 0; color:#64748b; font-size:12px; line-height:1.7;">
                                            This link expires in ${safeExpiration} minutes and can only be used once.
                                        </p>
                                        <p style="margin:14px 0 0; color:#64748b; font-size:12px; line-height:1.7;">
                                            If you did not request a password reset, no action is required.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 32px; color:#475569; font-size:11px; border-top: 1px solid #243148;">
                                        © Way2Code. Security notification.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;

    return deliverEmail({ to, subject, text, html });
};

/*
|--------------------------------------------------------------------------
| Account Welcome Email
|--------------------------------------------------------------------------
*/
const sendWelcomeEmail = async ({ to, username }) => {
    if (!to?.trim()) {
        const error = new Error("Welcome email details are incomplete.");
        error.code = "WELCOME_EMAIL_DETAILS_INCOMPLETE";
        error.status = 500;
        throw error;
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Local development fallback
    if (!hasSmtpConfiguration() && !isProduction) {
        console.log("\n========== WELCOME EMAIL ==========");
        console.log("Recipient:", to.trim());
        console.log("Username:", username || "Developer");
        console.log("===================================\n");

        return {
            delivered: false,
            developmentMode: true,
            messageId: null
        };
    }

    const displayUsername = typeof username === "string" && username.trim() ? username.trim() : "Developer";
    const safeUsername = escapeHtml(displayUsername);
    const subject = "Welcome to Way2Code — your account is ready";

    const text = [
        `Hello ${displayUsername},`,
        "",
        "Welcome to Way2Code! Your account has been created successfully.",
        "",
        "You can now connect your LeetCode, Codeforces, CodeChef, GitHub, and other coding profiles to track your progress in one place.",
        "",
        "Start building consistency, monitor your growth, and keep moving toward your coding goals.",
        "",
        "Happy coding!",
        "",
        "— The Way2Code Team"
    ].join("\n");

    const html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Welcome to Way2Code</title>
            </head>
            <body style="margin:0; padding:0; background:#070d19; color:#e2e8f0; font-family: Arial, Helvetica, sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; padding:40px 16px; background:#070d19;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%; max-width:580px; overflow:hidden; background:#101a2c; border: 1px solid #243148; border-radius:20px;">
                                <tr>
                                    <td style="padding:30px 32px; background:#111c30; border-bottom: 1px solid #243148;">
                                        <div style="color:#818cf8; font-size:12px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase;">
                                            Way2Code
                                        </div>
                                        <h1 style="margin:10px 0 0; color:#ffffff; font-size:28px; line-height:1.3;">
                                            Your coding journey starts here
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:32px;">
                                        <p style="margin:0 0 18px; color:#cbd5e1; font-size:16px; line-height:1.7;">
                                            Hello <strong style="color:#ffffff;">${safeUsername}</strong>,
                                        </p>
                                        <p style="margin:0 0 20px; color:#94a3b8; font-size:14px; line-height:1.8;">
                                            Welcome to Way2Code! Your email has been verified and your account has been created successfully.
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0; background:#0c1526; border: 1px solid #243148; border-radius:14px;">
                                            <tr>
                                                <td style="padding:22px;">
                                                    <div style="margin-bottom: 10px; color:#a5b4fc; font-size:13px; font-weight:700;">
                                                        What you can do
                                                    </div>
                                                    <div style="color:#94a3b8; font-size:13px; line-height:1.9;">
                                                        Connect your LeetCode, Codeforces, CodeChef, GitHub, and other coding profiles. Track your progress and build consistent coding habits.
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:0; color:#94a3b8; font-size:14px; line-height:1.8;">
                                            We are excited to be part of your development journey. Happy coding!
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 32px; color:#475569; font-size:11px; border-top: 1px solid #243148;">
                                        © Way2Code. Account notification.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;

    return deliverEmail({ to: to.trim(), subject, text, html });
};

/*
|--------------------------------------------------------------------------
| Contest Reminder Email
|--------------------------------------------------------------------------
*/
const sendReminderEmail = async ({ to, username, contestName, contestUrl, startsInMinutes = 10 }) => {
    if (!to?.trim()) {
        const error = new Error("Reminder email details are incomplete.");
        error.code = "REMINDER_EMAIL_DETAILS_INCOMPLETE";
        error.status = 500;
        throw error;
    }

    const isProduction = process.env.NODE_ENV === "production";

    // Local development fallback
    if (!hasSmtpConfiguration() && !isProduction) {
        console.log("\n========== CONTEST REMINDER ==========");
        console.log("Recipient:", to.trim());
        console.log("Contest:", contestName || "Upcoming contest");
        console.log("Starts in:", `${startsInMinutes} minutes`);
        console.log("======================================\n");

        return { delivered: false, developmentMode: true, messageId: null };
    }

    const displayUsername =
        typeof username === "string" && username.trim() ? username.trim() : "Developer";
    const displayContest =
        typeof contestName === "string" && contestName.trim()
            ? contestName.trim()
            : "your upcoming contest";

    const safeUsername = escapeHtml(displayUsername);
    const safeContest = escapeHtml(displayContest);
    const safeMinutes = Number(startsInMinutes) || 10;
    const safeUrl = contestUrl ? escapeHtml(contestUrl) : "";

    const subject = `Starting soon: ${displayContest}`;

    const text = [
        `Hello ${displayUsername},`,
        "",
        `${displayContest} starts in about ${safeMinutes} minutes.`,
        contestUrl ? `Contest link: ${contestUrl}` : "",
        "",
        "Good luck!",
        "",
        "— Way2Code"
    ]
        .filter((line) => line !== "")
        .join("\n");

    const html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>${safeContest} starts soon</title>
            </head>
            <body style="margin:0; padding:0; background:#070d19; color:#e2e8f0; font-family: Arial, Helvetica, sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px; background:#070d19;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; background:#101a2c; border:1px solid #243148; border-radius:20px; overflow:hidden;">
                                <tr>
                                    <td style="padding:28px 32px; background:#111c30; border-bottom:1px solid #243148;">
                                        <div style="color:#818cf8; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">
                                            Way2Code Reminder
                                        </div>
                                        <h1 style="margin:10px 0 0; color:#ffffff; font-size:26px; line-height:1.25;">
                                            ${safeContest} starts soon
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:32px;">
                                        <p style="margin:0 0 16px; color:#cbd5e1; font-size:15px; line-height:1.7;">
                                            Hello <strong>${safeUsername}</strong>,
                                        </p>
                                        <p style="margin:0 0 24px; color:#94a3b8; font-size:14px; line-height:1.7;">
                                            This is your reminder: the contest begins in about ${safeMinutes} minutes.
                                        </p>
                                        ${
                                            safeUrl
                                                ? `<a href="${safeUrl}" style="display:inline-block; padding:14px 22px; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; background: linear-gradient(135deg, #4f46e5, #2563eb); border-radius:11px;">Open the contest</a>`
                                                : ""
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 32px; color:#475569; font-size:11px; border-top:1px solid #243148;">
                                        &copy; Way2Code. Contest reminder.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;

    return deliverEmail({ to: to.trim(), subject, text, html });
};

/*
|--------------------------------------------------------------------------
| Verify SMTP Connection
|--------------------------------------------------------------------------
*/
const verifyEmailConfiguration = async () => {
    const mailTransporter = getTransporter();
    await mailTransporter.verify();
    return true;
};

module.exports = {
    sendRegistrationOtpEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendReminderEmail,
    verifyEmailConfiguration,
    hasSmtpConfiguration
};