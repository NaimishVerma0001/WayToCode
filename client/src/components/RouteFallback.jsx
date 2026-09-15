import React from "react";
import { Link, useRouteError } from "react-router-dom";

/**
 * Shared placeholder for the three states a route can be in before it renders
 * its own content: still loading, not found, or failed.
 */
const RouteFallback = ({ error = false, notFound = false }) => {
  const routeError = useRouteError?.();

  if (notFound) {
    return (
      <div className="route-fallback" role="status">
        <h1 className="route-fallback__title">Page not found</h1>
        <p className="route-fallback__message">
          That page does not exist. It may have been moved or renamed.
        </p>
        <Link className="route-fallback__action" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-fallback" role="alert">
        <h1 className="route-fallback__title">This page could not load</h1>
        <p className="route-fallback__message">
          Something went wrong while opening this page. Try again in a moment.
        </p>

        {import.meta.env.DEV && routeError ? (
          <pre className="route-fallback__details">
            {routeError.message || String(routeError)}
          </pre>
        ) : null}

        <Link className="route-fallback__action" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback__spinner" aria-hidden="true" />
      <p className="route-fallback__message">Loading…</p>
    </div>
  );
};

export default RouteFallback;
