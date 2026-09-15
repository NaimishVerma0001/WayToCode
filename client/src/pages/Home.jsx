import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import {
    SiCodechef,
    SiCodeforces,
    SiGeeksforgeeks,
    SiGithub,
    SiHackerrank,
    SiLeetcode
} from "react-icons/si";

import ContestBoard from "../components/ContestBoard";
import "../styles/Home.css";

const PLATFORMS = [
    { key: "leetcode", label: "LeetCode", Icon: SiLeetcode },
    { key: "codeforces", label: "Codeforces", Icon: SiCodeforces },
    { key: "codechef", label: "CodeChef", Icon: SiCodechef },
    // react-icons carries no AtCoder glyph, and AtCoder's own identity is a
    // wordmark, so a monospace mark is both more accurate and on-system.
    { key: "atcoder", label: "AtCoder", mark: "AC" },
    { key: "geeksforgeeks", label: "GeeksforGeeks", Icon: SiGeeksforgeeks },
    { key: "hackerrank", label: "HackerRank", Icon: SiHackerrank },
    { key: "github", label: "GitHub", Icon: SiGithub }
];

/*
 * Each capability is described by what the reader gets, not by the mechanism
 * behind it. "Ratings, solve counts and streaks in one place" tells them more
 * than "multi-platform aggregation engine" does.
 */
const CAPABILITIES = [
    {
        title: "Every handle, one page",
        body: "Ratings, solve counts and contest history from seven platforms, pulled live and kept together."
    },
    {
        title: "Never miss a round",
        body: "Upcoming contests from every platform, with a reminder that reaches you before it starts."
    },
    {
        title: "Progress you can check",
        body: "A daily snapshot of where you stood, so improvement is something you can look back at."
    },
    {
        title: "A plan for today",
        body: "Track the problems you meant to solve, what blocked you, and the streak you are keeping."
    }
];

function Home() {
    const navigate = useNavigate();
    const { user } = useOutletContext() || {};
    const isLoggedIn = Boolean(user);

    return (
        <main className="home">
            <section className="home__hero">
                <div className="home__intro">
                    <span className="eyebrow">Competitive programming tracker</span>

                    <h1 className="home__title">
                        Every platform you grind on,
                        <span className="home__title-accent"> one scoreboard.</span>
                    </h1>

                    <p className="home__lede">
                        Connect your LeetCode, Codeforces, CodeChef and GitHub
                        handles. Way2Code pulls your real numbers, tracks how they
                        move, and tells you when the next contest starts.
                    </p>

                    <div className="home__actions">
                        <button
                            type="button"
                            className="btn btn--primary btn--lg"
                            onClick={() => navigate(isLoggedIn ? "/profile" : "/register")}
                        >
                            {isLoggedIn ? "Open your dashboard" : "Create an account"}
                            <FiArrowRight aria-hidden="true" />
                        </button>

                        <button
                            type="button"
                            className="btn btn--secondary btn--lg"
                            onClick={() => navigate("/contest")}
                        >
                            Browse contests
                        </button>
                    </div>

                    <ul className="home__platforms" aria-label="Supported platforms">
                        {PLATFORMS.map(({ key, label, Icon, mark }) => (
                            <li key={key} data-platform={key} title={label}>
                                {Icon ? (
                                    <Icon aria-hidden="true" />
                                ) : (
                                    <span className="mono home__platform-mark" aria-hidden="true">
                                        {mark}
                                    </span>
                                )}
                                <span className="visually-hidden">{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/*
                  The proof is the product running, not a picture of it: these
                  are the real next contests, counting down live.
                */}
                <div className="home__board">
                    <ContestBoard limit={5} />
                </div>
            </section>

            <section className="home__capabilities" aria-labelledby="home-capabilities">
                <h2 id="home-capabilities" className="home__section-title">
                    What you get
                </h2>

                <div className="home__grid">
                    {CAPABILITIES.map((item) => (
                        <article key={item.title} className="home__card">
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default Home;
