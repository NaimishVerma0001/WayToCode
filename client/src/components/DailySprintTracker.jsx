import React, { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { FiExternalLink, FiPlus, FiX } from "react-icons/fi";

import { apiRequest } from "../services/apiClient";
import { PomodoroTimer } from "./PomodoroTimer";
import "../styles/SprintTracker.css";

/*
 * Categories are named for what the user is tracking, not for the enum value
 * the API stores. "Blockers" is a list of things stopping them; "Saved links"
 * is a list of things to come back to.
 */
const TABS = [
    { id: "task", label: "Tasks" },
    { id: "potd", label: "Problem of the day" },
    { id: "blocker", label: "Blockers" },
    { id: "link", label: "Saved links" }
];

const PRIORITIES = [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" }
];

const EMPTY_COPY = {
    task: "Nothing planned yet. Add the first thing you want to finish today.",
    potd: "No problem tracked today. Add the one you are working through.",
    blocker: "No blockers. Add anything that is stopping you from moving.",
    link: "No links saved. Keep editorials and problems you want to revisit here."
};

export const DailySprintTracker = () => {
    const [items, setItems] = useState([]);
    const [streak, setStreak] = useState(0);
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeTab, setActiveTab] = useState("task");

    const [inputTitle, setInputTitle] = useState("");
    const [inputDesc, setInputDesc] = useState("");
    const [inputUrl, setInputUrl] = useState("");
    const [priority, setPriority] = useState("medium");

    const fetchItems = async () => {
        try {
            setLoading(true);

            const res = await apiRequest("/planner", { authenticated: true });

            if (Array.isArray(res.data)) {
                setItems(res.data);
            } else {
                setItems(res.data.items || []);
                setStreak(res.data.potdStreak || 0);
                setBadges(res.data.badges || []);
            }

            setError("");
        } catch (err) {
            setError(err.message || "Could not load your planner.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();

        if (!inputTitle.trim()) return;

        try {
            const res = await apiRequest("/planner", {
                method: "POST",
                authenticated: true,
                body: {
                    category: activeTab,
                    title: inputTitle,
                    description: inputDesc,
                    priority: activeTab === "task" ? priority : undefined,
                    url: activeTab === "link" ? inputUrl : undefined
                }
            });

            setItems([res.data.newItem || res.data, ...items]);
            setInputTitle("");
            setInputDesc("");
            setInputUrl("");
        } catch (err) {
            // Errors belong in the interface, not in a browser alert box.
            toast.error(err.message || "That entry could not be saved.");
        }
    };

    const handleStatusToggle = async (id, currentStatus, categoryType) => {
        const cycle = {
            pending: "in-progress",
            "in-progress": "revision",
            revision: "completed",
            completed: "pending"
        };

        const nextStatus =
            categoryType === "potd"
                ? cycle[currentStatus] || "pending"
                : currentStatus === "completed"
                  ? "pending"
                  : "completed";

        try {
            const res = await apiRequest(`/planner/${id}`, {
                method: "PUT",
                authenticated: true,
                body: { status: nextStatus }
            });

            const updatedItem = res.data.updatedItem || res.data;
            setItems(items.map((item) => (item._id === id ? updatedItem : item)));

            if (res.data.potdStreak !== undefined) setStreak(res.data.potdStreak);
            if (res.data.badges !== undefined) setBadges(res.data.badges);
        } catch {
            toast.error("That status could not be updated.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/planner/${id}`, { method: "DELETE", authenticated: true });
            setItems(items.filter((item) => item._id !== id));
        } catch {
            toast.error("That entry could not be deleted.");
        }
    };

    const currentTabItems = useMemo(
        () => items.filter((item) => item.category === activeTab),
        [items, activeTab]
    );

    const taskProgress = useMemo(() => {
        const tasks = items.filter((item) => item.category === "task");
        const done = tasks.filter((item) => item.status === "completed").length;

        return {
            total: tasks.length,
            done,
            percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)
        };
    }, [items]);

    const counts = useMemo(
        () =>
            TABS.reduce((totals, tab) => {
                totals[tab.id] = items.filter((item) => item.category === tab.id).length;
                return totals;
            }, {}),
        [items]
    );

    return (
        <main className="planner">
            <header className="planner__head">
                <div>
                    <span className="eyebrow">Today</span>
                    <h1 className="planner__title">Planner</h1>
                </div>

                <div className="planner__progress">
                    <div className="planner__progress-text">
                        <span className="mono planner__progress-count">
                            {taskProgress.done}/{taskProgress.total}
                        </span>
                        <span className="planner__progress-label">tasks done</span>
                    </div>

                    <div
                        className="planner__bar"
                        role="progressbar"
                        aria-valuenow={taskProgress.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Task completion"
                    >
                        <span style={{ width: `${taskProgress.percent}%` }} />
                    </div>
                </div>
            </header>

            {/* Work on the left, instruments on the right: the list is the page. */}
            <div className="planner__layout">
                <section className="planner__main">
                    <nav className="planner__tabs" aria-label="Planner categories">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`planner__tab ${
                                    activeTab === tab.id ? "planner__tab--active" : ""
                                }`}
                                aria-pressed={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                <span className="planner__tab-count mono">
                                    {counts[tab.id] || 0}
                                </span>
                            </button>
                        ))}
                    </nav>

                    <form className="planner__form" onSubmit={handleCreate}>
                        <input
                            className="input planner__form-title"
                            type="text"
                            placeholder={
                                activeTab === "link"
                                    ? "What is this link?"
                                    : "What are you working on?"
                            }
                            value={inputTitle}
                            onChange={(event) => setInputTitle(event.target.value)}
                            aria-label="Title"
                        />

                        {activeTab === "link" && (
                            <input
                                className="input planner__form-url"
                                type="url"
                                placeholder="https://"
                                value={inputUrl}
                                onChange={(event) => setInputUrl(event.target.value)}
                                aria-label="Link address"
                            />
                        )}

                        {activeTab === "task" && (
                            <select
                                className="input planner__form-priority"
                                value={priority}
                                onChange={(event) => setPriority(event.target.value)}
                                aria-label="Priority"
                            >
                                {PRIORITIES.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={!inputTitle.trim()}
                        >
                            <FiPlus aria-hidden="true" />
                            Add
                        </button>
                    </form>

                    {error && (
                        <p className="planner__error" role="alert">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <div className="planner__list">
                            {[0, 1, 2].map((row) => (
                                <div key={row} className="skeleton planner__skeleton" />
                            ))}
                        </div>
                    ) : currentTabItems.length === 0 ? (
                        <p className="planner__empty">{EMPTY_COPY[activeTab]}</p>
                    ) : (
                        <ul className="planner__list">
                            {currentTabItems.map((item) => (
                                <li
                                    key={item._id}
                                    className="planner__item"
                                    data-status={item.status}
                                    data-priority={item.priority}
                                >
                                    {activeTab !== "link" && (
                                        <button
                                            type="button"
                                            className="planner__check"
                                            onClick={() =>
                                                handleStatusToggle(
                                                    item._id,
                                                    item.status,
                                                    activeTab
                                                )
                                            }
                                            aria-label={
                                                item.status === "completed"
                                                    ? `Reopen ${item.title}`
                                                    : `Complete ${item.title}`
                                            }
                                        />
                                    )}

                                    <div className="planner__item-body">
                                        {activeTab === "link" ? (
                                            <a
                                                className="planner__item-title planner__item-link"
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {item.title}
                                                <FiExternalLink aria-hidden="true" />
                                            </a>
                                        ) : (
                                            <span className="planner__item-title">
                                                {item.title}
                                            </span>
                                        )}

                                        {item.description && (
                                            <p className="planner__item-note">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {activeTab === "potd" && (
                                        <span className="tag mono">{item.status}</span>
                                    )}

                                    {activeTab === "task" && item.priority && (
                                        <span className="planner__priority mono">
                                            {item.priority}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        className="planner__delete"
                                        onClick={() => handleDelete(item._id)}
                                        aria-label={`Delete ${item.title}`}
                                    >
                                        <FiX />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside className="planner__side">
                    <PomodoroTimer />

                    <section className="planner__streak">
                        <span className="eyebrow">Problem-of-the-day streak</span>

                        <p className="metric planner__streak-value">
                            {streak}
                            <span className="planner__streak-unit">
                                {streak === 1 ? "day" : "days"}
                            </span>
                        </p>

                        <div className="planner__badges">
                            {badges.length === 0 ? (
                                <p className="planner__badges-empty">
                                    Solve three days running to unlock the first badge.
                                </p>
                            ) : (
                                badges.map((badge) => (
                                    <span key={badge.badgeId} className="tag mono">
                                        {badge.badgeId.replace(/_/g, " ")}
                                    </span>
                                ))
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    );
};

export default DailySprintTracker;
