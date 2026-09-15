import React from "react";

import { RATING_TIERS, getLadderPosition, getTierProgress } from "../lib/rating";
import "../styles/RankLadder.css";

/**
 * The rating ladder.
 *
 * Competitive programmers already think in these tiers, so a bare number
 * ("1547") tells them less than its position on the ladder does. The marker
 * pins the handle exactly where it sits, and the segment widths are
 * proportional to each tier's actual rating span — so the visual distance
 * between Expert and Master is the real distance.
 */
const RankLadder = ({ rating, handle, platform = "codeforces" }) => {
    const { tier, nextTier, pointsToNext } = getTierProgress(rating);
    const position = getLadderPosition(rating);

    const totalSpan =
        RATING_TIERS[RATING_TIERS.length - 1].max - RATING_TIERS[0].min;

    return (
        <section className="ladder" data-rank={tier.id} aria-label="Rating ladder">
            <header className="ladder__head">
                <div className="ladder__identity">
                    <span className="eyebrow">Codeforces rank</span>

                    <p className="ladder__tier">
                        {tier.label}
                        {handle && (
                            <span className="ladder__handle mono"> @{handle}</span>
                        )}
                    </p>
                </div>

                <div className="ladder__score">
                    <span className="metric ladder__rating">
                        {tier.isRated ? tier.rating : "—"}
                    </span>
                    <span className="ladder__score-label">rating</span>
                </div>
            </header>

            <div
                className="ladder__track"
                role="img"
                aria-label={
                    tier.isRated
                        ? `${tier.label}, rating ${tier.rating}`
                        : "No Codeforces rating connected"
                }
            >
                {RATING_TIERS.map((step) => (
                    <span
                        key={step.id}
                        className="ladder__segment"
                        data-rank={step.id}
                        style={{
                            // Proportional to the tier's real rating span.
                            flexGrow: step.max - step.min + 1,
                            flexBasis: `${((step.max - step.min + 1) / totalSpan) * 100}%`
                        }}
                        title={`${step.label} · ${step.min}–${step.max}`}
                    />
                ))}

                {tier.isRated && (
                    <span
                        className="ladder__marker"
                        data-platform={platform}
                        style={{ left: `${position}%` }}
                    />
                )}
            </div>

            <footer className="ladder__foot mono">
                {tier.isRated ? (
                    nextTier ? (
                        <>
                            <span>
                                {pointsToNext} to {nextTier.label}
                            </span>
                            <span className="ladder__range">
                                {tier.min}–{tier.max}
                            </span>
                        </>
                    ) : (
                        <span>Top of the ladder</span>
                    )
                ) : (
                    <span>Connect a Codeforces handle to place yourself</span>
                )}
            </footer>
        </section>
    );
};

export default RankLadder;
