import React from "react";

import {
  FaArrowRight,
  FaChartLine,
  FaCheckCircle,
  FaCode,
  FaGithub,
  FaTrophy
} from "react-icons/fa";

import {
  SiCodechef,
  SiCodeforces,
  SiGeeksforgeeks,
  SiLeetcode
} from "react-icons/si";

import Navbar from "./Navbar";

import "../styles/Header.css";

function Header({
  children
}) {
  const scrollToSection = (
    sectionId
  ) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  };

  return (
    <Navbar
      renderHome={({
        openRegister,
        openProfile,
        isLoggedIn
      }) => (
        <main className=
          "way2code-home"
        >
          <section
            className="home-hero"
            aria-labelledby=
              "home-hero-title"
          >
            <div
              className=
                "home-hero-glow home-hero-glow-one"
              aria-hidden="true"
            />

            <div
              className=
                "home-hero-glow home-hero-glow-two"
              aria-hidden="true"
            />

            <div className=
              "home-hero-content"
            >
              <div className=
                "home-hero-eyebrow"
              >
                <span>
                  <FaChartLine />
                </span>

                Your complete coding
                progress workspace
              </div>

              <h1 id="home-hero-title">
                One dashboard for your
                entire
                <span>
                  coding journey.
                </span>
              </h1>

              <p className=
                "home-hero-description"
              >
                Connect your competitive
                programming profiles,
                follow genuine progress,
                discover upcoming
                contests and understand
                exactly where you are
                improving.
              </p>

              <div className=
                "home-hero-actions"
              >
                <button
                  type="button"
                  className=
                    "home-primary-action"
                  onClick={
                    isLoggedIn
                      ? openProfile
                      : openRegister
                  }
                >
                  {isLoggedIn
                    ? "Open Dashboard"
                    : "Start Tracking Free"}

                  <FaArrowRight />
                </button>

                <button
                  type="button"
                  className=
                    "home-secondary-action"
                  onClick={() =>
                    scrollToSection(
                      "home-features"
                    )
                  }
                >
                  Explore Features
                </button>
              </div>

              <div className=
                "home-hero-assurance"
              >
                <span>
                  <FaCheckCircle />
                  Free to get started
                </span>

                <span>
                  <FaCheckCircle />
                  Seven integrations
                </span>

                <span>
                  <FaCheckCircle />
                  Secure profile data
                </span>
              </div>

              <div className=
                "home-hero-metrics"
              >
                <div>
                  <strong>7</strong>
                  <span>
                    Coding platforms
                  </span>
                </div>

                <div>
                  <strong>1</strong>
                  <span>
                    Unified dashboard
                  </span>
                </div>

                <div>
                  <strong>24/7</strong>
                  <span>
                    Progress visibility
                  </span>
                </div>
              </div>
            </div>

            <div className=
              "home-hero-visual"
            >
              <div
                className=
                  "home-preview-shell"
                aria-label=
                  "Way2Code dashboard preview"
              >
                <div className=
                  "home-preview-toolbar"
                >
                  <div
                    className=
                      "home-window-controls"
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                  </div>

                  <span>
                    Progress overview
                  </span>

                  <span className=
                    "home-live-status"
                  >
                    <i />
                    Live
                  </span>
                </div>

                <div className=
                  "home-preview-body"
                >
                  <div className=
                    "home-preview-heading"
                  >
                    <div>
                      <span>
                        Total progress
                      </span>

                      <strong>
                        1,248
                      </strong>

                      <small>
                        Problems solved
                      </small>
                    </div>

                    <span className=
                      "home-growth-badge"
                    >
                      +18.6%
                    </span>
                  </div>

                  <div className=
                    "home-preview-chart"
                  >
                    <div
                      className=
                        "home-chart-grid"
                      aria-hidden="true"
                    />

                    <svg
                      viewBox=
                        "0 0 520 190"
                      role="img"
                      aria-label=
                        "Sample coding progress increasing over time"
                    >
                      <defs>
                        <linearGradient
                          id=
                            "home-chart-area"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor=
                              "#6366f1"
                            stopOpacity=
                              "0.35"
                          />

                          <stop
                            offset="100%"
                            stopColor=
                              "#6366f1"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>

                      <path
                        className=
                          "home-chart-area"
                        d="
                          M10 166
                          C55 158 70 139 105 144
                          S155 117 190 124
                          S240 91 275 103
                          S322 69 358 78
                          S411 42 448 55
                          S489 26 510 20
                          L510 185
                          L10 185
                          Z
                        "
                      />

                      <path
                        className=
                          "home-chart-line"
                        d="
                          M10 166
                          C55 158 70 139 105 144
                          S155 117 190 124
                          S240 91 275 103
                          S322 69 358 78
                          S411 42 448 55
                          S489 26 510 20
                        "
                      />
                    </svg>
                  </div>

                  <div className=
                    "home-preview-stats"
                  >
                    <div>
                      <span>
                        <SiLeetcode />
                      </span>

                      <p>
                        LeetCode
                        <strong>752</strong>
                      </p>
                    </div>

                    <div>
                      <span>
                        <SiCodeforces />
                      </span>

                      <p>
                        Codeforces
                        <strong>321</strong>
                      </p>
                    </div>

                    <div>
                      <span>
                        <FaGithub />
                      </span>

                      <p>
                        GitHub
                        <strong>186</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className=
                "home-floating-card home-floating-card-top"
              >
                <span>
                  <FaTrophy />
                </span>

                <div>
                  <strong>
                    Contest ready
                  </strong>

                  <small>
                    Upcoming events in
                    one place
                  </small>
                </div>
              </div>

              <div className=
                "home-floating-card home-floating-card-bottom"
              >
                <span>
                  <FaCode />
                </span>

                <div>
                  <strong>
                    Daily progress
                  </strong>

                  <small>
                    Real historical
                    snapshots
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section
            className=
              "home-platform-strip"
            aria-label=
              "Supported coding platforms"
          >
            <p>
              Connect the platforms you
              already use
            </p>

            <div>
              <span>
                <SiLeetcode />
                LeetCode
              </span>

              <span>
                <SiCodeforces />
                Codeforces
              </span>

              <span>
                <SiCodechef />
                CodeChef
              </span>

              <span>
                <SiGeeksforgeeks />
                GeeksforGeeks
              </span>

              <span>
                <FaGithub />
                GitHub
              </span>
            </div>
          </section>

          {children}
        </main>
      )}
    />
  );
}

export default Header;