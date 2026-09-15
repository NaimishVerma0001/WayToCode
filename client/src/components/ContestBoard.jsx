import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getUpcomingContests } from "../services/contestService";
import { useCountdown, pad } from "../hooks/useCountdown";
import "../styles/ContestBoard.css";

const PLATFORM_KEYS = {
    LeetCode: "leetcode",
    Codeforces: "codeforces",
    CodeChef: "codechef",
    AtCoder: "atcoder",
    GeeksforGeeks: "geeksforgeeks",
    HackerRank: "hackerrank"
};

const platformKey = (platform) =>
    PLATFORM_KEYS[platform] || String(platform || "").toLowerCase();

const startLabel = (startTime) =>
    new Date(startTime).toLocaleString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

/** The lead contest: one large, ticking clock. */
const NextContest = ({ contest }) => {
    const { days, hours, minutes, seconds, isLive } = useCountdown(contest.startTime);

    return (
        <article
            className="board__lead"
            data-platform={platformKey(contest.platform)}
        >
            <header className="board__lead-head">
                <span className="tag tag--data">
                    <span className="dot" />
                    {contest.platform}
                </span>
                <span className="board__lead-when mono">
                    {startLabel(contest.startTime)}
                </span>
            </header>

            <h3 className="board__lead-name">{contest.contestName}</h3>

            <div
                className="board__clock mono"
                role="timer"
                aria-live="off"
                aria-label={
                    isLive
                        ? "Contest is live"
                        : `Starts in ${days} days ${hours} hours ${minutes} minutes`
                }
            >
                {isLive ? (
                    <span className="board__live">Live now</span>
                ) : (
                    <>
                        {days > 0 && (
                            <span className="board__unit">
                                <b>{pad(days)}</b>
                                <i>d</i>
                            </span>
                        )}
                        <span className="board__unit">
                            <b>{pad(hours)}</b>
                            <i>h</i>
                        </span>
                        <span className="board__unit">
                            <b>{pad(minutes)}</b>
                            <i>m</i>
                        </span>
                        <span className="board__unit board__unit--seconds">
                            <b>{pad(seconds)}</b>
                            <i>s</i>
                        </span>
                    </>
                )}
            </div>
        </article>
    );
};

const ContestRow = ({ contest }) => (
    <li className="board__row" data-platform={platformKey(contest.platform)}>
        <span className="dot" aria-hidden="true" />

        <span className="board__row-name">{contest.contestName}</span>

        <span className="board__row-when mono">{contest.countdown}</span>
    </li>
);

/**
 * The live contest board.
 *
 * This replaces the invented screenshot the landing page used to show. The
 * numbers here are real and anyone can check them, which is a stronger claim
 * than a mock-up can make.
 */
const ContestBoard = ({ limit = 5 }) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["contests", "board", limit],
        queryFn: ({ signal }) => getUpcomingContests({ signal }),
        staleTime: 5 * 60 * 1000,
        retry: 1
    });

    const contests = (data?.contests || []).slice(0, limit);
    const [next, ...rest] = contests;

    return (
        <section className="board" aria-label="Upcoming contests">
            <header className="board__head">
                <span className="eyebrow">Next up</span>

                <span className="board__status mono">
                    <span
                        className={`board__pulse ${isError ? "board__pulse--down" : ""}`}
                        aria-hidden="true"
                    />
                    {isError ? "Offline" : "Live"}
                </span>
            </header>

            {isLoading && (
                <div className="board__loading">
                    <div className="skeleton board__skeleton board__skeleton--lead" />
                    <div className="skeleton board__skeleton" />
                    <div className="skeleton board__skeleton" />
                </div>
            )}

            {!isLoading && isError && (
                <p className="board__empty">
                    Contest data is unavailable right now. It refreshes every
                    15&nbsp;minutes.
                </p>
            )}

            {!isLoading && !isError && !next && (
                <p className="board__empty">
                    No contests scheduled. New ones appear here as soon as the
                    platforms announce them.
                </p>
            )}

            {next && <NextContest contest={next} />}

            {rest.length > 0 && (
                <ul className="board__list">
                    {rest.map((contest) => (
                        <ContestRow key={contest.contestId} contest={contest} />
                    ))}
                </ul>
            )}
        </section>
    );
};

export default ContestBoard;
