import React from "react";

import "../styles/StatsCard.css";

/**
 * A single scoreboard metric.
 *
 * The number leads, at the display face's heaviest weight with tabular
 * figures, because the number is what the reader came for. The label sits
 * under it and the meta line explains where the figure came from — previously
 * the meta ("Live total") was stacked above the label as if it were a title,
 * which is why the cards read as noise.
 */
const StatsCard = ({ data }) => {
    const { title, value, meta, icon, platform, trend } = data;

    return (
        <article className="stat" data-platform={platform}>
            <header className="stat__head">
                <span className="stat__label">{title}</span>

                {icon && (
                    <span className="stat__icon" aria-hidden="true">
                        {icon}
                    </span>
                )}
            </header>

            <p className="metric stat__value">{value}</p>

            {(meta || trend) && (
                <footer className="stat__foot mono">
                    {trend && (
                        <span
                            className="stat__trend"
                            data-direction={trend.direction}
                        >
                            {trend.direction === "up" ? "▲" : "▼"} {trend.value}
                        </span>
                    )}
                    {meta && <span className="stat__meta">{meta}</span>}
                </footer>
            )}
        </article>
    );
};

export default StatsCard;
