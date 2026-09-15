import React, { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "./services/authService";
import Navbar from "./components/Navbar";
import SiteFooter from "./components/SiteFooter";
import RouteFallback from "./components/RouteFallback";
import "./App.css";

/** Routes that require a signed-in user. */
const PROTECTED_PATHS = ["/profile", "/admin", "/planner", "/aim"];

/** Routes that only make sense while signed out. */
const PUBLIC_ONLY_PATHS = ["/register", "/login"];

/** Routes that additionally require the administrator role. */
const ADMIN_PATHS = ["/admin"];

const matchesAny = (pathname, paths) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: user,
    isLoading
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => getCurrentUser({ signal }),
    retry: false,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false
  });

  const { isProtected, isPublicOnly, isAdminRoute } = useMemo(
    () => ({
      isProtected: matchesAny(location.pathname, PROTECTED_PATHS),
      isPublicOnly: matchesAny(location.pathname, PUBLIC_ONLY_PATHS),
      isAdminRoute: matchesAny(location.pathname, ADMIN_PATHS)
    }),
    [location.pathname]
  );

  /*
   * Client-side guards are a navigation convenience only. Every protected
   * route is also enforced server-side, so a user who edits their local state
   * gains nothing beyond seeing an empty shell.
   */
  const isBlocked =
    (isProtected && !user) ||
    (isPublicOnly && user) ||
    (isAdminRoute && user && user.role !== "admin");

  useEffect(() => {
    if (isLoading || !isBlocked) return;

    if (isProtected && !user) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    if (isAdminRoute && user && user.role !== "admin") {
      navigate("/profile", { replace: true });
      return;
    }

    if (isPublicOnly && user) {
      navigate("/profile", { replace: true });
    }
  }, [
    isLoading,
    isBlocked,
    isProtected,
    isPublicOnly,
    isAdminRoute,
    user,
    navigate,
    location.pathname
  ]);

  if (isLoading) {
    return <RouteFallback />;
  }

  // Avoid flashing protected content during the redirect above.
  if (isBlocked) {
    return <RouteFallback />;
  }

  return (
    <>
      <Navbar />
      <main id="main-content" style={{ minHeight: "calc(100vh - 150px)" }}>
        <Outlet context={{ user }} />
      </main>
      <SiteFooter />
    </>
  );
}

export default App;
