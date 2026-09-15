import React, { useEffect, useState } from "react";
import "../styles/Profile.css";
import {
  FaGithub,
  FaCode,
  FaLaptopCode,
  FaSyncAlt,
  FaUnlink,
  FaCheckCircle,
  FaSignOutAlt,
  FaLink,
  FaUser,
  FaFire,
  FaChartLine,
  FaTrophy,
  FaMedal,
  FaExternalLinkAlt,
} from "react-icons/fa";

const PLATFORM_DATA = [
  {
    id: "leetcode",
    name: "LeetCode",
    icon: "🟨",
    placeholder: "Enter LeetCode Username",
    profile: (u) => `https://leetcode.com/u/${u}/`,
  },
  {
    id: "codeforces",
    name: "Codeforces",
    icon: "🔵",
    placeholder: "Enter Codeforces Handle",
    profile: (u) => `https://codeforces.com/profile/${u}`,
  },
  {
    id: "codechef",
    name: "CodeChef",
    icon: "🟤",
    placeholder: "Enter CodeChef Username",
    profile: (u) => `https://www.codechef.com/users/${u}`,
  },
  {
    id: "github",
    name: "GitHub",
    icon: <FaGithub />,
    placeholder: "Enter GitHub Username",
    profile: (u) => `https://github.com/${u}`,
  },
  {
    id: "gfg",
    name: "GeeksforGeeks",
    icon: "🟢",
    placeholder: "Enter GFG Username",
    profile: (u) =>
      `https://auth.geeksforgeeks.org/user/${u}`,
  },
  {
    id: "hackerrank",
    name: "HackerRank",
    icon: "🟩",
    placeholder: "Enter HackerRank Username",
    profile: (u) => `https://www.hackerrank.com/${u}`,
  },
];

function Profile({ user, handleLogout }) {
  const [profiles, setProfiles] = useState({});
  
  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("codingProfiles")
    );

    if (stored) {
      setProfiles(stored);
    }
  }, []);
  if (!user) return null;

  


  const saveProfiles = (updated) => {
    setProfiles(updated);

    localStorage.setItem(
      "codingProfiles",
      JSON.stringify(updated)
    );
  };

  const handleInput = (id, value) => {
    saveProfiles({
      ...profiles,
      [id]: {
        ...profiles[id],
        username: value,
      },
    });
  };

  const connectProfile = (id) => {
    const username = profiles[id]?.username;

    if (!username?.trim()) return;

    saveProfiles({
      ...profiles,
      [id]: {
        ...profiles[id],
        connected: true,
        lastSync: new Date().toLocaleString(),
      },
    });
  };

  const disconnectProfile = (id) => {
    saveProfiles({
      ...profiles,
      [id]: {
        username: "",
        connected: false,
        lastSync: "",
      },
    });
  };

  const syncProfile = (id) => {
    saveProfiles({
      ...profiles,
      [id]: {
        ...profiles[id],
        lastSync: new Date().toLocaleString(),
      },
    });
  };

  const connectedCount = Object.values(profiles).filter(
    (item) => item?.connected
  ).length;

  return (
    <div className="dashboard-wrapper">

      <section className="dashboard-hero">

        <div>

          <h1>

            Welcome Back

            <span>

              {" "}
              {user.username} 👋

            </span>

          </h1>

          <p>

            Connect every coding platform,
            analyse your journey,
            monitor your progress
            and become a better developer.

          </p>

        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >

          <FaSignOutAlt />

          Logout

        </button>

      </section>

      <section className="profile-section">

        <div className="profile-card">

          <div className="avatar">

            {user.username
              .charAt(0)
              .toUpperCase()}

          </div>

          <h2>{user.username}</h2>

          <p>{user.email}</p>

          <span className="joined">

            Joined {user.joined || "2026"}

          </span>

        </div>

        <div className="summary-grid">

          <div className="summary-card">

            <FaCode />

            <span>Total Problems</span>

            <h2>0</h2>

            <small>

              Will sync automatically

            </small>

          </div>

          <div className="summary-card">

            <FaChartLine />

            <span>Contest Rating</span>

            <h2>0</h2>

            <small>

              Live after sync

            </small>

          </div>

          <div className="summary-card">

            <FaFire />

            <span>Current Streak</span>

            <h2>0</h2>

            <small>

              Coming Soon

            </small>

          </div>

          <div className="summary-card">

            <FaTrophy />

            <span>

              Connected Platforms

            </span>

            <h2>

              {connectedCount}

            </h2>

            <small>

              of {PLATFORM_DATA.length}

            </small>

          </div>

        </div>

      </section>

      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Connect Coding Profiles

          </h2>

          <p>

            Add your usernames once.
            Way2Code will use them
            for fetching coding statistics.

          </p>

        </div>

        <div className="connect-grid">

          {PLATFORM_DATA.map((platform) => {

            const profile =
              profiles[platform.id] || {};

            return (

              <div
                key={platform.id}
                className="connect-card"
              >

                <div className="connect-top">

                  <div className="platform-icon">

                    {platform.icon}

                  </div>

                  <div>

                    <h3>

                      {platform.name}

                    </h3>

                    <span>

                      {profile.connected
                        ? "Connected"
                        : "Not Connected"}

                    </span>

                  </div>

                </div>

                <div className="input-group">

                  <FaUser />

                  <input
                    type="text"
                    placeholder={
                      platform.placeholder
                    }
                    value={
                      profile.username || ""
                    }
                    onChange={(e) =>
                      handleInput(
                        platform.id,
                        e.target.value
                      )
                    }
                  />

                </div>


                                <div className="connect-actions">

                  {!profile.connected ? (

                    <button
                      className="connect-btn"
                      onClick={() =>
                        connectProfile(platform.id)
                      }
                    >

                      <FaLink />

                      Connect

                    </button>

                  ) : (

                    <>
                      <button
                        className="sync-btn"
                        onClick={() =>
                          syncProfile(platform.id)
                        }
                      >

                        <FaSyncAlt />

                        Sync

                      </button>

                      <button
                        className="disconnect-btn"
                        onClick={() =>
                          disconnectProfile(platform.id)
                        }
                      >

                        <FaUnlink />

                        Disconnect

                      </button>
                    </>

                  )}

                </div>

                {profile.connected && (

                  <div className="connection-info">

                    <div className="status">

                      <FaCheckCircle />

                      Connected Successfully

                    </div>

                    <p>

                      Username :

                      <strong>

                        {" "}
                        {profile.username}

                      </strong>

                    </p>

                    <p>

                      Last Sync :

                      <strong>

                        {" "}
                        {profile.lastSync}

                      </strong>

                    </p>

                    <a
                      href={platform.profile(
                        profile.username
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >

                      Visit Profile

                      <FaExternalLinkAlt />

                    </a>

                  </div>

                )}

              </div>

            );

          })}

        </div>

      </section>

      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Overall Coding Progress

          </h2>

          <p>

            These values will automatically update once
            API integration is completed.

          </p>

        </div>

        <div className="progress-wrapper">

          <div className="progress-card">

            <div className="progress-top">

              <span>Easy Problems</span>

              <span>0 / 1000</span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{ width: "0%" }}
              />

            </div>

          </div>

          <div className="progress-card">

            <div className="progress-top">

              <span>Medium Problems</span>

              <span>0 / 2000</span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{ width: "0%" }}
              />

            </div>

          </div>

          <div className="progress-card">

            <div className="progress-top">

              <span>Hard Problems</span>

              <span>0 / 1000</span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{ width: "0%" }}
              />

            </div>

          </div>

        </div>

      </section>

      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Achievements

          </h2>

          <p>

            Unlock badges by staying consistent.

          </p>

        </div>

        <div className="achievement-grid">

          <div className="achievement-card">

            <FaMedal />

            <h3>First Problem</h3>

            <p>

              Solve your first coding problem.

            </p>

          </div>

          <div className="achievement-card">

            <FaFire />

            <h3>7 Day Streak</h3>

            <p>

              Practice coding for 7 consecutive days.

            </p>

          </div>

          <div className="achievement-card">

            <FaTrophy />

            <h3>Contest Warrior</h3>

            <p>

              Participate in 10 contests.

            </p>

          </div>

          <div className="achievement-card">

            <FaCode />

            <h3>100 Problems</h3>

            <p>

              Solve your first 100 coding questions.

            </p>

          </div>

        </div>

      </section>
      
      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Recent Activity

          </h2>

          <p>

            Your latest coding activity will appear here after
            connecting your platforms.

          </p>

        </div>

        <div className="activity-list">

          <div className="activity-card">

            <div className="activity-icon">

              <FaCode />

            </div>

            <div>

              <h4>

                No Recent Activity

              </h4>

              <p>

                Connect your coding profiles to start
                tracking solved problems.

              </p>

            </div>

          </div>

          <div className="activity-card">

            <div className="activity-icon">

              <FaChartLine />

            </div>

            <div>

              <h4>

                Analytics Waiting

              </h4>

              <p>

                Contest ratings, acceptance rate,
                difficulty-wise progress and platform
                analytics will automatically appear here.

              </p>

            </div>

          </div>

          <div className="activity-card">

            <div className="activity-icon">

              <FaFire />

            </div>

            <div>

              <h4>

                Daily Streak

              </h4>

              <p>

                Keep solving problems every day to
                maintain your coding streak.

              </p>

            </div>

          </div>

        </div>

      </section>

      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Platform Overview

          </h2>

          <p>

            Quick overview of every connected coding
            platform.

          </p>

        </div>

        <div className="overview-grid">

          {PLATFORM_DATA.map((platform) => {

            const profile = profiles[platform.id] || {};

            return (

              <div
                key={platform.id}
                className="overview-card"
              >

                <div className="overview-header">

                  <span className="overview-icon">

                    {platform.icon}

                  </span>

                  <h3>

                    {platform.name}

                  </h3>

                </div>

                <div className="overview-body">

                  <p>

                    <strong>Status :</strong>{" "}

                    {profile.connected
                      ? "Connected"
                      : "Not Connected"}

                  </p>

                  <p>

                    <strong>Username :</strong>{" "}

                    {profile.username || "--"}

                  </p>

                  <p>

                    <strong>Problems :</strong> 0

                  </p>

                  <p>

                    <strong>Rating :</strong> --

                  </p>

                  <p>

                    <strong>Rank :</strong> --

                  </p>

                </div>

              </div>

            );

          })}

        </div>

      </section>

      <section className="dashboard-section">

        <div className="section-title">

          <h2>

            Coming Soon

          </h2>

          <p>

            Features currently under development.

          </p>

        </div>

        <div className="feature-grid">

          <div className="feature-card">

            <FaLaptopCode />

            <h3>

              Automatic Profile Sync

            </h3>

            <p>

              Fetch solved problems directly from
              coding platforms using APIs.

            </p>

          </div>

          <div className="feature-card">

            <FaChartLine />

            <h3>

              AI Performance Analysis

            </h3>

            <p>

              Personalized recommendations based on
              your coding history.

            </p>

          </div>

          <div className="feature-card">

            <FaFire />

            <h3>

              Daily Challenge

            </h3>

            <p>

              Get one personalised coding challenge
              every day.

            </p>

          </div>

          <div className="feature-card">

            <FaTrophy />

            <h3>

              Global Leaderboard

            </h3>

            <p>

              Compete with Way2Code users around the
              world.

            </p>

          </div>

        </div>

      </section>

    </div>

  );

}

export default Profile;