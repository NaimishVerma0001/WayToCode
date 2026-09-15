import React from "react";
import { FiAlertTriangle, FiExternalLink, FiPlus, FiRefreshCw } from "react-icons/fi";

import "../styles/PlatformCard.css";

const displayValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    if (typeof value === "number") {
        return new Intl.NumberFormat("en-US").format(value);
    }

    return value;
};

/**
 * One platform's live reading.
 *
 * The card takes its hue from the platform it represents — a single hairline
 * on the left edge and the dot beside the name — rather than a thick coloured
 * bar across the top. The numbers stay achromatic so they read as data, not
 * as decoration.
 */
const PlatformCard = ({ data, onRefresh, isRefreshing }) => {
    const {
        key,
        platform,
        username,
        connected,
        success,
        error,
        metrics = [],
        profileUrl
    } = data;

    const state = !connected ? "idle" : success ? "live" : "error";

    return (
        <article className="pcard" data-platform={key} data-state={state}>
            <header className="pcard__head">
                <div className="pcard__identity">
                    <span className="dot" aria-hidden="true" />

                    <div className="pcard__names">
                        <h3 className="pcard__name">{platform}</h3>

                        <span className="pcard__handle mono">
                            {connected ? `@${username}` : "Not connected"}
                        </span>
                    </div>
                </div>

                {connected && (
                    <button
                        type="button"
                        className="pcard__refresh"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        aria-label={`Refresh ${platform}`}
                        title={`Refresh ${platform}`}
                    >
                        <FiRefreshCw
                            className={isRefreshing ? "is-spinning" : ""}
                            aria-hidden="true"
                        />
                    </button>
                )}
            </header>

            <div className="pcard__body">
                {state === "idle" && (
                    <div className="pcard__state">
                        <FiPlus aria-hidden="true" />
                        <p>
                            Add your {platform} handle to pull live statistics
                            into the dashboard.
                        </p>
                    </div>
                )}

                {state === "error" && (
                    <div className="pcard__state pcard__state--error" role="status">
                        <FiAlertTriangle aria-hidden="true" />
                        <p>{error || `${platform} did not respond. It will retry shortly.`}</p>
                    </div>
                )}

                {state === "live" && (
                    <dl className="pcard__metrics">
                        {metrics.map((metric, index) => (
                            <div
                                key={`${metric.label}-${index}`}
                                className="pcard__metric"
                            >
                                <dt>{metric.label}</dt>
                                <dd className="mono">{displayValue(metric.value)}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>

            {profileUrl && (
                <footer className="pcard__foot">
                    <a
                        className="pcard__link"
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open profile
                        <FiExternalLink aria-hidden="true" />
                    </a>
                </footer>
            )}
        </article>
    );
};

export default PlatformCard;
