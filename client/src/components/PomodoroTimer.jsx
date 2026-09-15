import React, { useEffect, useRef, useState } from "react";
import { FiPause, FiPlay, FiRotateCcw } from "react-icons/fi";

import "../styles/PomodoroTimer.css";

const MODES = [
    { id: "work", label: "Focus", minutes: 25 },
    { id: "shortBreak", label: "Short", minutes: 5 },
    { id: "longBreak", label: "Long", minutes: 15 }
];

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A focus timer sized like a widget, not a hero.
 *
 * It previously filled the viewport with an analog clock face above the
 * planner it was meant to support. The remaining time is the only thing worth
 * that much weight, so it is the only thing set large.
 */
export const PomodoroTimer = () => {
    const [mode, setMode] = useState("work");
    const [duration, setDuration] = useState(25 * 60);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);

    const previousTitle = useRef("");

    useEffect(() => {
        if (!isRunning) return undefined;

        if (timeLeft <= 0) {
            setIsRunning(false);
            return undefined;
        }

        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);

        return () => clearInterval(timer);
    }, [isRunning, timeLeft]);

    /*
     * Mirror the countdown into the tab title so the timer is still readable
     * while the user is on the problem in another tab — which is exactly when
     * a focus timer is doing its job.
     */
    useEffect(() => {
        if (!previousTitle.current) previousTitle.current = document.title;

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        document.title = isRunning ? `${clock} · Focus` : previousTitle.current;

        return () => {
            document.title = previousTitle.current;
        };
    }, [timeLeft, isRunning]);

    const switchMode = (nextMode) => {
        const target = MODES.find((item) => item.id === nextMode);

        if (!target) return;

        setMode(nextMode);
        setIsRunning(false);
        setDuration(target.minutes * 60);
        setTimeLeft(target.minutes * 60);
    };

    const reset = () => {
        setIsRunning(false);
        setTimeLeft(duration);
    };

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const seconds = String(timeLeft % 60).padStart(2, "0");

    const progress = duration > 0 ? timeLeft / duration : 0;
    const isFinished = timeLeft === 0;

    return (
        <section className="timer" data-running={isRunning}>
            <div className="timer__modes" role="group" aria-label="Timer length">
                {MODES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`timer__mode ${mode === item.id ? "timer__mode--active" : ""}`}
                        aria-pressed={mode === item.id}
                        onClick={() => switchMode(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="timer__dial">
                {/* The ring is the progress bar; a clock face would only repeat it. */}
                <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle className="timer__track" cx="60" cy="60" r={RADIUS} />
                    <circle
                        className="timer__sweep"
                        cx="60"
                        cy="60"
                        r={RADIUS}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    />
                </svg>

                <p className="timer__clock mono" role="timer" aria-live="off">
                    {minutes}:{seconds}
                </p>
            </div>

            <div className="timer__controls">
                <button
                    type="button"
                    className="btn btn--primary btn--sm timer__primary"
                    onClick={() => (isFinished ? reset() : setIsRunning((run) => !run))}
                >
                    {isFinished ? (
                        <>
                            <FiRotateCcw aria-hidden="true" /> Again
                        </>
                    ) : isRunning ? (
                        <>
                            <FiPause aria-hidden="true" /> Pause
                        </>
                    ) : (
                        <>
                            <FiPlay aria-hidden="true" /> Start
                        </>
                    )}
                </button>

                <button
                    type="button"
                    className="btn btn--ghost btn--sm btn--icon"
                    onClick={reset}
                    aria-label="Reset timer"
                    disabled={timeLeft === duration && !isRunning}
                >
                    <FiRotateCcw aria-hidden="true" />
                </button>
            </div>
        </section>
    );
};

export default PomodoroTimer;
