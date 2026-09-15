import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  FaChartPie,
  FaClipboardList,
  FaRedoAlt,
  FaShieldAlt,
  FaSignOutAlt,
  FaUsers
} from "react-icons/fa";

import { toast } from "react-toastify";

import AdminOverview from
  "../components/AdminOverview";

import AdminUserTable from
  "../components/AdminUserTable";

import AdminAuditLog from
  "../components/AdminAuditLog";

import {
  getAdminOverview
} from "../services";

import "../styles/AdminPanel.css";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const OVERVIEW_REFRESH_INTERVAL =
  30 * 1000;

const ADMIN_TABS = [
  {
    id: "overview",
    label: "Overview",
    description:
      "Platform health and growth",
    icon: FaChartPie
  },
  {
    id: "users",
    label: "User Management",
    description:
      "Search and control accounts",
    icon: FaUsers
  },
  {
    id: "audit",
    label: "Audit History",
    description:
      "Review administrative actions",
    icon: FaClipboardList
  }
];

/*
|--------------------------------------------------------------------------
| Date Formatting
|--------------------------------------------------------------------------
*/

const formatRefreshTime = (
  value
) => {
  if (!value) {
    return "Not refreshed";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not refreshed";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Admin Panel
|--------------------------------------------------------------------------
*/

function AdminPanel({
  user,
  handleLogout,
  onExit
}) {
  const [activeTab, setActiveTab] =
    useState("overview");

  const [overview, setOverview] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastRefreshAt, setLastRefreshAt] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Load Overview
  |--------------------------------------------------------------------------
  */

  const loadOverview = useCallback(
    async ({
      signal,
      forceRefresh = false,
      silent = false
    } = {}) => {
      if (!silent) {
        if (overview) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
      }

      setError("");

      try {
        const result =
          await getAdminOverview({
            signal,
            refresh: forceRefresh
          });

        setOverview(result);

        setLastRefreshAt(
          result.generatedAt ||
          new Date().toISOString()
        );

        if (
          forceRefresh &&
          !silent
        ) {
          toast.success(
            "Administration data refreshed.",
            {
              position: "top-center",
              autoClose: 2200,
              toastId:
                "admin-overview-refreshed"
            }
          );
        }
      } catch (requestError) {
        if (
          requestError.name ===
          "AbortError"
        ) {
          return;
        }

        if (
          requestError.status === 401
        ) {
          toast.error(
            "Your session has expired.",
            {
              position: "top-center",
              autoClose: 2800,
              toastId:
                "admin-session-expired"
            }
          );

          handleLogout?.();
          return;
        }

        const message =
          requestError.status === 403
            ? (
              "Your account does not have " +
              "administrator permission."
            )
            : (
              requestError.message ||
              "Administration data could not be loaded."
            );

        setError(message);

        if (!silent) {
          toast.error(
            message,
            {
              position: "top-center",
              autoClose: 3500,
              toastId:
                "admin-overview-error"
            }
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      handleLogout,
      overview
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Initial Load and Controlled Polling
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (user?.role !== "admin") {
      setIsLoading(false);
      return undefined;
    }

    const controller =
      new AbortController();

    loadOverview({
      signal: controller.signal
    });

    const refreshTimer =
      window.setInterval(
        () => {
          loadOverview({
            signal:
              controller.signal,
            silent: true
          });
        },
        OVERVIEW_REFRESH_INTERVAL
      );

    return () => {
      controller.abort();

      window.clearInterval(
        refreshTimer
      );
    };
  }, [
    loadOverview,
    user?.role
  ]);

  /*
  |--------------------------------------------------------------------------
  | Document Title
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const previousTitle =
      document.title;

    document.title =
      "Admin Console | Way2Code";

    return () => {
      document.title =
        previousTitle;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Frontend Role Guard
  |--------------------------------------------------------------------------
  |
  | The backend still performs the authoritative security check.
  |
  */

  if (user?.role !== "admin") {
    return (
      <main className=
        "admin-console admin-access-denied"
      >
        <section
          className=
            "admin-access-card"
          role="alert"
        >
          <span className=
            "admin-access-icon"
          >
            <FaShieldAlt />
          </span>

          <span className=
            "admin-access-eyebrow"
          >
            Restricted workspace
          </span>

          <h1>
            Administrator access
            required
          </h1>

          <p>
            This area is reserved for
            authorised Way2Code
            administrators.
          </p>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
            >
              Return to Way2Code
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-console">
      <div className=
        "admin-console-glow admin-console-glow-one"
      />

      <div className=
        "admin-console-glow admin-console-glow-two"
      />

      <aside
        className="admin-sidebar"
        aria-label=
          "Administration navigation"
      >
        <div className=
          "admin-sidebar-brand"
        >
          <span>
            <FaShieldAlt />
          </span>

          <div>
            <strong>
              Way2Code
            </strong>

            <small>
              Admin Console
            </small>
          </div>
        </div>

        <div className=
          "admin-sidebar-context"
        >
          <span>
            Production
          </span>

          <i />

          <small>
            Secured workspace
          </small>
        </div>

        <nav className=
          "admin-sidebar-navigation"
        >
          <span className=
            "admin-sidebar-label"
          >
            Workspace
          </span>

          {ADMIN_TABS.map(
            (tab) => {
              const Icon =
                tab.icon;

              const selected =
                activeTab ===
                tab.id;

              return (
                <button
                  type="button"
                  key={tab.id}
                  className={
                    selected
                      ? "active"
                      : ""
                  }
                  aria-current={
                    selected
                      ? "page"
                      : undefined
                  }
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                >
                  <span>
                    <Icon />
                  </span>

                  <div>
                    <strong>
                      {tab.label}
                    </strong>

                    <small>
                      {
                        tab.description
                      }
                    </small>
                  </div>
                </button>
              );
            }
          )}
        </nav>

        <div className=
          "admin-sidebar-footer"
        >
          <div className=
            "admin-sidebar-account"
          >
            <span>
              {user.username
                ?.charAt(0)
                .toUpperCase() ||
                "A"}
            </span>

            <div>
              <strong>
                {user.username}
              </strong>

              <small>
                Administrator
              </small>
            </div>
          </div>

          <button
            type="button"
            className=
              "admin-exit-button"
            onClick={
              onExit ||
              handleLogout
            }
          >
            <FaSignOutAlt />

            Exit console
          </button>
        </div>
      </aside>

      <section className=
        "admin-workspace"
      >
        <header className=
          "admin-topbar"
        >
          <div>
            <span className=
              "admin-topbar-eyebrow"
            >
              Administration
            </span>

            <h1>
              {
                ADMIN_TABS.find(
                  (tab) =>
                    tab.id ===
                    activeTab
                )?.label
              }
            </h1>

            <p>
              Monitor Way2Code safely
              and manage platform
              accounts at scale.
            </p>
          </div>

          <div className=
            "admin-topbar-actions"
          >
            <div className=
              "admin-refresh-status"
            >
              <span
                className={
                  isRefreshing
                    ? "refreshing"
                    : ""
                }
              />

              <div>
                <small>
                  Last synchronised
                </small>

                <strong>
                  {
                    formatRefreshTime(
                      lastRefreshAt
                    )
                  }
                </strong>
              </div>
            </div>

            <button
              type="button"
              className=
                "admin-refresh-button"
              onClick={() =>
                loadOverview({
                  forceRefresh: true
                })
              }
              disabled={
                isRefreshing
              }
            >
              <FaRedoAlt
                className={
                  isRefreshing
                    ? (
                      "admin-spin"
                    )
                    : ""
                }
              />

              {isRefreshing
                ? "Refreshing"
                : "Refresh"}
            </button>
          </div>
        </header>

        <div className=
          "admin-mobile-navigation"
        >
          {ADMIN_TABS.map(
            (tab) => {
              const Icon =
                tab.icon;

              return (
                <button
                  type="button"
                  key={tab.id}
                  className={
                    activeTab ===
                    tab.id
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                >
                  <Icon />
                  {tab.label}
                </button>
              );
            }
          )}
        </div>

        {activeTab ===
          "overview" && (
          <AdminOverview
            overview={overview}
            isLoading={isLoading}
            error={error}
            onRetry={() =>
              loadOverview({
                forceRefresh: true
              })
            }
          />
        )}

        {activeTab ===
          "users" && (
          <AdminUserTable
            currentAdministrator={
              user
            }
            onOverviewChanged={() =>
              loadOverview({
                forceRefresh: true,
                silent: true
              })
            }
          />
        )}

        {activeTab ===
          "audit" && (
          <AdminAuditLog />
        )}
      </section>
    </main>
  );
}

export default AdminPanel;