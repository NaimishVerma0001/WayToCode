/**
 * The Codeforces rating ladder.
 *
 * These tiers are the vocabulary this audience already reads fluently: a cyan
 * handle is a specialist, an orange one is a master. Reusing the ladder means
 * a rank badge needs no legend, and it gives the product a colour system that
 * carries meaning instead of decoration.
 */

export const RATING_TIERS = [
    { id: "newbie", label: "Newbie", min: 0, max: 1199 },
    { id: "pupil", label: "Pupil", min: 1200, max: 1399 },
    { id: "specialist", label: "Specialist", min: 1400, max: 1599 },
    { id: "expert", label: "Expert", min: 1600, max: 1899 },
    { id: "candidate", label: "Candidate Master", min: 1900, max: 2099 },
    { id: "master", label: "Master", min: 2100, max: 2399 },
    { id: "grandmaster", label: "Grandmaster", min: 2400, max: 4000 }
];

const LADDER_FLOOR = RATING_TIERS[0].min;
const LADDER_CEILING = RATING_TIERS[RATING_TIERS.length - 1].max;

/**
 * Resolve a numeric rating to its tier.
 * An absent or unrated value resolves to the first tier rather than null, so
 * callers never have to branch on it.
 */
export const getRatingTier = (rating) => {
    const value = Number(rating);

    if (!Number.isFinite(value) || value <= 0) {
        return { ...RATING_TIERS[0], label: "Unrated", rating: 0, isRated: false };
    }

    const tier =
        RATING_TIERS.find((candidate) => value >= candidate.min && value <= candidate.max) ||
        RATING_TIERS[RATING_TIERS.length - 1];

    return { ...tier, rating: value, isRated: true };
};

/** Position on the ladder as a 0–100 percentage, for the marker. */
export const getLadderPosition = (rating) => {
    const value = Number(rating);

    if (!Number.isFinite(value) || value <= 0) return 0;

    const clamped = Math.min(Math.max(value, LADDER_FLOOR), LADDER_CEILING);

    return ((clamped - LADDER_FLOOR) / (LADDER_CEILING - LADDER_FLOOR)) * 100;
};

/** How far into the next tier the rating sits, and what it needs to get there. */
export const getTierProgress = (rating) => {
    const tier = getRatingTier(rating);
    const index = RATING_TIERS.findIndex((candidate) => candidate.id === tier.id);
    const nextTier = RATING_TIERS[index + 1] || null;

    if (!tier.isRated || !nextTier) {
        return { tier, nextTier, pointsToNext: 0, percentThroughTier: 0 };
    }

    const span = tier.max - tier.min + 1;

    return {
        tier,
        nextTier,
        pointsToNext: nextTier.min - tier.rating,
        percentThroughTier: Math.round(((tier.rating - tier.min) / span) * 100)
    };
};

export const LADDER_BOUNDS = { floor: LADDER_FLOOR, ceiling: LADDER_CEILING };
