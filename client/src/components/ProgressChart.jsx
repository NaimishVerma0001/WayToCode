import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  SiCodechef,
  SiCodeforces,
  SiGeeksforgeeks,
  SiGithub,
  SiHackerrank,
  SiLeetcode
} from "react-icons/si";

import {
  FaChartLine,
  FaCode,
  FaRedoAlt
} from "react-icons/fa";

import {
  getProgressHistory
} from "../services";

import "../styles/ProgressChart.css";

const PLATFORM_CONFIG = {
  leetcode: {
    label: "LeetCode",
    color: "#FFA116",
    metric: "Problems Solved",
    icon: SiLeetcode
  },

  codeforces: {
    label: "Codeforces",
    color: "#3B82F6",
    metric: "Problems Solved",
    icon: SiCodeforces
  },

  codechef: {
    label: "CodeChef",
    color: "#EF4444",
    metric: "Problems Solved",
    icon: SiCodechef
  },

  geeksforgeeks: {
    label: "GeeksforGeeks",
    color: "#22C55E",
    metric: "Problems Solved",
    icon: SiGeeksforgeeks
  },

  hackerrank: {
    label: "HackerRank",
    color: "#A855F7",
    metric: "Challenges Solved",
    icon: SiHackerrank
  },

  atcoder: {
    label: "AtCoder",
    color: "#E2E8F0",
    metric: "Problems Solved",
    icon: FaCode
  },

  github: {
    label: "GitHub",
    color: "#14B8A6",
    metric: "Contributions",
    icon: SiGithub
  }
};

const PLATFORM_KEYS = Object.keys(PLATFORM_CONFIG);

const HISTORY_RANGES = [
  7,
  30,
  90,
  365
];

const ENABLE_DEMO_PREVIEW =
  import.meta.env.VITE_APP_PROGRESS_DEMO === "true";

const numberFormatter = new Intl.NumberFormat("en-US");

const compactFormatter = new Intl.NumberFormat(
  "en-US",
  {
    notation: "compact",
    maximumFractionDigits: 1
  }
);

const safeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatDate = (dayKey) => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }
  );
};

const getMetric = (platformKey, platform) => {
  if (platformKey === "github") {
    return safeNumber(platform?.contributions);
  }

  return safeNumber(platform?.problemsSolved);
};

const transformSnapshots = (snapshots) => {
  return snapshots.map((snapshot) => {
    const point = {
      dayKey: snapshot.dayKey,
      date: formatDate(snapshot.dayKey)
    };

    PLATFORM_KEYS.forEach((platformKey) => {
      const platform = snapshot.platforms?.[platformKey];
      
      // Fallback check: if platform exists, pull metric even if strict 'available' flag is missing
      const hasValue = platform ? (platform.available !== false || getMetric(platformKey, platform) > 0) : false;

      point[platformKey] = hasValue
        ? getMetric(platformKey, platform)
        : null;
    });

    return point;
  });
};

const createPreviewData = ({
  latestSnapshot,
  platformKeys,
  days
}) => {
  if (!latestSnapshot || platformKeys.length === 0) {
    return [];
  }

  const pointCount = Math.min(days, 12);
  const endDate = new Date();
  endDate.setUTCHours(0, 0, 0, 0);

  return Array.from(
    { length: pointCount },
    (_, index) => {
      const pointDate = new Date(endDate);
      const distance = pointCount - index - 1;
      const interval =
        days <= 7
          ? 1
          : Math.max(
              1,
              Math.floor(days / (pointCount - 1))
            );

      pointDate.setUTCDate(
        pointDate.getUTCDate() - distance * interval
      );

      const progressRatio =
        pointCount === 1
          ? 1
          : 0.35 + (index / (pointCount - 1)) * 0.65;

      const point = {
        dayKey: pointDate.toISOString().slice(0, 10),
        date: formatDate(pointDate.toISOString().slice(0, 10))
      };

      platformKeys.forEach(
        (platformKey, platformIndex) => {
          const platform =
            latestSnapshot.platforms?.[platformKey];

          const currentValue = getMetric(
            platformKey,
            platform
          );

          const variation =
            ((index + platformIndex) % 3) * 0.015;

          point[platformKey] = Math.max(
            0,
            Math.round(
              currentValue *
                Math.min(
                  1,
                  progressRatio + variation
                )
            )
          );
        }
      );

      return point;
    }
  );
};

const CustomTooltip = ({
  active,
  payload,
  label
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const entries = payload.filter(
    (entry) =>
      entry.value !== null &&
      entry.value !== undefined
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="progress-tooltip">
      <p className="progress-tooltip-date">
        {label}
      </p>

      {entries.map((entry) => {
        const config =
          PLATFORM_CONFIG[entry.dataKey];
        if (!config) return null;

        return (
          <div
            className="progress-tooltip-row"
            key={entry.dataKey}
          >
            <span
              className="progress-tooltip-dot"
              style={{
                backgroundColor: config.color
              }}
            />

            <div>
              <span>{config.label}</span>
              <small>{config.metric}</small>
            </div>

            <strong>
              {numberFormatter.format(
                safeNumber(entry.value)
              )}
            </strong>
          </div>
        );
      })}
    </div>
  );
};

const ProgressChart = ({
  refreshToken = 0,
  onUnauthorized
}) => {
  const [history, setHistory] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedRange, setSelectedRange] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = useCallback(
    async ({ signal } = {}) => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getProgressHistory({
          days: selectedRange,
          signal
        });

        setHistory(response);
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        if (requestError.status === 401) {
          if (typeof onUnauthorized === "function") {
            onUnauthorized();
          }
          return;
        }

        setError(
          requestError.message ||
            "Unable to load progress history."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [selectedRange, onUnauthorized]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProgress({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [loadProgress, refreshToken]);

  const snapshots = useMemo(
    () => history?.snapshots || [],
    [history]
  );

  // FIXED: Robust platform detection fallback ensuring the chart renders properly
  const availablePlatforms = useMemo(() => {
    if (!snapshots.length) {
      // Fallback default keys if snapshots haven't populated yet
      return ["leetcode", "codeforces", "github"];
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    const snapshotPlatformKeys = latestSnapshot?.platforms
      ? Object.keys(latestSnapshot.platforms)
      : PLATFORM_KEYS;

    const detected = snapshotPlatformKeys.filter(
      (platformKey) =>
        snapshots.some((snapshot) => {
          const p = snapshot.platforms?.[platformKey];
          return p && (p.available !== false || getMetric(platformKey, p) > 0);
        })
    );

    return detected.length > 0 ? detected : ["leetcode", "codeforces", "github"];
  }, [snapshots]);

  useEffect(() => {
    if (
      selectedPlatform !== "all" &&
      !availablePlatforms.includes(selectedPlatform)
    ) {
      setSelectedPlatform("all");
    }
  }, [availablePlatforms, selectedPlatform]);

  const realChartData = useMemo(
    () => transformSnapshots(snapshots),
    [snapshots]
  );

  const isPreviewMode =
    ENABLE_DEMO_PREVIEW &&
    realChartData.length < 2 &&
    availablePlatforms.length > 0;

  const chartData = useMemo(() => {
    if (!isPreviewMode) {
      return realChartData;
    }

    return createPreviewData({
      latestSnapshot: snapshots[snapshots.length - 1],
      platformKeys: availablePlatforms,
      days: selectedRange
    });
  }, [
    isPreviewMode,
    realChartData,
    snapshots,
    availablePlatforms,
    selectedRange
  ]);

  const visiblePlatforms =
    selectedPlatform === "all"
      ? availablePlatforms
      : [selectedPlatform];

  const hasData =
    chartData.length > 0 && availablePlatforms.length > 0;

  return (
    <section className="progress-section">
      <div className="progress-chart-panel">
        <header className="progress-chart-header">
          <div>
            <h2>Problems Solved Over Time</h2>
            <p>Track cumulative progress across connected platforms.</p>
          </div>

          <div className="progress-chart-controls">
            <select
              aria-label="Progress time range"
              value={selectedRange}
              disabled={isLoading}
              onChange={(event) =>
                setSelectedRange(Number(event.target.value))
              }
            >
              {HISTORY_RANGES.map((range) => (
                <option value={range} key={range}>
                  {range === 365 ? "1 Year" : `${range} Days`}
                </option>
              ))}
            </select>

            <span className="progress-metric-label">
              Cumulative
              <span aria-hidden="true">⌄</span>
            </span>
          </div>
        </header>

        {isPreviewMode && (
          <div className="progress-preview-notice">
            Development preview data
          </div>
        )}

        {isLoading && !history && (
          <div className="progress-chart-state">
            <span className="progress-chart-loader" />
            <h3>Loading progress</h3>
            <p>Retrieving your coding history...</p>
          </div>
        )}

        {error && (
          <div
            className="progress-chart-state progress-chart-error"
            role="alert"
          >
            <h3>Progress unavailable</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadProgress()}
            >
              <FaRedoAlt />
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && !hasData && (
          <div className="progress-chart-state">
            <FaChartLine className="progress-empty-icon" />
            <h3>Progress history starts today</h3>
            <p>
              Connect a platform and refresh the dashboard to record your first snapshot.
            </p>
          </div>
        )}

        {!error && hasData && (
          <>
            <div className="progress-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 18,
                    right: 24,
                    bottom: 7,
                    left: 5
                  }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(148,163,184,.10)"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    minTickGap={25}
                    tick={{
                      fill: "#94A3B8",
                      fontSize: 12
                    }}
                    axisLine={{
                      stroke: "rgba(148,163,184,.14)"
                    }}
                  />

                  <YAxis
                    width={51}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: "#94A3B8",
                      fontSize: 12
                    }}
                    tickFormatter={(value) =>
                      compactFormatter.format(value)
                    }
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "rgba(148,163,184,.32)",
                      strokeDasharray: "4 4"
                    }}
                  />

                  {visiblePlatforms.map((platformKey) => {
                    const config = PLATFORM_CONFIG[platformKey];
                    if (!config) return null;

                    return (
                      <Line
                        key={platformKey}
                        type="monotone"
                        dataKey={platformKey}
                        stroke={config.color}
                        strokeWidth={3}
                        connectNulls={false}
                        dot={{
                          r: 3.5,
                          fill: config.color,
                          stroke: "#0F172A",
                          strokeWidth: 2
                        }}
                        activeDot={{
                          r: 6,
                          fill: config.color,
                          stroke: "#FFFFFF",
                          strokeWidth: 2
                        }}
                        animationDuration={700}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="progress-chart-legend">
              {visiblePlatforms.map((platformKey) => {
                const config = PLATFORM_CONFIG[platformKey];
                if (!config) return null;

                return (
                  <span key={platformKey}>
                    <i
                      style={{
                        background: config.color
                      }}
                    />
                    {config.label}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div
        className="progress-platform-buttons"
        role="group"
        aria-label="Select coding platform"
      >
        <button
          type="button"
          className={selectedPlatform === "all" ? "active" : ""}
          aria-pressed={selectedPlatform === "all"}
          onClick={() => setSelectedPlatform("all")}
        >
          <FaChartLine />
          All
        </button>

        {availablePlatforms.map((platformKey) => {
          const config = PLATFORM_CONFIG[platformKey];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <button
              type="button"
              key={platformKey}
              className={
                selectedPlatform === platformKey ? "active" : ""
              }
              aria-pressed={selectedPlatform === platformKey}
              style={{
                "--platform-color": config.color
              }}
              onClick={() => setSelectedPlatform(platformKey)}
            >
              <Icon />
              {config.label}
            </button>
          );
        })}
      </div>

      {!isPreviewMode && realChartData.length === 1 && (
        <p className="progress-first-point-note">
          Your first genuine snapshot is recorded. The line will grow as new daily snapshots are collected.
        </p>
      )}
    </section>
  );
};

export default ProgressChart;