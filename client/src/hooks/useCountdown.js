import { useEffect, useState } from "react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const breakdown = (remaining) => ({
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    total: remaining,
    isLive: remaining <= 0
});

/**
 * A ticking countdown to a target time.
 *
 * Ticks once a second so the seconds column actually moves — a countdown that
 * only updates on render is just a static label wearing a clock's clothes.
 * The interval clears itself once the target passes.
 */
export const useCountdown = (target) => {
    const targetTime = target ? new Date(target).getTime() : NaN;

    const [remaining, setRemaining] = useState(() =>
        Number.isNaN(targetTime) ? 0 : Math.max(targetTime - Date.now(), 0)
    );

    useEffect(() => {
        if (Number.isNaN(targetTime)) {
            setRemaining(0);
            return undefined;
        }

        const tick = () => {
            setRemaining(Math.max(targetTime - Date.now(), 0));
        };

        tick();

        const interval = setInterval(tick, SECOND);

        return () => clearInterval(interval);
    }, [targetTime]);

    return breakdown(remaining);
};

/** Two-digit padding so the clock never changes width as it counts down. */
export const pad = (value) => String(value).padStart(2, "0");
