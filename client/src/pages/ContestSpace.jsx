// client/src/pages/ContestSpace.js

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FaBell, FaBookmark, FaCalendarAlt, FaExternalLinkAlt, FaFire, FaSearch, FaSyncAlt } from "react-icons/fa";

import ContestCard from "../components/ContestCard";
import DailyProblemRadar from "../components/DailyProblemRadar";
import { getUpcomingContests, setContestReminder as apiSetReminder, removeContestReminder as apiRemoveReminder } from "../services/contestService";
import "../styles/ContestSpace.css";

const REMINDER_STORAGE_KEY = "way2codeContestReminders";
const BOOKMARK_STORAGE_KEY = "way2codeContestBookmarks";

const PLATFORM_CONFIG = {
  codeforces: { name: "Codeforces", shortName: "CF", color: "#3B82F6" },
  leetcode: { name: "LeetCode", shortName: "LC", color: "#FFA116" },
  codechef: { name: "CodeChef", shortName: "CC", color: "#A16207" }
};

const readStoredArray = (storageKey) => {
  try {
    const storedValue = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(storedValue) ? storedValue : [];
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
};

const createContestKey = (contest) => `${String(contest.platform || "platform").toLowerCase()}:${contest.id}`;

const normalizeContest = (contest) => {
  const startTime = new Date(contest.startTime);
  return {
    ...contest,
    id: contest.id,
    platform: String(contest.platform || "").trim(),
    contestName: String(contest.contestName || "Untitled contest").trim(),
    startTime: startTime.toISOString(),
    duration: Number(contest.duration) || 0,
    url: contest.url || "",
    type: contest.type || "Contest"
  };
};

const getContestStatus = (contest, currentTime) => {
  const startTime = new Date(contest.startTime).getTime();
  const endTime = startTime + Number(contest.duration || 0) * 60 * 1000;

  if (currentTime >= startTime && currentTime <= endTime) return "live";
  if (currentTime > endTime) return "ended";
  if (startTime - currentTime <= 6 * 60 * 60 * 1000) return "starting-soon";
  return "upcoming";
};

const getTimeUntilContest = (contest, currentTime) => {
  const difference = new Date(contest.startTime).getTime() - currentTime;
  if (difference <= 0) return "Live now";

  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const formatContestDate = (startTime) => {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(startTime));
};

function ContestSpace() {
  const [contests, setContests] = useState([]);
  const [metadata, setMetadata] = useState({ total: 0, cached: false, lastUpdated: null, platforms: {} });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [reminders, setReminders] = useState(() =>
    readStoredArray(REMINDER_STORAGE_KEY).filter((reminder) => Number(reminder.reminderAt) > Date.now())
  );

  const [bookmarkedContestIds, setBookmarkedContestIds] = useState(() => readStoredArray(BOOKMARK_STORAGE_KEY));

  const persistReminders = (nextReminders) => {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(nextReminders));
    setReminders(nextReminders);
  };

  const loadContests = useCallback(async ({ manual = false, signal } = {}) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await getUpcomingContests({ signal });
      const normalizedContests = response.contests
        .filter((contest) => contest && contest.startTime)
        .map(normalizeContest)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      setContests(normalizedContests);
      setMetadata({
        total: response.total,
        cached: response.cached,
        lastUpdated: response.lastUpdated,
        platforms: response.platforms
      });

      if (manual) {
        toast.success("Contest schedule refreshed.", {
          position: "top-center",
          autoClose: 2200,
          toastId: "contest-refresh-success"
        });
      }
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      const errorMessage = requestError.message || "Contest schedule is temporarily unavailable.";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 3500,
        toastId: "contest-load-error"
      });
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadContests({ signal: controller.signal });
    return () => controller.abort();
  }, [loadContests]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // NOTICE: The frontend browser window.setTimeout loop has been removed here.
  // The WebSocket context now handles the push notifications purely from the backend.

  const platformFilters = useMemo(() => {
    const uniquePlatforms = Array.from(new Set(contests.map((c) => c.platform.toLowerCase())));
    return uniquePlatforms.map((key) => ({
      key,
      name: PLATFORM_CONFIG[key]?.name || key
    }));
  }, [contests]);

  const platformCounts = useMemo(() =>
    contests.reduce((counts, contest) => {
      const key = contest.platform.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}), [contests]);

  const liveContestCount = useMemo(() => 
    contests.filter((c) => getContestStatus(c, currentTime) === "live").length, 
  [contests, currentTime]);

  const startingSoonCount = useMemo(() => 
    contests.filter((c) => getContestStatus(c, currentTime) === "starting-soon").length, 
  [contests, currentTime]);

  const featuredContest = useMemo(() => 
    contests.find((c) => getContestStatus(c, currentTime) === "live") ||
    contests.find((c) => getContestStatus(c, currentTime) !== "ended") || null, 
  [contests, currentTime]);

  const visibleContests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = contests.filter((contest) => {
      const platformKey = contest.platform.toLowerCase();
      const matchesFilter = filter === "all" ? true : filter === "bookmarked" ? bookmarkedContestIds.includes(createContestKey(contest)) : platformKey === filter;
      const matchesSearch = !normalizedSearch || 
        contest.contestName.toLowerCase().includes(normalizedSearch) || 
        platformKey.includes(normalizedSearch) || 
        String(contest.type || "").toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "duration") return a.duration - b.duration;
      if (sortBy === "platform") return a.platform.localeCompare(b.platform);
      return new Date(a.startTime) - new Date(b.startTime);
    });
  }, [contests, filter, searchTerm, sortBy, bookmarkedContestIds]);

  const getReminder = (contest) => reminders.find((r) => r.id === createContestKey(contest)) || null;

  const handleSetReminder = async (contest, offsetMinutes) => {
    const contestKey = createContestKey(contest);
    if (getReminder(contest)) {
      toast.info("A reminder already exists for this contest.", { position: "top-center", autoClose: 2500, toastId: `existing-${contestKey}` });
      return;
    }

    try {
      // Send the request to the database instantly
      await apiSetReminder(contest.id, contest.startTime, offsetMinutes);

      const startTime = new Date(contest.startTime).getTime();
      const reminderAt = startTime - offsetMinutes * 60 * 1000;
      
      const label = offsetMinutes === 1440 ? "1 day before" : offsetMinutes === 60 ? "1 hour before" : `${offsetMinutes} minutes before`;

      // Update local UI state
      const updatedReminders = [
        ...reminders,
        { id: contestKey, contestId: contest.id, name: contest.contestName, platform: contest.platform, startTime: contest.startTime, reminderAt, offsetMinutes, label, url: contest.url }
      ];

      persistReminders(updatedReminders);
      toast.success(`Reminder set. We'll notify you ${label}.`, { position: "top-center", autoClose: 2800, toastId: `reminder-${contestKey}` });
    } catch (error) {
      toast.error(error.message || "Failed to set reminder on the server.", { position: "top-center", autoClose: 3000 });
    }
  };

  const handleRemoveReminder = async (contestId) => {
    try {
      // Remove from the backend instantly
      await apiRemoveReminder(contestId);

      // Remove from the UI
      const updatedReminders = reminders.filter((r) => !String(r.id).endsWith(`:${contestId}`));
      persistReminders(updatedReminders);
      toast.info("Contest reminder removed.", { position: "top-center", autoClose: 2200 });
    } catch (error) {
      toast.error(error.message || "Failed to remove reminder.", { position: "top-center", autoClose: 3000 });
    }
  };

  const toggleBookmark = (contest) => {
    const contestKey = createContestKey(contest);
    const isBookmarked = bookmarkedContestIds.includes(contestKey);
    const updatedBookmarks = isBookmarked ? bookmarkedContestIds.filter((id) => id !== contestKey) : [...bookmarkedContestIds, contestKey];
    
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(updatedBookmarks));
    setBookmarkedContestIds(updatedBookmarks);
    toast.success(isBookmarked ? "Bookmark removed." : "Contest bookmarked.", { position: "top-center", autoClose: 1800, toastId: `bookmark-${contestKey}` });
  };

  const openFeaturedContest = () => {
    if (!featuredContest?.url) return;
    window.open(featuredContest.url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="contest-command-page">
      <section className="contest-command-hero">
        <div className="contest-command-hero-copy">
          <span className="contest-command-eyebrow">Competitive programming command center</span>
          <h1>Never miss your next <span>coding contest.</span></h1>
          <p>Discover verified contest schedules, follow live countdowns, save events and create reminders in your local timezone.</p>
          <div className="contest-command-summary">
            <article>
              <FaCalendarAlt />
              <div><span>Upcoming</span><strong>{contests.length}</strong></div>
            </article>
            <article>
              <FaFire />
              <div><span>Starting soon</span><strong>{startingSoonCount}</strong></div>
            </article>
            <article>
              <FaBell />
              <div><span>Reminders</span><strong>{reminders.length}</strong></div>
            </article>
          </div>
        </div>

        <aside className="contest-next-panel">
          <div className="contest-next-panel-header">
            <span>{liveContestCount > 0 ? "Live contest" : "Next on your radar"}</span>
            <i>{metadata.cached ? "Cached" : "Live data"}</i>
          </div>

          {featuredContest ? (
            <>
              <span className="contest-next-platform">{featuredContest.platform}</span>
              <h2>{featuredContest.contestName}</h2>
              <div className="contest-next-time">
                <span>Starts</span>
                <strong>{formatContestDate(featuredContest.startTime)}</strong>
              </div>
              <div className="contest-next-countdown">
                <span>Countdown</span>
                <strong>{getTimeUntilContest(featuredContest, currentTime)}</strong>
              </div>
              <button type="button" onClick={openFeaturedContest}>
                View Contest <FaExternalLinkAlt />
              </button>
            </>
          ) : (
            <div className="contest-next-empty">No upcoming contest is currently available.</div>
          )}
        </aside>
      </section>

      <DailyProblemRadar />

      <section className="contest-command-content">
        <div className="contest-command-heading">
          <div>
            <span>Contest schedule</span>
            <h2>Find your next challenge</h2>
            <p>All dates are displayed in your current device timezone.</p>
          </div>
          <button
            type="button"
            className="contest-command-refresh"
            disabled={refreshing}
            onClick={() => loadContests({ manual: true })}
          >
            <FaSyncAlt className={refreshing ? "spinning" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div className="contest-command-toolbar">
          <label className="contest-command-search">
            <FaSearch />
            <input
              type="search"
              value={searchTerm}
              placeholder="Search contests, platforms or formats"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          <label className="contest-command-sort">
            <span>Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="nearest">Nearest first</option>
              <option value="duration">Shortest duration</option>
              <option value="platform">Platform</option>
            </select>
          </label>
        </div>

        <div className="contest-command-filters" role="group" aria-label="Filter contests">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{contests.length}</span>
          </button>
          {platformFilters.map((platform) => (
            <button
              type="button"
              key={platform.key}
              className={filter === platform.key ? "active" : ""}
              onClick={() => setFilter(platform.key)}
            >
              {platform.name} <span>{platformCounts[platform.key] || 0}</span>
            </button>
          ))}
          <button
            type="button"
            className={filter === "bookmarked" ? "active" : ""}
            onClick={() => setFilter("bookmarked")}
          >
            <FaBookmark /> Saved <span>{bookmarkedContestIds.length}</span>
          </button>
        </div>

        {loading && (
          <div className="contest-command-state">
            <span className="contest-command-loader" />
            <h3>Loading contest schedule</h3>
            <p>Collecting verified contests from the Way2Code API.</p>
          </div>
        )}

        {!loading && error && (
          <div className="contest-command-state contest-command-error" role="alert">
            <strong>!</strong>
            <h3>Contest schedule unavailable</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadContests({ manual: true })}>Try Again</button>
          </div>
        )}

        {!loading && !error && visibleContests.length === 0 && (
          <div className="contest-command-state">
            <FaSearch />
            <h3>No matching contests</h3>
            <p>Change the platform filter or search term to discover another contest.</p>
            <button type="button" onClick={() => { setFilter("all"); setSearchTerm(""); }}>Clear Filters</button>
          </div>
        )}

        {!loading && !error && visibleContests.length > 0 && (
          <div className="contest-command-grid">
            {visibleContests.map((contest) => {
              const contestKey = createContestKey(contest);
              return (
                <ContestCard
                  key={contestKey}
                  contest={contest}
                  currentTime={currentTime}
                  reminder={getReminder(contest)}
                  bookmarked={bookmarkedContestIds.includes(contestKey)}
                  onSetReminder={handleSetReminder}
                  onRemoveReminder={handleRemoveReminder}
                  onToggleBookmark={toggleBookmark}
                />
              );
            })}
          </div>
        )}

        {!loading && !error && (
          <div className="contest-command-data-note">
            <span>Last updated: {metadata.lastUpdated ? new Date(metadata.lastUpdated).toLocaleString("en-IN") : "Unavailable"}</span>
            <span>{metadata.cached ? "Served from the Way2Code cache" : "Fetched from live platform sources"}</span>
          </div>
        )}
      </section>
    </main>
  );
}

export default ContestSpace;