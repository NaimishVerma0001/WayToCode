import React from "react";

import {
  FaChartLine,
  FaCompass,
  FaTrophy
} from "react-icons/fa";

import "../styles/SiteFooter.css";

function SiteFooter({
  onHome,
  onDashboard,
  onContest,
  onExplore
}) {
  const currentYear =
    new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className=
        "site-footer-container"
      >
        <div className=
          "site-footer-main"
        >
          <div className=
            "site-footer-brand"
          >
            <div className=
              "site-footer-logo"
            >
              <span aria-hidden="true">W2</span>

              <strong>WAY2CODE</strong>
            </div>

            <p>
              One focused workspace for
              tracking coding progress,
              competitive profiles and
              upcoming contests.
            </p>

            <div className=
              "site-footer-trust"
            >
              <span>
                <i />
                Secure authentication
              </span>

              <span>
                <i />
                Live platform data
              </span>
            </div>
          </div>

          <div className=
            "site-footer-navigation"
          >
            <div>
              <h2>Product</h2>

              <button
                type="button"
                onClick={onDashboard}
              >
                <FaChartLine />
                Dashboard
              </button>

              <button
                type="button"
                onClick={onContest}
              >
                <FaTrophy />
                Contests
              </button>

              <button
                type="button"
                onClick={onExplore}
              >
                <FaCompass />
                Explore
              </button>
            </div>

            <div>
              <h2>WAY2CODE</h2>

              <button
                type="button"
                onClick={onHome}
              >
                Home
              </button>

              <span>
                Privacy Policy
              </span>

              <span>
                Terms of Service
              </span>
            </div>
          </div>
        </div>

        <div className=
          "site-footer-divider"
        />

        <div className=
          "site-footer-bottom"
        >
          <p className=
            "site-footer-copyright"
          >
            © {currentYear} Way2Code.
            All rights reserved.
          </p>

          <p className=
            "site-footer-disclaimer"
          >
            Way2Code is an independent
            developer platform and is not
            affiliated with the coding
            platforms it integrates.
          </p>

          <span className=
            "site-footer-status"
          >
            <i />
            Systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;