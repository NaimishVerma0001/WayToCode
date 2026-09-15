/*
|--------------------------------------------------------------------------
| Registration Constants
|--------------------------------------------------------------------------
*/

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/*
 * Allows one optional single space between two username parts.
 */

export const USERNAME_PATTERN =
  /^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)?$/;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
|--------------------------------------------------------------------------
| Normalization
|--------------------------------------------------------------------------
*/

export const normalizeUsername = (
  value
) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

export const normalizeEmail = (
  value
) => {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
};

/*
|--------------------------------------------------------------------------
| UTF-8 Byte Length
|--------------------------------------------------------------------------
|
| bcrypt considers only the first 72 bytes. Measuring bytes instead of
| JavaScript characters prevents silent password truncation.
|
*/

const getUtf8ByteLength = (
  value
) => {
  const text =
    String(value || "");

  if (
    typeof TextEncoder !==
    "undefined"
  ) {
    return new TextEncoder()
      .encode(text)
      .length;
  }

  /*
   * Fallback for older test environments.
   */

  return unescape(
    encodeURIComponent(text)
  ).length;
};

/*
|--------------------------------------------------------------------------
| Password Requirements
|--------------------------------------------------------------------------
*/

export const getPasswordRequirements =
  (
    password
  ) => {
    const value =
      typeof password ===
      "string"
        ? password
        : "";

    return {
      minimumLength:
        value.length >=
        PASSWORD_MIN_LENGTH,

      maximumLength:
        getUtf8ByteLength(
          value
        ) <=
        PASSWORD_MAX_BYTES,

      lowercase:
        /[a-z]/.test(value),

      uppercase:
        /[A-Z]/.test(value),

      number:
        /\d/.test(value),

      specialCharacter:
        /[^a-zA-Z0-9\s]/
          .test(value),

      noWhitespace:
        !/\s/.test(value)
    };
  };

export const passwordMeetsRequirements =
  (
    password
  ) => {
    return Object.values(
      getPasswordRequirements(
        password
      )
    ).every(Boolean);
  };

/*
|--------------------------------------------------------------------------
| Registration Validation
|--------------------------------------------------------------------------
*/

export const validateRegistrationDetails =
  ({
    username,
    email,
    password,
    confirmPassword
  } = {}) => {
    const errors = {};

    const normalizedUsername =
      normalizeUsername(
        username
      );

    const normalizedEmail =
      normalizeEmail(
        email
      );

    const safePassword =
      typeof password ===
      "string"
        ? password
        : "";

    const safeConfirmPassword =
      typeof confirmPassword ===
      "string"
        ? confirmPassword
        : "";

    /*
    |--------------------------------------------------------------------------
    | Username
    |--------------------------------------------------------------------------
    */

    if (!normalizedUsername) {
      errors.username =
        "Username is required.";
    } else if (
      normalizedUsername.length <
        USERNAME_MIN_LENGTH ||
      normalizedUsername.length >
        USERNAME_MAX_LENGTH
    ) {
      errors.username =
        (
          "Username must be between " +
          `${USERNAME_MIN_LENGTH} and ` +
          `${USERNAME_MAX_LENGTH} characters.`
        );
    } else if (
      !USERNAME_PATTERN.test(
        normalizedUsername
      )
    ) {
      errors.username =
        (
          "Use letters, numbers, underscores " +
          "or hyphens, with one optional " +
          "single space between two parts."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Email
    |--------------------------------------------------------------------------
    */

    if (!normalizedEmail) {
      errors.email =
        "Email address is required.";
    } else if (
      normalizedEmail.length > 254 ||
      !EMAIL_PATTERN.test(
        normalizedEmail
      )
    ) {
      errors.email =
        "Enter a valid email address.";
    }

    /*
    |--------------------------------------------------------------------------
    | Password
    |--------------------------------------------------------------------------
    */

    if (!safePassword) {
      errors.password =
        "Password is required.";
    } else {
      const requirements =
        getPasswordRequirements(
          safePassword
        );

      if (
        !requirements
          .minimumLength
      ) {
        errors.password =
          (
            "Password must contain at " +
            `least ${PASSWORD_MIN_LENGTH} ` +
            "characters."
          );
      } else if (
        !requirements
          .maximumLength
      ) {
        errors.password =
          (
            "Password is too long. " +
            `Use no more than ` +
            `${PASSWORD_MAX_BYTES} UTF-8 bytes.`
          );
      } else if (
        !requirements.lowercase
      ) {
        errors.password =
          (
            "Add at least one " +
            "lowercase letter."
          );
      } else if (
        !requirements.uppercase
      ) {
        errors.password =
          (
            "Add at least one " +
            "uppercase letter."
          );
      } else if (
        !requirements.number
      ) {
        errors.password =
          "Add at least one number.";
      } else if (
        !requirements
          .specialCharacter
      ) {
        errors.password =
          (
            "Add at least one " +
            "special character."
          );
      } else if (
        !requirements
          .noWhitespace
      ) {
        errors.password =
          (
            "Password cannot " +
            "contain spaces."
          );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Confirm Password
    |--------------------------------------------------------------------------
    */

    if (!safeConfirmPassword) {
      errors.confirmPassword =
        "Confirm your password.";
    } else if (
      safePassword !==
      safeConfirmPassword
    ) {
      errors.confirmPassword =
        "Passwords do not match.";
    }

    return {
      isValid:
        Object.keys(errors)
          .length === 0,

      errors,

      data: {
        username:
          normalizedUsername,

        email:
          normalizedEmail,

        password:
          safePassword,

        confirmPassword:
          safeConfirmPassword
      }
    };
  };