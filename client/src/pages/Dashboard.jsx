import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-toastify";
import { FiActivity, FiCheckCircle, FiCode, FiLink } from "react-icons/fi";

import ProgressChart from "../components/ProgressChart";
import DashboardHeader from "../components/DashboardHeader";
import StatsCard from "../components/StatsCard";
import PlatformCard from "../components/PlatformCard";
import ConnectProfiles from "../components/ConnectProfiles";
import RankLadder from "../components/RankLadder";
import { getDashboard } from "../services";
import "../styles/Dashboard.css";

const TOTAL_PLATFORMS = 7;

const PLATFORM_CONFIG = {
  leetcode: { platform: "LeetCode", accent: "#FFA116" },
  codeforces: { platform: "Codeforces", accent: "#1F8ACB" },
  codechef: { platform: "CodeChef", accent: "#8B5A2B" },
  geeksforgeeks: { platform: "GeeksforGeeks", accent: "#2F8D46" },
  hackerrank: { platform: "HackerRank", accent: "#00EA64" },
  atcoder: { platform: "AtCoder", accent: "#5B5B5B" },
  github: { platform: "GitHub", accent: "#8B5CF6" }
};

const safeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

// ARCHITECTURE FIX: Resilient unwrapper that handles varying backend REST envelopes
const getInnerPlatformData = (platformEntry) => {
  if (!platformEntry) return {};
  if (platformEntry.data?.data) return platformEntry.data.data;
  if (platformEntry.data) return platformEntry.data;
  return platformEntry;
};

const createPlatformMetrics = (key, platformData) => {
  switch (key) {
    case "leetcode":
      return [
        { label: "Easy Solved", value: platformData.problemsSolved?.easy },
        { label: "Medium Solved", value: platformData.problemsSolved?.medium },
        { label: "Hard Solved", value: platformData.problemsSolved?.hard },
        { label: "Total Solved", value: platformData.problemsSolved?.total }
      ];
    case "codeforces":
      return [
        { label: "Current Rating", value: platformData.rating?.current },
        { label: "Maximum Rating", value: platformData.rating?.maximum },
        { label: "Problems Solved", value: platformData.problems?.solved },
        { label: "Rank", value: platformData.rating?.rank }
      ];
    case "codechef":
      return [
        { label: "Current Rating", value: platformData.rating?.current },
        { label: "Highest Rating", value: platformData.rating?.highest },
        { label: "Stars", value: platformData.rating?.stars ? `${platformData.rating.stars}★` : null },
        { label: "Problems Solved", value: platformData.problems?.solved }
      ];
    case "geeksforgeeks":
      return [
        { label: "Coding Score", value: platformData.score?.coding },
        { label: "Problems Solved", value: platformData.problems?.solved },
        { label: "Current Streak", value: platformData.activity?.currentStreak ? `${platformData.activity.currentStreak} days` : null },
        { label: "Institute Rank", value: platformData.score?.instituteRank ? `#${platformData.score.instituteRank}` : null }
      ];
    case "hackerrank":
      return [
        { label: "Challenges Solved", value: platformData.statistics?.solved },
        { label: "Practice Score", value: platformData.statistics?.practiceScore },
        { label: "Badges", value: platformData.badges?.length },
        { label: "Certificates", value: platformData.certificates?.length }
      ];
    case "atcoder":
      return [
        { label: "Current Rating", value: platformData.rating?.current },
        { label: "Highest Rating", value: platformData.rating?.highest },
        { label: "Rated Matches", value: platformData.rating?.ratedMatches },
        { label: "Problems Solved", value: platformData.problems?.solved }
      ];
    case "github":
      return [
        { label: "Public Repositories", value: platformData.publicRepositories },
        { label: "Followers", value: platformData.followers },
        { label: "Following", value: platformData.following },
        { label: "Public Gists", value: platformData.publicGists }
      ];
    default:
      return [];
  }
};

const getProfileUrl = (key, platformData) => {
  if (platformData.profile?.profileUrl) return platformData.profile.profileUrl;
  if (platformData.profileUrl) return platformData.profileUrl;

  const username = platformData.username || platformData.profile?.handle;
  if (!username) return "";

  const profileUrls = {
    leetcode: `https://leetcode.com/u/${username}/`,
    codeforces: `https://codeforces.com/profile/${username}`,
    codechef: `https://www.codechef.com/users/${username}`,
    geeksforgeeks: `https://www.geeksforgeeks.org/profile/${username}`,
    hackerrank: `https://www.hackerrank.com/profile/${username}`,
    atcoder: `https://atcoder.jp/users/${username}`,
    github: `https://github.com/${username}`
  };

  return profileUrls[key] || "";
};

const normalizePlatform = (key, platformEntry) => {
  const config = PLATFORM_CONFIG[key] || { platform: key, accent: "#6366F1" };
  const connected = Boolean(platformEntry?.connected);
  const rawPlatformData = getInnerPlatformData(platformEntry);
  
  const serviceResponse = platformEntry?.data;
  
  // ARCHITECTURE FIX: Prevents false-negatives if the scraper returns valid data but omits a literal 'success: true' boolean
  const success = Boolean(
    connected && 
    (serviceResponse?.success !== false) && 
    (Object.keys(rawPlatformData).length > 0)
  );

  return {
    key,
    platform: config.platform,
    accent: config.accent,
    connected,
    success,
    username: platformEntry?.username || serviceResponse?.username || "",
    error: serviceResponse?.error || platformEntry?.error || "",
    metrics: createPlatformMetrics(key, rawPlatformData),
    profileUrl: getProfileUrl(key, rawPlatformData),
    rawData: rawPlatformData
  };
};

const getSolvedCount = (platform) => {
  const data = platform.rawData;
  switch (platform.key) {
    case "leetcode":
      return safeNumber(data.problemsSolved?.total);
    case "codeforces":
    case "codechef":
    case "geeksforgeeks":
    case "atcoder":
      return safeNumber(data.problems?.solved);
    case "hackerrank":
      return safeNumber(data.statistics?.solved);
    default:
      return 0;
  }
};

const Dashboard = ({ user, handleLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  
  const logoutRef = useRef(handleLogout);
  useEffect(() => {
    logoutRef.current = handleLogout;
  }, [handleLogout]);

  const loadDashboard = useCallback(async ({ signal, refresh = false } = {}) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    setError("");

    try {
      const response = await getDashboard({ signal, refresh });
      
      // DEBUG: If cards are still blank after this fix, uncomment this log to verify if MongoDB contains the handles.
      // console.log("Raw dashboardData:", response); 
      
      setDashboardData(response);
      setProgressRefreshToken((currentToken) => currentToken + 1);

      if (refresh) {
        toast.success("Dashboard data refreshed.", {
          position: "top-center",
          autoClose: 2000,
          toastId: "dashboard-refresh-success"
        });
      }
    } catch (requestError) {
      if (requestError.name === "AbortError") return;

      if (requestError.status === 401) {
        toast.error("Your session has expired.", {
          position: "top-center",
          autoClose: 2500,
          toastId: "dashboard-session-expired"
        });
        logoutRef.current();
        return;
      }

      const errorMessage = requestError.message || "Unable to load dashboard data.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 3500,
        toastId: "dashboard-load-error"
      });
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard]);

  // Session keep-alive logic
  useEffect(() => {
    const keepAliveInterval = setInterval(async () => {
      try {
        await getDashboard({ refresh: false });
      } catch (err) {
        if (err.status === 401) {
          toast.error("Session expired due to inactivity.");
          logoutRef.current();
        }
      }
    }, 10 * 60 * 1000); 

    return () => clearInterval(keepAliveInterval);
  }, []);

  const platforms = useMemo(() => {
    const sourcePlatforms = dashboardData?.platforms || {};
    return Object.keys(PLATFORM_CONFIG).map((key) => normalizePlatform(key, sourcePlatforms[key]));
  }, [dashboardData]);

  const summary = useMemo(() => {
    const connectedPlatforms = platforms.filter((p) => p.connected);
    const successfulPlatforms = connectedPlatforms.filter((p) => p.success);
    const totalProblemsSolved = successfulPlatforms.reduce((total, p) => total + getSolvedCount(p), 0);
    const gfgPlatform = successfulPlatforms.find((p) => p.key === "geeksforgeeks");
    const currentStreak = safeNumber(gfgPlatform?.rawData?.activity?.currentStreak);
    const progressScore = connectedPlatforms.length > 0
      ? Math.round((successfulPlatforms.length / connectedPlatforms.length) * 100)
      : 0;

    return {
      totalProblemsSolved,
      connectedPlatforms: connectedPlatforms.length,
      successfulPlatforms: successfulPlatforms.length,
      currentStreak,
      progressScore
    };
  }, [platforms]);

  const codeforces = useMemo(
    () => platforms.find((platform) => platform.key === "codeforces"),
    [platforms]
  );

  const codeforcesRating = safeNumber(codeforces?.rawData?.rating?.current);
  const codeforcesHandle = codeforces?.username || "";

  const stats = useMemo(() => [
    {
      id: "problems-solved",
      title: "Problems solved",
      value: new Intl.NumberFormat("en-US").format(summary.totalProblemsSolved),
      meta: "across every connected platform",
      icon: <FiCode />
    },
    {
      id: "connected-platforms",
      title: "Platforms connected",
      value: summary.connectedPlatforms,
      meta: `${TOTAL_PLATFORMS - summary.connectedPlatforms} still available`,
      icon: <FiLink />
    },
    {
      id: "available-platforms",
      title: "Reporting data",
      value: summary.successfulPlatforms,
      meta: `of ${summary.connectedPlatforms} connected`,
      icon: <FiCheckCircle />
    },
    {
      id: "data-health",
      title: "Fetch health",
      value: `${summary.progressScore}%`,
      meta: "last refresh",
      icon: <FiActivity />
    }
  ], [summary]);

  const filteredPlatforms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return platforms;

    return platforms.filter((platform) =>
      platform.platform.toLowerCase().includes(normalizedSearch) ||
      platform.username.toLowerCase().includes(normalizedSearch)
    );
  }, [platforms, searchTerm]);

  if (isLoading && !dashboardData) {
    return (
      <main className="dashboard-page" aria-busy="true">
        <div className="dashboard-loading-state">
          <span className="dashboard-loader" />
          <h2>Loading your dashboard</h2>
          <p>Fetching live statistics from your connected platforms...</p>
        </div>
      </main>
    );
  }

  if (error && !dashboardData) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-error-state" role="alert">
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
          <button type="button" className="primary-btn" onClick={() => loadDashboard()}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader
        user={dashboardData?.user || user}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={() => loadDashboard({ refresh: true })}
        isRefreshing={isRefreshing}
        lastUpdated={dashboardData?.metadata?.generatedAt}
      />
      <section className="dashboard-summary" aria-label="Dashboard summary">
        <div className="stats-grid">
          {stats.map((item) => (
            <StatsCard key={item.id} data={item} />
          ))}
        </div>

        <RankLadder
          rating={codeforcesRating}
          handle={codeforcesHandle}
        />
      </section>

      {/* Side by side rather than stacked: the chart and the connect panel are
          both reference surfaces, and stacking them doubled the scroll. */}
      <div className="dashboard-split">
        <ProgressChart refreshToken={progressRefreshToken} onUnauthorized={() => logoutRef.current()} />

        <ConnectProfiles
          platforms={platforms}
          onSaved={async () => { await loadDashboard({ refresh: true }); }}
        />
      </div>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Connected Platforms</h2>
            <p>Live competitive programming profile data</p>
          </div>
          <span>{filteredPlatforms.length} platform{filteredPlatforms.length === 1 ? "" : "s"}</span>
        </div>

        {filteredPlatforms.length > 0 ? (
          <div className="platform-grid">
            {filteredPlatforms.map((platform) => (
              <PlatformCard
                key={platform.key}
                data={platform}
                onRefresh={() => loadDashboard({ refresh: true })}
                isRefreshing={isRefreshing}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-search">
            <h3>No platform found</h3>
            <p>Try searching with a platform name or connected username.</p>
            <button type="button" className="secondary-btn" onClick={() => setSearchTerm("")}>
              Clear Search
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;