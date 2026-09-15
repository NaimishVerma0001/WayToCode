import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import { toast } from "react-toastify";

import {
  FaCheckCircle,
  FaCode,
  FaLink,
  FaSave,
  FaTimesCircle
} from "react-icons/fa";

import {
  updateCodingProfiles
} from "../services";

import "../styles/ConnectProfiles.css";

const PLATFORM_FIELDS = [
  {
    key: "leetcode",
    label: "LeetCode",
    placeholder: "e.g. naimish123",
    accent: "#ffa116"
  },
  {
    key: "codeforces",
    label: "Codeforces",
    placeholder: "e.g. tourist",
    accent: "#1f8acb"
  },
  {
    key: "codechef",
    label: "CodeChef",
    placeholder: "e.g. naimish_code",
    accent: "#8b5a2b"
  },
  {
    key: "geeksforgeeks",
    label: "GeeksforGeeks",
    placeholder: "e.g. naimish_gfg",
    accent: "#2f8d46"
  },
  {
    key: "hackerrank",
    label: "HackerRank",
    placeholder: "e.g. naimish_hr",
    accent: "#00a86b"
  },
  {
    key: "atcoder",
    label: "AtCoder",
    placeholder: "e.g. naimish_at",
    accent: "#64748b"
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "e.g. naimishverma",
    accent: "#8b5cf6"
  }
];

const createProfileState = (
  platforms = []
) => {
  return PLATFORM_FIELDS.reduce(
    (profiles, platform) => {
      const connectedPlatform =
        platforms.find(
          (item) =>
            item.key === platform.key
        );

      profiles[platform.key] =
        connectedPlatform?.username || "";

      return profiles;
    },
    {}
  );
};

const ConnectProfiles = ({
  platforms,
  onSaved
}) => {
  const [
    initialProfiles,
    setInitialProfiles
  ] = useState(
    () => createProfileState(platforms)
  );

  const [profiles, setProfiles] =
    useState(
      () => createProfileState(platforms)
    );

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [isSaving, setIsSaving] =
    useState(false);

  useEffect(() => {
    const nextProfiles =
      createProfileState(platforms);

    setInitialProfiles(nextProfiles);
    setProfiles(nextProfiles);
    setFieldErrors({});
  }, [platforms]);

  const changedProfiles = useMemo(
    () => {
      return PLATFORM_FIELDS.reduce(
        (changes, platform) => {
          const key = platform.key;

          const currentValue =
            profiles[key]?.trim() || "";

          const initialValue =
            initialProfiles[key]?.trim() ||
            "";

          if (
            currentValue !== initialValue
          ) {
            changes[key] = currentValue;
          }

          return changes;
        },
        {}
      );
    },
    [profiles, initialProfiles]
  );

  const hasChanges =
    Object.keys(changedProfiles)
      .length > 0;

  const connectedCount =
    Object.values(profiles).filter(
      (username) =>
        Boolean(username.trim())
    ).length;

  const validateChangedProfiles = () => {
    const errors = {};

    Object.entries(
      changedProfiles
    ).forEach(([platform, username]) => {
      if (!username) {
        return;
      }

      if (username.length > 50) {
        errors[platform] =
          "Username cannot exceed 50 characters.";

        return;
      }

      if (/\s/.test(username)) {
        errors[platform] =
          "Username cannot contain spaces.";

        return;
      }

      if (
        !/^[a-zA-Z0-9_.-]+$/.test(
          username
        )
      ) {
        errors[platform] =
          "Use only letters, numbers, dots, underscores or hyphens.";
      }
    });

    setFieldErrors(errors);

    return (
      Object.keys(errors).length === 0
    );
  };

  const handleInputChange = (
    platform,
    value
  ) => {
    setProfiles(
      (currentProfiles) => ({
        ...currentProfiles,
        [platform]: value
      })
    );

    setFieldErrors(
      (currentErrors) => {
        if (!currentErrors[platform]) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors
        };

        delete nextErrors[platform];

        return nextErrors;
      }
    );
  };

  const handleDisconnect = (
    platform
  ) => {
    handleInputChange(platform, "");
  };

  const handleReset = () => {
    setProfiles(initialProfiles);
    setFieldErrors({});

    toast.info(
      "Unsaved profile changes were reset.",
      {
        position: "top-center",
        autoClose: 1800,
        toastId:
          "coding-profiles-reset"
      }
    );
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      isSaving ||
      !hasChanges
    ) {
      return;
    }

    if (
      !validateChangedProfiles()
    ) {
      toast.error(
        "Please correct the highlighted usernames.",
        {
          position: "top-center",
          autoClose: 3000,
          toastId:
            "coding-profiles-validation"
        }
      );

      return;
    }

    setIsSaving(true);

    try {
      const updatedProfile =
        await updateCodingProfiles(
          changedProfiles
        );

      const savedProfiles = {
        ...profiles
      };

      setInitialProfiles(
        savedProfiles
      );

      toast.success(
        "Coding profiles updated successfully.",
        {
          position: "top-center",
          autoClose: 2500,
          toastId:
            "coding-profiles-success"
        }
      );

      await onSaved?.(
        updatedProfile
      );
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to update coding profiles.",
        {
          position: "top-center",
          autoClose: 4000,
          toastId:
            "coding-profiles-error"
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="connect-profiles-section"
      aria-labelledby="connect-profiles-title"
    >
      <div className="connect-profiles-header">
        <div className="connect-profiles-heading">
          <span className="connect-profiles-icon">
            <FaLink aria-hidden="true" />
          </span>

          <div>
            <span className="connect-profiles-eyebrow">
              Profile connections
            </span>

            <h2 id="connect-profiles-title">
              Manage Coding Profiles
            </h2>

            <p>
              Enter platform usernames to bring your live coding progress into Way2Code.
            </p>
          </div>
        </div>

        <div className="connect-profiles-count">
          <strong>{connectedCount}</strong>
          <span>of {PLATFORM_FIELDS.length} connected</span>
        </div>
      </div>

      <form
        className="connect-profiles-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="connect-profiles-grid">
          {PLATFORM_FIELDS.map(
            (platform) => {
              const username =
                profiles[platform.key] || "";

              const isConnected =
                Boolean(
                  initialProfiles[platform.key]?.trim()
                );

              const hasFieldChanged =
                username.trim() !==
                (
                  initialProfiles[platform.key]?.trim() || ""
                );

              return (
                <div
                  className={`connect-profile-field ${
                    fieldErrors[platform.key]
                      ? "connect-profile-field-error"
                      : ""
                  }`}
                  key={platform.key}
                  style={{
                    "--platform-accent":
                      platform.accent
                  }}
                >
                  <div className="connect-profile-label">
                    <div className="connect-profile-title-group">
                      <span className="connect-profile-platform-icon">
                        <FaCode aria-hidden="true" />
                      </span>

                      <label htmlFor={`profile-${platform.key}`}>
                        {platform.label}
                      </label>
                    </div>

                    <span
                      className={`connection-status ${
                        isConnected
                          ? "is-connected"
                          : "is-disconnected"
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <FaCheckCircle aria-hidden="true" />
                          Connected
                        </>
                      ) : (
                        <>
                          <FaTimesCircle aria-hidden="true" />
                          Not connected
                        </>
                      )}
                    </span>
                  </div>

                  <div className="connect-profile-control">
                    <div className="connect-profile-input-wrapper">
                      <span aria-hidden="true">@</span>
                      <input
                        id={`profile-${platform.key}`}
                        name={platform.key}
                        type="text"
                        autoComplete="off"
                        value={username}
                        placeholder={platform.placeholder}
                        disabled={isSaving}
                        aria-invalid={
                          Boolean(
                            fieldErrors[platform.key]
                          )
                        }
                        onChange={(event) =>
                          handleInputChange(
                            platform.key,
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {username ? (
                      <button
                        type="button"
                        className="disconnect-profile-button"
                        disabled={isSaving}
                        onClick={() =>
                          handleDisconnect(
                            platform.key
                          )
                        }
                        aria-label={`Clear ${platform.label} username`}
                        title={`Disconnect ${platform.label}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>

                  <div className="connect-profile-feedback">
                    {fieldErrors[platform.key] ? (
                      <span
                        id={`profile-${platform.key}-error`}
                        className="connect-profile-error"
                        role="alert"
                      >
                        {fieldErrors[platform.key]}
                      </span>
                    ) : (
                      hasFieldChanged && (
                        <span className="connect-profile-changed">
                          Unsaved change
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="connect-profiles-actions">
          <p>
            Enter usernames only. Do not paste complete profile URLs.
          </p>

          <div>
            <button
              type="button"
              className="connect-profiles-reset"
              onClick={handleReset}
              disabled={
                isSaving ||
                !hasChanges
              }
            >
              Reset
            </button>

            <button
              type="submit"
              className="connect-profiles-save"
              disabled={
                isSaving ||
                !hasChanges
              }
              aria-busy={isSaving}
            >
              <FaSave aria-hidden="true" />
              {isSaving
                ? "Saving..."
                : "Save Profiles"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default ConnectProfiles;