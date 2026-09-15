import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiLogOut, FiMenu, FiX } from "react-icons/fi";

import LoginToast from "./LoginToast";
import NotificationBell from "./NotificationBell";
import { getCurrentUser, logoutUser } from "../services/authService";

import "../styles/Navbar.css";
import "../styles/LoginToast.css";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/profile", label: "Dashboard", private: true },
  { to: "/contest", label: "Contests" },
  { to: "/planner", label: "Planner", private: true },
  { to: "/explore", label: "Explore" },
  { to: "/suggestions", label: "Ideas" }
];

/** Two initials are enough to identify an account at 32px. */
const getInitials = (username) => {
  if (!username) return "?";

  const parts = username.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ");

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function Navbar() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => getCurrentUser({ signal }),
    staleTime: 1000 * 60 * 15,
    retry: false
  });

  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "admin";

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // The bar gains a border only once content has moved under it.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigating away should always close the mobile panel.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // A panel that covers the page must close on Escape.
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const requireSignIn = (message) => {
    toast.dismiss();
    toast(
      <LoginToast
        onLogin={() => {
          toast.dismiss();
          navigate("/register");
        }}
      />,
      {
        position: "top-center",
        autoClose: 2500,
        closeOnClick: false,
        draggable: false,
        hideProgressBar: true,
        toastId: message
      }
    );
  };

  const handleProtectedNav = (event, link) => {
    if (link.private && !isLoggedIn) {
      event.preventDefault();
      requireSignIn("nav-login-required");
    }
  };

  const handleLogout = async () => {
    /*
     * Awaited so the server actually revokes the token before the page
     * reloads. Firing and reloading immediately aborted the request, leaving
     * the session alive on the server.
     */
    await logoutUser();

    queryClient.setQueryData(["currentUser"], null);
    await queryClient.invalidateQueries();

    toast.success("Signed out.");
    navigate("/", { replace: true });
  };

  const visibleLinks = NAV_LINKS.filter((link) => !link.private || isLoggedIn);

  return (
    <header className={`navbar ${isScrolled ? "navbar--scrolled" : ""}`}>
      <div className="navbar__inner">
        <Link to="/" className="wordmark" aria-label="Way2Code home">
          <span className="wordmark__mark mono" aria-hidden="true">
            W2
          </span>
          <span className="wordmark__text">WAY2CODE</span>
        </Link>

        <nav className="navbar__nav" aria-label="Primary">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `navbar__link ${isActive ? "navbar__link--active" : ""}`
              }
              onClick={(event) => handleProtectedNav(event, link)}
            >
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `navbar__link navbar__link--admin ${
                  isActive ? "navbar__link--active" : ""
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="navbar__actions">
          {isLoggedIn && <NotificationBell />}

          {isLoggedIn ? (
            <>
              <Link to="/profile" className="avatar" title={user.username}>
                <span className="avatar__initials mono">
                  {getInitials(user.username)}
                </span>
              </Link>

              <button
                type="button"
                className="btn btn--ghost btn--sm navbar__signout"
                onClick={handleLogout}
              >
                <FiLogOut aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <Link to="/register" className="btn btn--primary btn--sm">
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="navbar__toggle"
            aria-expanded={isMenuOpen}
            aria-controls="navbar-mobile"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      <div
        id="navbar-mobile"
        className={`navbar__mobile ${isMenuOpen ? "navbar__mobile--open" : ""}`}
        hidden={!isMenuOpen}
      >
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`
            }
            onClick={(event) => handleProtectedNav(event, link)}
          >
            {link.label}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" className="navbar__mobile-link">
            Admin
          </NavLink>
        )}

        {isLoggedIn && (
          <button
            type="button"
            className="navbar__mobile-link navbar__mobile-link--signout"
            onClick={handleLogout}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}

export default Navbar;
