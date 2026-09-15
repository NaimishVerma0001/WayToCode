import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  FaBan,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaClipboardCheck,
  FaHistory,
  FaRedoAlt,
  FaShieldAlt,
  FaUndo,
  FaUserCog
} from "react-icons/fa";

import {
  getAdminAuditLogs
} from "../services";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const PAGE_SIZE = 25;

const ACTION_CONFIG = {
  USER_BLOCKED: {
    label: "User blocked",
    description:
      "Account access was restricted",
    icon: FaBan,
    color: "red"
  },

  USER_UNBLOCKED: {
    label: "User unblocked",
    description:
      "Account access was restored",
    icon: FaUndo,
    color: "green"
  },

  USER_ROLE_CHANGED: {
    label: "Role changed",
    description:
      "Account permissions were updated",
    icon: FaUserCog,
    color: "violet"
  }
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatDate = (
  value
) => {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ).format(date);
};

const formatRelativeTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const timestamp =
    new Date(value).getTime();

  if (
    Number.isNaN(timestamp)
  ) {
    return "";
  }

  const difference =
    Date.now() - timestamp;

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 30) {
    return `${days}d ago`;
  }

  return formatDate(value);
};

const getPersonName = (
  person,
  fallback
) => {
  return (
    person?.username ||
    person?.email ||
    fallback
  );
};

const stringifyAuditValue = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not recorded";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return "Unable to display";
  }
};

/*
|--------------------------------------------------------------------------
| Audit History
|--------------------------------------------------------------------------
*/

function AdminAuditLog() {
  const [logs, setLogs] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      totalPages: 1,
      totalLogs: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });

  const [page, setPage] =
    useState(1);

  const [action, setAction] =
    useState("all");

  const [
    expandedLogId,
    setExpandedLogId
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Logs
  |--------------------------------------------------------------------------
  */

  const loadLogs =
    useCallback(
      async ({
        signal,
        refresh = false
      } = {}) => {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError("");

        try {
          const result =
            await getAdminAuditLogs({
              page,
              limit: PAGE_SIZE,
              action,
              signal
            });

          setLogs(
            Array.isArray(
              result.logs
            )
              ? result.logs
              : []
          );

          setPagination(
            result.pagination || {
              page,
              totalPages: 1,
              totalLogs: 0
            }
          );
        } catch (requestError) {
          if (
            requestError.name ===
            "AbortError"
          ) {
            return;
          }

          setError(
            requestError.message ||
            "Audit history could not be loaded."
          );
        } finally {
          if (!signal?.aborted) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      },
      [
        action,
        page
      ]
    );

  useEffect(() => {
    const controller =
      new AbortController();

    loadLogs({
      signal: controller.signal
    });

    return () => {
      controller.abort();
    };
  }, [loadLogs]);

  /*
  |--------------------------------------------------------------------------
  | Filter
  |--------------------------------------------------------------------------
  */

  const changeAction = (
    nextAction
  ) => {
    setAction(nextAction);
    setPage(1);
    setExpandedLogId("");
  };

  return (
    <section className=
      "admin-audit-section"
    >
      <header className=
        "admin-section-heading"
      >
        <div>
          <span className=
            "admin-card-eyebrow"
          >
            <FaClipboardCheck />
            Accountability ledger
          </span>

          <h2>
            Administration audit
            history
          </h2>

          <p>
            Review sensitive account
            actions performed by
            Way2Code administrators.
          </p>
        </div>

        <div className=
          "admin-audit-summary"
        >
          <span>
            Recorded actions
          </span>

          <strong>
            {new Intl.NumberFormat(
              "en-US"
            ).format(
              pagination.totalLogs ||
              0
            )}
          </strong>
        </div>
      </header>

      <div className=
        "admin-audit-toolbar"
      >
        <div
          className=
            "admin-audit-filters"
          role="group"
          aria-label=
            "Filter audit actions"
        >
          <button
            type="button"
            className={
              action === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              changeAction("all")
            }
          >
            <FaHistory />
            All actions
          </button>

          <button
            type="button"
            className={
              action ===
              "USER_BLOCKED"
                ? "active danger"
                : ""
            }
            onClick={() =>
              changeAction(
                "USER_BLOCKED"
              )
            }
          >
            <FaBan />
            Blocked
          </button>

          <button
            type="button"
            className={
              action ===
              "USER_UNBLOCKED"
                ? "active success"
                : ""
            }
            onClick={() =>
              changeAction(
                "USER_UNBLOCKED"
              )
            }
          >
            <FaUndo />
            Unblocked
          </button>

          <button
            type="button"
            className={
              action ===
              "USER_ROLE_CHANGED"
                ? "active"
                : ""
            }
            onClick={() =>
              changeAction(
                "USER_ROLE_CHANGED"
              )
            }
          >
            <FaUserCog />
            Role changes
          </button>
        </div>

        <button
          type="button"
          className=
            "admin-audit-refresh"
          disabled={isRefreshing}
          onClick={() =>
            loadLogs({
              refresh: true
            })
          }
        >
          <FaRedoAlt
            className={
              isRefreshing
                ? "admin-spin"
                : ""
            }
          />

          {isRefreshing
            ? "Refreshing"
            : "Refresh history"}
        </button>
      </div>

      <div className=
        "admin-audit-card"
      >
        {isLoading ? (
          <div className=
            "admin-table-loading"
          >
            <span />

            <h3>
              Loading audit history
            </h3>

            <p>
              Retrieving immutable
              administrative records...
            </p>
          </div>
        ) : error ? (
          <div
            className=
              "admin-table-state admin-table-error"
            role="alert"
          >
            <FaShieldAlt />

            <h3>
              Audit history
              unavailable
            </h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                loadLogs()
              }
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className=
            "admin-table-state"
          >
            <FaClipboardCheck />

            <h3>
              No audit records
            </h3>

            <p>
              Sensitive administrative
              actions will appear here.
            </p>

            {action !== "all" && (
              <button
                type="button"
                onClick={() =>
                  changeAction("all")
                }
              >
                View all actions
              </button>
            )}
          </div>
        ) : (
          <div className=
            "admin-audit-list"
          >
            {logs.map((log) => {
              const logId =
                log._id ||
                log.id;

              const configuration =
                ACTION_CONFIG[
                  log.action
                ] || {
                  label:
                    log.action ||
                    "Admin action",

                  description:
                    "Administrative change",

                  icon:
                    FaClipboardCheck,

                  color:
                    "violet"
                };

              const Icon =
                configuration.icon;

              const expanded =
                expandedLogId ===
                logId;

              return (
                <article
                  className={
                    `admin-audit-entry ` +
                    `admin-audit-${configuration.color}`
                  }
                  key={logId}
                >
                  <button
                    type="button"
                    className=
                      "admin-audit-entry-summary"
                    aria-expanded={
                      expanded
                    }
                    onClick={() =>
                      setExpandedLogId(
                        expanded
                          ? ""
                          : logId
                      )
                    }
                  >
                    <span className=
                      "admin-audit-entry-icon"
                    >
                      <Icon />
                    </span>

                    <div className=
                      "admin-audit-entry-action"
                    >
                      <strong>
                        {
                          configuration
                            .label
                        }
                      </strong>

                      <small>
                        {
                          configuration
                            .description
                        }
                      </small>
                    </div>

                    <div className=
                      "admin-audit-relationship"
                    >
                      <span>
                        <b>
                          {
                            getPersonName(
                              log.administrator,
                              "Unknown administrator"
                            )
                          }
                        </b>

                        <small>
                          performed action
                        </small>
                      </span>

                      <i aria-hidden="true">
                        →
                      </i>

                      <span>
                        <b>
                          {
                            getPersonName(
                              log.targetUser,
                              "Deleted user"
                            )
                          }
                        </b>

                        <small>
                          target account
                        </small>
                      </span>
                    </div>

                    <div className=
                      "admin-audit-time"
                    >
                      <strong>
                        {
                          formatRelativeTime(
                            log.createdAt
                          )
                        }
                      </strong>

                      <small>
                        {
                          formatDate(
                            log.createdAt
                          )
                        }
                      </small>
                    </div>

                    <span className=
                      "admin-audit-expand"
                    >
                      {expanded
                        ? <FaChevronUp />
                        : <FaChevronDown />
                      }
                    </span>
                  </button>

                  {expanded && (
                    <div className=
                      "admin-audit-entry-details"
                    >
                      <section>
                        <span>
                          Reason or note
                        </span>

                        <p>
                          {log.reason ||
                            (
                              "No administrative " +
                              "note was provided."
                            )
                          }
                        </p>
                      </section>

                      <div className=
                        "admin-audit-change-grid"
                      >
                        <section>
                          <span>
                            Previous value
                          </span>

                          <pre>
                            {
                              stringifyAuditValue(
                                log.previousValue
                              )
                            }
                          </pre>
                        </section>

                        <section>
                          <span>
                            New value
                          </span>

                          <pre>
                            {
                              stringifyAuditValue(
                                log.newValue
                              )
                            }
                          </pre>
                        </section>
                      </div>

                      <footer>
                        <span>
                          Record ID
                        </span>

                        <code>
                          {logId}
                        </code>

                        {log.requestMetadata
                          ?.requestId && (
                          <>
                            <span>
                              Request ID
                            </span>

                            <code>
                              {
                                log
                                  .requestMetadata
                                  .requestId
                              }
                            </code>
                          </>
                        )}
                      </footer>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!isLoading &&
          !error &&
          logs.length > 0 && (
          <footer className=
            "admin-table-pagination"
          >
            <p>
              Page{" "}
              <strong>
                {pagination.page}
              </strong>{" "}
              of{" "}
              <strong>
                {
                  pagination.totalPages
                }
              </strong>
            </p>

            <div>
              <button
                type="button"
                disabled={
                  !pagination
                    .hasPreviousPage
                }
                onClick={() =>
                  setPage(
                    (currentPage) =>
                      Math.max(
                        1,
                        currentPage - 1
                      )
                  )
                }
              >
                <FaChevronLeft />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  !pagination
                    .hasNextPage
                }
                onClick={() =>
                  setPage(
                    (currentPage) =>
                      currentPage + 1
                  )
                }
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}

export default AdminAuditLog;