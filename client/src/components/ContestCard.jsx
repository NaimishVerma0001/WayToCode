// client/src/components/ContestCard.js

import React, { useMemo, useState } from "react";
import {
  FaBell,
  FaBellSlash,
  FaBookmark,
  FaCalendarPlus,
  FaClock,
  FaDownload,
  FaExternalLinkAlt,
  FaGlobeAsia,
  FaRegBookmark
} from "react-icons/fa";
import "../styles/ContestCard.css";

const PLATFORM_CONFIG = {
  codeforces: { name: "Codeforces", shortName: "CF", color: "#3B82F6" },
  leetcode: { name: "LeetCode", shortName: "LC", color: "#FFA116" },
  codechef: { name: "CodeChef", shortName: "CC", color: "#A16207" }
};

const REMINDER_OPTIONS = [
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" }
];

const padCountdown = (value) => String(Math.max(0, value)).padStart(2, "0");

const getPlatformConfig = (platform) => {
  const key = String(platform || "").toLowerCase();
  return (
    PLATFORM_CONFIG[key] || {
      name: platform || "Coding Platform",
      shortName: String(platform || "CP").slice(0, 2).toUpperCase(),
      color: "#8B5CF6"
    }
  );
};

const getContestTiming = (contest, currentTime) => {
  const startTime = new Date(contest.startTime).getTime();
  const durationMilliseconds = Number(contest.duration || 0) * 60 * 1000;
  const endTime = startTime + durationMilliseconds;

  if (!Number.isFinite(startTime)) {
    return { status: "unknown", difference: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  if (currentTime >= startTime && currentTime <= endTime) {
    return {
      status: "live",
      difference: endTime - currentTime,
      ...createCountdown(endTime - currentTime)
    };
  }

  if (currentTime > endTime) {
    return { status: "ended", difference: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const difference = startTime - currentTime;

  return {
    status: difference <= 6 * 60 * 60 * 1000 ? "starting-soon" : "upcoming",
    difference,
    ...createCountdown(difference)
  };
};

function createCountdown(difference) {
  const safeDifference = Math.max(0, difference);
  return {
    days: Math.floor(safeDifference / 86400000),
    hours: Math.floor((safeDifference % 86400000) / 3600000),
    minutes: Math.floor((safeDifference % 3600000) / 60000),
    seconds: Math.floor((safeDifference % 60000) / 1000)
  };
}

const formatLocalDate = (startTime) => {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
};

const getTimeZoneName = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone";
};

const formatCalendarDate = (date) => {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

const createGoogleCalendarUrl = (contest) => {
  const start = new Date(contest.startTime);
  const end = new Date(start.getTime() + Number(contest.duration || 0) * 60 * 1000);

  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: contest.contestName,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    details: `Participate in ${contest.contestName} on ${contest.platform}.`,
    location: contest.url || ""
  });

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
};

const escapeCalendarText = (value) => {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

const downloadCalendarFile = (contest) => {
  const start = new Date(contest.startTime);
  const end = new Date(start.getTime() + Number(contest.duration || 0) * 60 * 1000);

  const calendarContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Way2Code//Contest Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(contest.id)}@way2code`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
    `SUMMARY:${escapeCalendarText(contest.contestName)}`,
    `DESCRIPTION:${escapeCalendarText(`Contest hosted on ${contest.platform}. ${contest.url || ""}`)}`,
    `URL:${escapeCalendarText(contest.url)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const file = new Blob([calendarContent], { type: "text/calendar;charset=utf-8" });
  const fileUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  
  downloadLink.href = fileUrl;
  downloadLink.download = `${String(contest.contestName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "contest"}.ics`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(fileUrl);
};

function ContestCard({
  contest,
  currentTime = Date.now(),
  reminder,
  bookmarked = false,
  onSetReminder,
  onRemoveReminder,
  onToggleBookmark
}) {
  const [reminderOffset, setReminderOffset] = useState(30);

  const platform = useMemo(() => getPlatformConfig(contest.platform), [contest.platform]);
  const timing = useMemo(() => getContestTiming(contest, currentTime), [contest, currentTime]);

  const statusLabels = {
    live: "Live now",
    "starting-soon": "Starting soon",
    upcoming: "Upcoming",
    ended: "Ended",
    unknown: "Unavailable"
  };

  const canCreateReminder = timing.status === "upcoming" || timing.status === "starting-soon";

  const openContest = () => {
    if (!contest.url) return;
    window.open(contest.url, "_blank", "noopener,noreferrer");
  };

  const openGoogleCalendar = () => {
    window.open(createGoogleCalendarUrl(contest), "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className={`contest-command-card contest-command-card-${timing.status}`}
      style={{ "--contest-platform-color": platform.color }}
    >
      <header className="contest-command-header">
        <div className="contest-command-platform">
          <span>{platform.shortName}</span>
          <div>
            <small>Hosted on</small>
            <strong>{platform.name}</strong>
          </div>
        </div>

        <span className={`contest-command-status contest-command-status-${timing.status}`}>
          <i />
          {statusLabels[timing.status]}
        </span>
      </header>

      <div className="contest-command-body">
        <div className="contest-command-title-row">
          <div>
            <span className="contest-command-type">{contest.type || "Contest"}</span>
            <h2>{contest.contestName}</h2>
          </div>

          <button
            type="button"
            className={bookmarked ? "contest-bookmark contest-bookmark-active" : "contest-bookmark"}
            onClick={() => onToggleBookmark?.(contest)}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark contest"}
            aria-pressed={bookmarked}
          >
            {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
          </button>
        </div>

        <div className="contest-command-countdown">
          <p>
            {timing.status === "live"
              ? "Contest ends in"
              : timing.status === "ended"
              ? "Contest completed"
              : "Contest begins in"}
          </p>

          {timing.status !== "ended" && (
            <div className="contest-countdown-grid">
              <div>
                <strong>{padCountdown(timing.days)}</strong>
                <span>Days</span>
              </div>
              <div>
                <strong>{padCountdown(timing.hours)}</strong>
                <span>Hours</span>
              </div>
              <div>
                <strong>{padCountdown(timing.minutes)}</strong>
                <span>Minutes</span>
              </div>
              <div>
                <strong>{padCountdown(timing.seconds)}</strong>
                <span>Seconds</span>
              </div>
            </div>
          )}
        </div>

        <div className="contest-command-details">
          <div>
            <FaClock />
            <span>
              <small>Duration</small>
              <strong>{Number(contest.duration) || 0} minutes</strong>
            </span>
          </div>

          <div>
            <FaCalendarPlus />
            <span>
              <small>Local start</small>
              <strong>{formatLocalDate(contest.startTime)}</strong>
            </span>
          </div>

          <div>
            <FaGlobeAsia />
            <span>
              <small>Timezone</small>
              <strong>{getTimeZoneName()}</strong>
            </span>
          </div>
        </div>

        {canCreateReminder && (
          <div className="contest-reminder-control">
            {!reminder ? (
              <>
                <label htmlFor={`reminder-${contest.id}`}>Remind me</label>
                <select
                  id={`reminder-${contest.id}`}
                  value={reminderOffset}
                  onChange={(event) => setReminderOffset(Number(event.target.value))}
                >
                  {REMINDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSetReminder?.(contest, reminderOffset)}
                >
                  <FaBell /> Set
                </button>
              </>
            ) : (
              <div className="contest-reminder-active">
                <FaBell />
                <span>
                  Reminder active
                  <small>{reminder.label || `${reminder.offsetMinutes || reminderOffset} minutes before`}</small>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveReminder?.(contest.id)}
                >
                  <FaBellSlash /> Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="contest-command-footer">
        <button
          type="button"
          className="contest-primary-action"
          onClick={openContest}
          disabled={!contest.url}
        >
          View Contest <FaExternalLinkAlt />
        </button>
        <button
          type="button"
          title="Add to Google Calendar"
          aria-label="Add contest to Google Calendar"
          onClick={openGoogleCalendar}
        >
          <FaCalendarPlus />
        </button>
        <button
          type="button"
          title="Download calendar event"
          aria-label="Download contest calendar event"
          onClick={() => downloadCalendarFile(contest)}
        >
          <FaDownload />
        </button>
      </footer>
    </article>
  );
}

export default ContestCard;