import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { toast } from "react-toastify";

import {
  FaBookmark,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
  FaFire,
  FaRedoAlt,
  FaRegBookmark
} from "react-icons/fa";

import {
  getDailyProblems
} from "../services";

import "../styles/DailyProblemRadar.css";

const BOOKMARK_STORAGE_KEY =
  "way2codeDailyProblemBookmarks";

const PLATFORM_CONFIG = {
  LeetCode: {
    shortName: "LC",
    accent: "#f59e0b"
  },

  GeeksforGeeks: {
    shortName: "GFG",
    accent: "#22c55e"
  },

  Codeforces: {
    shortName: "CF",
    accent: "#3b82f6"
  },

  CodeChef: {
    shortName: "CC",
    accent: "#a16207"
  }
};

const getStoredBookmarks = () => {
  try {
    const storedValue =
      localStorage.getItem(
        BOOKMARK_STORAGE_KEY
      );

    const parsedValue =
      storedValue
        ? JSON.parse(storedValue)
        : [];

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    localStorage.removeItem(
      BOOKMARK_STORAGE_KEY
    );

    return [];
  }
};

const formatUpdatedTime = (
  updatedAt
) => {
  if (!updatedAt) {
    return "Not available";
  }

  const date = new Date(updatedAt);

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
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const DailyProblemRadar = () => {
  const [problems, setProblems] =
    useState([]);

  const [metadata, setMetadata] =
    useState({
      total: 0,
      date: null,
      cached: false,
      partialFailure: false,
      failedProviders: [],
      updatedAt: null
    });

  const [bookmarks, setBookmarks] =
    useState(
      getStoredBookmarks
    );

  const [activePlatform, setActivePlatform] =
    useState("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDailyProblems =
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
            await getDailyProblems({
              signal,
              refresh
            });

          setProblems(
            result.problems
          );

          setMetadata({
            total: result.total,
            date: result.date,
            cached: result.cached,
            partialFailure:
              result.partialFailure,
            failedProviders:
              result.failedProviders,
            updatedAt:
              result.updatedAt
          });

          if (refresh) {
            toast.success(
              "Daily problems refreshed.",
              {
                position:
                  "top-center",
                autoClose: 2200,
                toastId:
                  "daily-problems-refreshed"
              }
            );
          }

          if (
            result.partialFailure
          ) {
            toast.info(
              "Some daily-problem providers are temporarily unavailable.",
              {
                position:
                  "top-center",
                autoClose: 3500,
                toastId:
                  "daily-problems-partial"
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

          const errorMessage =
            requestError.message ||
            (
              "Daily problems are " +
              "temporarily unavailable."
            );

          setError(errorMessage);

          if (refresh) {
            toast.error(
              errorMessage,
              {
                position:
                  "top-center",
                autoClose: 3500,
                toastId:
                  "daily-problems-error"
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
      []
    );

  useEffect(() => {
    const controller =
      new AbortController();

    loadDailyProblems({
      signal: controller.signal
    });

    return () => {
      controller.abort();
    };
  }, [loadDailyProblems]);

  useEffect(() => {
    localStorage.setItem(
      BOOKMARK_STORAGE_KEY,
      JSON.stringify(bookmarks)
    );
  }, [bookmarks]);

  const availablePlatforms =
    useMemo(() => {
      return [
        ...new Set(
          problems.map(
            (problem) =>
              problem.platform
          )
        )
      ];
    }, [problems]);

  const visibleProblems =
    useMemo(() => {
      if (
        activePlatform === "all"
      ) {
        return problems;
      }

      return problems.filter(
        (problem) =>
          problem.platform ===
          activePlatform
      );
    }, [
      activePlatform,
      problems
    ]);

  const toggleBookmark = (
    problem
  ) => {
    const isBookmarked =
      bookmarks.some(
        (bookmark) =>
          bookmark.id === problem.id
      );

    if (isBookmarked) {
      setBookmarks(
        (currentBookmarks) =>
          currentBookmarks.filter(
            (bookmark) =>
              bookmark.id !==
              problem.id
          )
      );

      toast.info(
        "Daily problem removed from saved problems.",
        {
          position: "top-center",
          autoClose: 2200,
          toastId:
            `daily-unbookmark-${problem.id}`
        }
      );

      return;
    }

    setBookmarks(
      (currentBookmarks) => [
        ...currentBookmarks,
        {
          id: problem.id,
          platform:
            problem.platform,
          title: problem.title,
          url: problem.url,
          difficulty:
            problem.difficulty,
          savedAt:
            new Date()
              .toISOString()
        }
      ]
    );

    toast.success(
      "Daily problem saved.",
      {
        position: "top-center",
        autoClose: 2200,
        toastId:
          `daily-bookmark-${problem.id}`
      }
    );
  };

  const isBookmarked = (
    problemId
  ) => {
    return bookmarks.some(
      (bookmark) =>
        bookmark.id ===
        problemId
    );
  };

  const openProblem = (
    url
  ) => {
    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (isLoading) {
    return (
      <section
        className=
          "daily-radar-section"
        aria-busy="true"
      >
        <div className=
          "daily-radar-loading"
        >
          <span className=
            "daily-radar-loader"
          />

          <div>
            <h3>
              Loading today’s
              problems
            </h3>

            <p>
              Checking supported
              coding platforms...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (
    error &&
    problems.length === 0
  ) {
    return (
      <section className=
        "daily-radar-section"
      >
        <div
          className=
            "daily-radar-error"
          role="alert"
        >
          <span aria-hidden="true">
            !
          </span>

          <div>
            <h3>
              Daily Problem Radar
              unavailable
            </h3>

            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadDailyProblems({
                refresh: true
              })
            }
            disabled={isRefreshing}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className=
        "daily-radar-section"
      aria-labelledby=
        "daily-radar-title"
    >
      <div className=
        "daily-radar-header"
      >
        <div className=
          "daily-radar-heading"
        >
          <span className=
            "daily-radar-eyebrow"
          >
            <FaFire />

            Daily practice radar
          </span>

          <h2 id="daily-radar-title">
            Today’s problems,
            gathered in one place
          </h2>

          <p>
            Discover official daily
            challenges and a curated
            Codeforces pick without
            searching across multiple
            platforms.
          </p>
        </div>

        <div className=
          "daily-radar-actions"
        >
          <div className=
            "daily-radar-update"
          >
            <FaCheckCircle />

            <span>
              <small>
                Last updated
              </small>

              <strong>
                {
                  formatUpdatedTime(
                    metadata.updatedAt
                  )
                }
              </strong>
            </span>
          </div>

          <button
            type="button"
            className=
              "daily-radar-refresh"
            onClick={() =>
              loadDailyProblems({
                refresh: true
              })
            }
            disabled={isRefreshing}
          >
            <FaRedoAlt
              className={
                isRefreshing
                  ? "daily-radar-spinning"
                  : ""
              }
            />

            {isRefreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </div>
      </div>

      <div
        className=
          "daily-radar-filters"
        aria-label=
          "Daily problem platforms"
      >
        <button
          type="button"
          className={
            activePlatform === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setActivePlatform(
              "all"
            )
          }
        >
          All problems

          <span>
            {problems.length}
          </span>
        </button>

        {availablePlatforms.map(
          (platform) => {
            const platformDetails =
              PLATFORM_CONFIG[
                platform
              ] || {
                shortName:
                  platform
                    .slice(0, 2)
                    .toUpperCase(),
                accent:
                  "#8b5cf6"
              };

            const count =
              problems.filter(
                (problem) =>
                  problem.platform ===
                  platform
              ).length;

            return (
              <button
                type="button"
                key={platform}
                className={
                  activePlatform ===
                  platform
                    ? "active"
                    : ""
                }
                style={{
                  "--daily-accent":
                    platformDetails
                      .accent
                }}
                onClick={() =>
                  setActivePlatform(
                    platform
                  )
                }
              >
                <span className=
                  "daily-platform-mark"
                >
                  {
                    platformDetails
                      .shortName
                  }
                </span>

                {platform}

                <span>{count}</span>
              </button>
            );
          }
        )}
      </div>

      <div className=
        "daily-problem-grid"
      >
        {visibleProblems.map(
          (problem) => {
            const platformDetails =
              PLATFORM_CONFIG[
                problem.platform
              ] || {
                shortName:
                  problem.platform
                    .slice(0, 2)
                    .toUpperCase(),

                accent:
                  "#8b5cf6"
              };

            const bookmarked =
              isBookmarked(
                problem.id
              );

            return (
              <article
                key={problem.id}
                className=
                  "daily-problem-card"
                style={{
                  "--daily-accent":
                    platformDetails
                      .accent
                }}
              >
                <div className=
                  "daily-problem-card-top"
                >
                  <div className=
                    "daily-problem-platform"
                  >
                    <span>
                      {
                        platformDetails
                          .shortName
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          problem
                            .platform
                        }
                      </strong>

                      <small>
                        {problem.type}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={
                      bookmarked
                        ? (
                          "daily-bookmark-button " +
                          "active"
                        )
                        : (
                          "daily-bookmark-button"
                        )
                    }
                    aria-label={
                      bookmarked
                        ? (
                          "Remove problem " +
                          "from saved problems"
                        )
                        : (
                          "Save this daily " +
                          "problem"
                        )
                    }
                    aria-pressed={
                      bookmarked
                    }
                    onClick={() =>
                      toggleBookmark(
                        problem
                      )
                    }
                  >
                    {bookmarked
                      ? <FaBookmark />
                      : <FaRegBookmark />
                    }
                  </button>
                </div>

                <div className=
                  "daily-problem-content"
                >
                  <div className=
                    "daily-problem-badges"
                  >
                    <span
                      className={
                        `daily-difficulty ` +
                        `daily-difficulty-${
                          String(
                            problem
                              .difficulty
                          )
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )
                        }`
                      }
                    >
                      {
                        problem
                          .difficulty ||
                        "Unrated"
                      }
                    </span>

                    {problem.rating && (
                      <span>
                        Rating{" "}
                        {
                          problem
                            .rating
                        }
                      </span>
                    )}

                    {problem.premiumOnly && (
                      <span className=
                        "daily-premium-badge"
                      >
                        Premium
                      </span>
                    )}
                  </div>

                  <h3>
                    {problem.title}
                  </h3>

                  <p>
                    {problem.summary}
                  </p>

                  {Array.isArray(
                    problem.topics
                  ) &&
                    problem.topics
                      .length > 0 && (
                    <div className=
                      "daily-problem-topics"
                    >
                      {problem.topics
                        .slice(0, 4)
                        .map(
                          (topic) => (
                            <span
                              key={
                                topic
                              }
                            >
                              {topic}
                            </span>
                          )
                        )}
                    </div>
                  )}
                </div>

                <div className=
                  "daily-problem-metrics"
                >
                  <div>
                    <FaClock />

                    <span>
                      <small>
                        Estimated
                      </small>

                      <strong>
                        {
                          problem
                            .estimatedMinutes
                        }{" "}
                        min
                      </strong>
                    </span>
                  </div>

                  {problem
                    .acceptanceRate !==
                    null &&
                    problem
                      .acceptanceRate !==
                      undefined && (
                    <div>
                      <FaCheckCircle />

                      <span>
                        <small>
                          Acceptance
                        </small>

                        <strong>
                          {
                            problem
                              .acceptanceRate
                          }
                          %
                        </strong>
                      </span>
                    </div>
                  )}

                  {problem.solvedCount && (
                    <div>
                      <FaCheckCircle />

                      <span>
                        <small>
                          Solved by
                        </small>

                        <strong>
                          {new Intl
                            .NumberFormat(
                              "en-US"
                            )
                            .format(
                              problem
                                .solvedCount
                            )}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className=
                  "daily-problem-footer"
                >
                  <span>
                    {problem.official
                      ? (
                        "Official daily " +
                        "challenge"
                      )
                      : (
                        "Way2Code daily " +
                        "selection"
                      )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      openProblem(
                        problem.url
                      )
                    }
                  >
                    View problem

                    <FaExternalLinkAlt />
                  </button>
                </div>
              </article>
            );
          }
        )}
      </div>

      {metadata.partialFailure && (
        <p
          className=
            "daily-radar-provider-note"
          role="status"
        >
          Some platforms could not be
          reached. Available daily
          problems are still displayed.
        </p>
      )}
    </section>
  );
};

export default DailyProblemRadar;