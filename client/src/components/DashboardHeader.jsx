import React from "react";
import { FiRefreshCw, FiSearch, FiX } from "react-icons/fi";

import "../styles/DashboardHeader.css";

/**
 * The dashboard's only header.
 *
 * It previously sat above a second "overview" block that repeated the same
 * four figures as the stat cards and wrapped them in a marketing hero. A
 * dashboard's header should say who is looking, when the data is from, and
 * give them the one control that changes it.
 */
const DashboardHeader = ({
    user,
    searchTerm,
    onSearchChange,
    onRefresh,
    isRefreshing,
    lastUpdated
}) => {
    const formattedDate = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    const formattedUpdate = lastUpdated
        ? new Date(lastUpdated).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
          })
        : null;

    return (
        <header className="dash-head">
            <div className="dash-head__identity">
                <span className="eyebrow">{formattedDate}</span>

                <h1 className="dash-head__title">
                    {user?.username || "Your dashboard"}
                </h1>

                <p className="dash-head__meta mono">
                    {formattedUpdate
                        ? `Synced ${formattedUpdate}`
                        : "Not synced yet"}
                </p>
            </div>

            <div className="dash-head__controls">
                <div className="dash-search">
                    <FiSearch className="dash-search__icon" aria-hidden="true" />

                    <input
                        type="search"
                        className="dash-search__input"
                        placeholder="Filter platforms"
                        value={searchTerm}
                        onChange={(event) => onSearchChange(event.target.value)}
                        aria-label="Filter platforms"
                    />

                    {searchTerm && (
                        <button
                            type="button"
                            className="dash-search__clear"
                            onClick={() => onSearchChange("")}
                            aria-label="Clear filter"
                        >
                            <FiX />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    aria-busy={isRefreshing}
                >
                    <FiRefreshCw
                        aria-hidden="true"
                        className={isRefreshing ? "is-spinning" : ""}
                    />
                    {isRefreshing ? "Refreshing" : "Refresh"}
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;
