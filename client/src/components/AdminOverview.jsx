import React, {
  useMemo
} from "react";

import {
  FaChartLine,
  FaCheckCircle,
  FaLink,
  FaShieldAlt,
  FaUserClock,
  FaUserLock,
  FaUserPlus,
  FaUsers
} from "react-icons/fa";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatNumber = (
  value
) => {
  return new Intl.NumberFormat(
    "en-US"
  ).format(
    Number(value) || 0
  );
};

const formatChartDate = (
  date
) => {
  if (!date) {
    return "";
  }

  const parsedDate =
    new Date(
      `${date}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "short"
    }
  ).format(parsedDate);
};

const formatGeneratedTime = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Chart Tooltip
|--------------------------------------------------------------------------
*/

const RegistrationTooltip = ({
  active,
  payload,
  label
}) => {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div className=
      "admin-chart-tooltip"
    >
      <span>
        {label}
      </span>

      <strong>
        {
          formatNumber(
            payload[0]?.value
          )
        }{" "}
        new user
        {
          Number(
            payload[0]?.value
          ) === 1
            ? ""
            : "s"
        }
      </strong>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Loading Skeleton
|--------------------------------------------------------------------------
*/

const AdminOverviewSkeleton =
  () => {
    return (
      <div
        className=
          "admin-overview-content"
        aria-label=
          "Loading administration overview"
        aria-busy="true"
      >
        <div className=
          "admin-stat-grid"
        >
          {Array.from(
            {
              length: 6
            },
            (_, index) => (
              <div
                className=
                  "admin-stat-skeleton"
                key={index}
              >
                <span />
                <strong />
                <small />
              </div>
            )
          )}
        </div>

        <div className=
          "admin-overview-main-grid"
        >
          <div className=
            "admin-chart-skeleton"
          />

          <div className=
            "admin-health-skeleton"
          />
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Administration Overview
|--------------------------------------------------------------------------
*/

function AdminOverview({
  overview,
  isLoading,
  error,
  onRetry
}) {
  const totals =
    overview?.totals || {};

  const percentages =
    overview?.percentages || {};

  const registrationTrend =
    useMemo(
      () => {
        const source =
          Array.isArray(
            overview
              ?.registrationTrend
          )
            ? overview
                .registrationTrend
            : [];

        return source.map(
          (entry) => ({
            ...entry,

            label:
              formatChartDate(
                entry.date
              ),

            users:
              Number(
                entry.users
              ) || 0
          })
        );
      },
      [overview]
    );

  const totalRegistrations =
    useMemo(
      () => {
        return registrationTrend
          .reduce(
            (
              total,
              entry
            ) =>
              total +
              entry.users,
            0
          );
      },
      [registrationTrend]
    );

  const statistics =
    useMemo(
      () => [
        {
          id: "total-users",
          label:
            "Total users",
          value:
            formatNumber(
              totals.users
            ),
          helper:
            "Registered accounts",
          icon: FaUsers,
          color: "blue"
        },
        {
          id: "active-users",
          label:
            "Active now",
          value:
            formatNumber(
              totals.activeUsers
            ),
          helper:
            (
              `${Number(
                percentages.active
              ) || 0}% of users`
            ),
          icon: FaUserClock,
          color: "green"
        },
        {
          id: "new-users",
          label:
            "New this week",
          value:
            formatNumber(
              totals.newUsersThisWeek
            ),
          helper:
            (
              `${formatNumber(
                totals.newUsersToday
              )} joined today`
            ),
          icon: FaUserPlus,
          color: "violet"
        },
        {
          id: "connected-users",
          label:
            "Profiles connected",
          value:
            formatNumber(
              totals
                .connectedProfileUsers
            ),
          helper:
            (
              `${Number(
                percentages
                  .connectedProfiles
              ) || 0}% adoption`
            ),
          icon: FaLink,
          color: "cyan"
        },
        {
          id: "blocked-users",
          label:
            "Blocked users",
          value:
            formatNumber(
              totals.blockedUsers
            ),
          helper:
            "Restricted accounts",
          icon: FaUserLock,
          color: "red"
        },
        {
          id: "administrators",
          label:
            "Administrators",
          value:
            formatNumber(
              totals.administrators
            ),
          helper:
            "Privileged accounts",
          icon: FaShieldAlt,
          color: "amber"
        }
      ],
      [
        percentages,
        totals
      ]
    );

  if (
    isLoading &&
    !overview
  ) {
    return (
      <AdminOverviewSkeleton />
    );
  }

  if (
    error &&
    !overview
  ) {
    return (
      <section
        className=
          "admin-panel-state admin-panel-error"
        role="alert"
      >
        <span>
          <FaShieldAlt />
        </span>

        <h2>
          Overview unavailable
        </h2>

        <p>{error}</p>

        <button
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className=
      "admin-overview-content"
    >
      <section
        className="admin-stat-grid"
        aria-label=
          "Platform statistics"
      >
        {statistics.map(
          (statistic) => {
            const Icon =
              statistic.icon;

            return (
              <article
                className={
                  `admin-stat-card ` +
                  `admin-stat-${statistic.color}`
                }
                key={
                  statistic.id
                }
              >
                <div className=
                  "admin-stat-card-header"
                >
                  <span>
                    {statistic.label}
                  </span>

                  <i>
                    <Icon />
                  </i>
                </div>

                <strong>
                  {statistic.value}
                </strong>

                <small>
                  {statistic.helper}
                </small>
              </article>
            );
          }
        )}
      </section>

      <section className=
        "admin-overview-main-grid"
      >
        <article className=
          "admin-analytics-card admin-growth-card"
        >
          <header className=
            "admin-card-heading"
          >
            <div>
              <span className=
                "admin-card-eyebrow"
              >
                <FaChartLine />
                Growth analytics
              </span>

              <h2>
                User registrations
              </h2>

              <p>
                New accounts created
                during the previous
                seven days.
              </p>
            </div>

            <div className=
              "admin-growth-total"
            >
              <span>
                7-day total
              </span>

              <strong>
                {
                  formatNumber(
                    totalRegistrations
                  )
                }
              </strong>
            </div>
          </header>

          <div
            className=
              "admin-growth-chart"
            aria-label=
              "Seven-day registration chart"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={
                  registrationTrend
                }
                margin={{
                  top: 18,
                  right: 12,
                  left: -16,
                  bottom: 0
                }}
              >
                <defs>
                  <linearGradient
                    id=
                      "adminRegistrationGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor=
                        "#6366f1"
                      stopOpacity=
                        {0.42}
                    />

                    <stop
                      offset="100%"
                      stopColor=
                        "#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray=
                    "4 6"
                  vertical={false}
                  stroke=
                    "rgba(148,163,184,.11)"
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#718096",
                    fontSize: 11
                  }}
                  dy={10}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#718096",
                    fontSize: 11
                  }}
                />

                <Tooltip
                  content={
                    <RegistrationTooltip />
                  }
                  cursor={{
                    stroke:
                      "rgba(129,140,248,.35)",

                    strokeDasharray:
                      "4 4"
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#818cf8"
                  strokeWidth={3}
                  fill=
                    "url(#adminRegistrationGradient)"
                  activeDot={{
                    r: 5,
                    fill: "#c7d2fe",
                    stroke: "#4f46e5",
                    strokeWidth: 3
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className=
          "admin-analytics-card admin-health-card"
        >
          <header className=
            "admin-card-heading"
          >
            <div>
              <span className=
                "admin-card-eyebrow"
              >
                <FaCheckCircle />
                Platform health
              </span>

              <h2>
                Operational status
              </h2>

              <p>
                Current administration
                and user-system health.
              </p>
            </div>
          </header>

          <div className=
            "admin-health-list"
          >
            <div>
              <span className=
                "admin-health-icon healthy"
              >
                <FaCheckCircle />
              </span>

              <section>
                <strong>
                  Authentication
                </strong>

                <small>
                  JWT protection active
                </small>
              </section>

              <b className="healthy">
                Operational
              </b>
            </div>

            <div>
              <span className=
                "admin-health-icon healthy"
              >
                <FaCheckCircle />
              </span>

              <section>
                <strong>
                  Account controls
                </strong>

                <small>
                  Block enforcement active
                </small>
              </section>

              <b className="healthy">
                Operational
              </b>
            </div>

            <div>
              <span className=
                "admin-health-icon healthy"
              >
                <FaCheckCircle />
              </span>

              <section>
                <strong>
                  Audit system
                </strong>

                <small>
                  Administrative actions
                  recorded
                </small>
              </section>

              <b className="healthy">
                Operational
              </b>
            </div>

            <div>
              <span className=
                "admin-health-icon neutral"
              >
                <FaUserClock />
              </span>

              <section>
                <strong>
                  Active-user window
                </strong>

                <small>
                  Recent authenticated
                  activity
                </small>
              </section>

              <b className="neutral">
                {
                  overview
                    ?.activeWindowMinutes ||
                  5
                }{" "}
                minutes
              </b>
            </div>
          </div>

          <footer className=
            "admin-health-footer"
          >
            <span>
              Data generated
            </span>

            <strong>
              {
                formatGeneratedTime(
                  overview
                    ?.generatedAt
                )
              }
            </strong>
          </footer>
        </article>
      </section>
    </div>
  );
}

export default AdminOverview;