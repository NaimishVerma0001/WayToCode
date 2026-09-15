/*
|--------------------------------------------------------------------------
| HTML Escaping
|--------------------------------------------------------------------------
*/

const escapeHtml = (
    value
) => {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/*
|--------------------------------------------------------------------------
| Registration OTP Email Template
|--------------------------------------------------------------------------
*/

const createRegistrationOtpEmail = ({
    username,
    otp,
    expiresInMinutes
}) => {
    const safeUsername =
        escapeHtml(
            username || "Developer"
        );

    const safeOtp =
        escapeHtml(otp);

    const safeExpiration =
        Number.isFinite(
            Number(expiresInMinutes)
        )
            ? Number(
                expiresInMinutes
            )
            : 10;

    const formattedOtp =
        String(otp)
            .split("")
            .join(" ");

    return {
        subject:
            (
                `${otp} is your ` +
                "Way2Code verification code"
            ),

        text: [
            `Hello ${
                username ||
                "Developer"
            },`,
            "",
            (
                "Use the verification code " +
                "below to complete your " +
                "Way2Code registration:"
            ),
            "",
            formattedOtp,
            "",
            (
                "This code expires in " +
                `${safeExpiration} minutes.`
            ),
            "",
            (
                "Never share this code " +
                "with anyone."
            ),
            "",
            (
                "If you did not request " +
                "this account, you can " +
                "ignore this email."
            ),
            "",
            "— Way2Code Security"
        ].join("\n"),

        html: `
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    >

                    <title>
                        Verify your Way2Code email
                    </title>
                </head>

                <body
                    style="
                        margin:0;
                        padding:0;
                        background:#060d18;
                        color:#e2e8f0;
                        font-family:
                            Inter,
                            Arial,
                            Helvetica,
                            sans-serif;
                    "
                >
                    <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        style="
                            width:100%;
                            padding:42px 16px;
                            background:
                                linear-gradient(
                                    145deg,
                                    #060d18,
                                    #0a1727
                                );
                        "
                    >
                        <tr>
                            <td align="center">
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellspacing="0"
                                    cellpadding="0"
                                    style="
                                        width:100%;
                                        max-width:570px;
                                        overflow:hidden;
                                        background:#0e1a2c;
                                        border:
                                            1px solid #22324a;
                                        border-radius:22px;
                                        box-shadow:
                                            0 24px 70px
                                            rgba(0,0,0,.32);
                                    "
                                >
                                    <tr>
                                        <td
                                            style="
                                                padding:30px 34px;
                                                background:
                                                    linear-gradient(
                                                        135deg,
                                                        #12213a,
                                                        #0e1a2c
                                                    );
                                                border-bottom:
                                                    1px solid
                                                    #22324a;
                                            "
                                        >
                                            <div
                                                style="
                                                    color:#5eead4;
                                                    font-size:12px;
                                                    font-weight:800;
                                                    letter-spacing:
                                                        1.6px;
                                                    text-transform:
                                                        uppercase;
                                                "
                                            >
                                                Way2Code Security
                                            </div>

                                            <h1
                                                style="
                                                    margin:
                                                        11px 0 0;
                                                    color:#ffffff;
                                                    font-size:27px;
                                                    line-height:1.25;
                                                "
                                            >
                                                Verify your email
                                            </h1>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td
                                            style="
                                                padding:34px;
                                            "
                                        >
                                            <p
                                                style="
                                                    margin:0 0 15px;
                                                    color:#d7e0ec;
                                                    font-size:15px;
                                                    line-height:1.7;
                                                "
                                            >
                                                Hello
                                                <strong>
                                                    ${safeUsername}
                                                </strong>,
                                            </p>

                                            <p
                                                style="
                                                    margin:0 0 26px;
                                                    color:#94a3b8;
                                                    font-size:14px;
                                                    line-height:1.75;
                                                "
                                            >
                                                Enter this code in
                                                Way2Code to confirm
                                                your email address and
                                                finish creating your
                                                account.
                                            </p>

                                            <div
                                                aria-label="
                                                    Verification code
                                                    ${safeOtp}
                                                "
                                                style="
                                                    padding:
                                                        21px 18px;
                                                    color:#ecfeff;
                                                    background:
                                                        linear-gradient(
                                                            135deg,
                                                            #12314a,
                                                            #103f42
                                                        );
                                                    border:
                                                        1px solid
                                                        #1d6665;
                                                    border-radius:15px;
                                                    font-family:
                                                        Consolas,
                                                        Monaco,
                                                        monospace;
                                                    font-size:32px;
                                                    font-weight:800;
                                                    line-height:1;
                                                    letter-spacing:
                                                        10px;
                                                    text-align:center;
                                                "
                                            >
                                                ${safeOtp}
                                            </div>

                                            <p
                                                style="
                                                    margin:24px 0 0;
                                                    color:#7f90a7;
                                                    font-size:12px;
                                                    line-height:1.7;
                                                "
                                            >
                                                This code expires in
                                                ${safeExpiration}
                                                minutes.
                                            </p>

                                            <p
                                                style="
                                                    margin:12px 0 0;
                                                    color:#7f90a7;
                                                    font-size:12px;
                                                    line-height:1.7;
                                                "
                                            >
                                                Never share this code.
                                                Way2Code will never ask
                                                for it through chat,
                                                phone or social media.
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td
                                            style="
                                                padding:20px 34px;
                                                color:#5f7087;
                                                font-size:11px;
                                                line-height:1.6;
                                                border-top:
                                                    1px solid
                                                    #22324a;
                                            "
                                        >
                                            If you did not request
                                            this account, no action
                                            is required.
                                            <br>
                                            © Way2Code. Security
                                            notification.
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `
    };
};

module.exports = {
    createRegistrationOtpEmail
};