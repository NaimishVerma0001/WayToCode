// src/components/Aim.js

import React from "react";
import { motion } from "framer-motion";
import "../styles/Aim.css";

const problems = [
  {
    number: "01",
    title: "Scattered Workspaces",
    description:
      "Juggling tasks, code problem trackers, and focus timers across disjointed apps creates mental fatigue.",
  },
  {
    number: "02",
    title: "Broken Daily Streaks",
    description:
      "Lacking structured visibility into Problem of the Day (POTD) targets leads to inconsistent coding habits.",
  },
  {
    number: "03",
    title: "Context Switching",
    description:
      "Constantly jumping between tabs to manage bug parking, links, and study notes breaks your deep-work flow state.",
  },
  {
    number: "04",
    title: "Unmeasured Velocity",
    description:
      "Raw code metrics fail to show your actual daily sprint completion rates or long-term growth patterns.",
  },
];

const solutions = [
  {
    icon: "📝",
    title: "Modular Sprint Planner",
    description:
      "Manage tasks, POTD items, bug parking, and quick links in a unified, decoupled workspace dashboard.",
  },
  {
    icon: "🔥",
    title: "POTD Streak Engine",
    description:
      "Automated backend streak calculation ensures your algorithmic practice habits stay consistent and tamper-proof.",
  },
  {
    icon: "⏱️",
    title: "Dual-Display Focus Timer",
    description:
      "Switch effortlessly between digital precision and classic analog clock faces with customizable work intervals.",
  },
  {
    icon: "⚡",
    title: "Decoupled Architecture",
    description:
      "Independent React client and Node/Express server optimized for seamless CI/CD deployments on Vercel and Render.",
  },
];

const journeySteps = [
  {
    step: "01",
    title: "Plan",
    description: "Organize your daily developer tasks, bug lists, and algorithmic goals in one hub.",
  },
  {
    step: "02",
    title: "Focus",
    description: "Execute deep work blocks using the integrated analog-digital Pomodoro timer.",
  },
  {
    step: "03",
    title: "Maintain",
    description: "Track your POTD streaks and compound your daily growth consistently.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const revealVariants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const Aim = () => {
  return (
    <main className="aim-container">
      <section className="aim-hero" aria-labelledby="aim-page-title">
        <div className="aim-hero-glow aim-hero-glow-one" />
        <div className="aim-hero-glow aim-hero-glow-two" />

        <motion.div
          className="aim-hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="aim-eyebrow" variants={revealVariants}>
            <span className="aim-eyebrow-dot" aria-hidden="true" />
            The architecture behind Way2Code
          </motion.div>

          <motion.h1 id="aim-page-title" variants={revealVariants}>
            Engineered for velocity.
            <span> Built for deep focus.</span>
          </motion.h1>

          <motion.p className="aim-hero-description" variants={revealVariants}>
            Way2Code combines modular sprint planning, automated streak engines,
            and precision focus timers into a single professional developer workspace.
          </motion.p>

          <motion.div className="aim-hero-actions" variants={revealVariants}>
            <a href="#our-solution" className="aim-primary-link">
              Explore workspace features
              <span aria-hidden="true">→</span>
            </a>

            <a href="#our-vision" className="aim-secondary-link">
              Read our architecture vision
            </a>
          </motion.div>

          <motion.div className="aim-hero-metrics" variants={revealVariants}>
            <div>
              <strong>Decoupled</strong>
              <span>React & Node API</span>
            </div>

            <div>
              <strong>Streak</strong>
              <span>Backend POTD tracking</span>
            </div>

            <div>
              <strong>Pomodoro</strong>
              <span>Dual analog-digital</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="aim-hero-visual"
          initial={{ opacity: 0, x: 45 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.85,
            delay: 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          aria-hidden="true"
        >
          <div className="aim-visual-window">
            <div className="aim-visual-header">
              <div className="aim-window-controls">
                <span />
                <span />
                <span />
              </div>

              <span className="aim-window-label">Workspace overview</span>
            </div>

            <div className="aim-visual-body">
              <div className="aim-progress-heading">
                <div>
                  <span>Sprint completion</span>
                  <strong>Task velocity</strong>
                </div>

                <span className="aim-progress-growth">88%</span>
              </div>

              <div className="aim-chart">
                <span style={{ "--bar-height": "42%" }} />
                <span style={{ "--bar-height": "60%" }} />
                <span style={{ "--bar-height": "55%" }} />
                <span style={{ "--bar-height": "78%" }} />
                <span style={{ "--bar-height": "70%" }} />
                <span style={{ "--bar-height": "92%" }} />
                <span style={{ "--bar-height": "85%" }} />
              </div>

              <div className="aim-visual-stats">
                <div>
                  <span>Tasks</span>
                  <strong>Active</strong>
                </div>

                <div>
                  <span>POTD Streak</span>
                  <strong>🔥 Sync&apos;d</strong>
                </div>

                <div>
                  <span>Focus Timer</span>
                  <strong>Ready</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="aim-floating-card aim-floating-card-top">
            <span className="aim-floating-icon">🔥</span>
            <div>
              <strong>Backend Streak Secured</strong>
              <span>Server-verified validation</span>
            </div>
          </div>

          <div className="aim-floating-card aim-floating-card-bottom">
            <span className="aim-floating-icon">⏱️</span>
            <div>
              <strong>Pomodoro Active</strong>
              <span>25:00 Focus session</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="aim-section aim-problem-section">
        <motion.div
          className="aim-section-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={containerVariants}
        >
          <motion.span className="aim-section-label" variants={revealVariants}>
            The developer bottleneck
          </motion.span>

          <motion.h2 variants={revealVariants}>
            Fragmented tools disrupt engineering flow state.
          </motion.h2>

          <motion.p variants={revealVariants}>
            Developers shouldn&apos;t have to bounce between task lists, timers, and
            coding platforms. A unified workspace eliminates friction.
          </motion.p>
        </motion.div>

        <motion.div
          className="problem-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {problems.map((problem) => (
            <motion.article
              key={problem.number}
              className="problem-card"
              variants={revealVariants}
              whileHover={{ y: -7 }}
              transition={{ duration: 0.25 }}
            >
              <span className="problem-number">{problem.number}</span>

              <div className="problem-card-icon" aria-hidden="true">
                ×
              </div>

              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section
        className="aim-section aim-solution-section"
        id="our-solution"
      >
        <motion.div
          className="aim-section-heading aim-section-heading-centred"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={containerVariants}
        >
          <motion.span className="aim-section-label" variants={revealVariants}>
            The solution
          </motion.span>

          <motion.h2 variants={revealVariants}>
            One unified workspace built for execution.
          </motion.h2>

          <motion.p variants={revealVariants}>
            Way2Code integrates modular sprint management, secure streak engines,
            and distraction-free focus tools into a clean, modern interface.
          </motion.p>
        </motion.div>

        <motion.div
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {solutions.map((solution) => (
            <motion.article
              key={solution.title}
              className="feature-card"
              variants={revealVariants}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="feature-card-top">
                <span className="feature-icon" aria-hidden="true">
                  {solution.icon}
                </span>

                <span className="feature-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>

              <h3>{solution.title}</h3>
              <p>{solution.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="aim-journey-section">
        <motion.div
          className="aim-section-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={containerVariants}
        >
          <motion.span className="aim-section-label" variants={revealVariants}>
            Workflow cycle
          </motion.span>

          <motion.h2 variants={revealVariants}>
            A seamless path from task planning to execution.
          </motion.h2>
        </motion.div>

        <motion.div
          className="aim-journey-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {journeySteps.map((item) => (
            <motion.article
              key={item.step}
              className="aim-journey-card"
              variants={revealVariants}
            >
              <span className="aim-journey-number">{item.step}</span>

              <div className="aim-journey-line" aria-hidden="true" />

              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="aim-vision-section" id="our-vision">
        <div className="aim-vision-decoration" aria-hidden="true" />

        <motion.div
          className="aim-vision-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.span className="aim-section-label" variants={revealVariants}>
            Our standard
          </motion.span>

          <motion.h2 variants={revealVariants}>
            Architected for scale and developer velocity.
          </motion.h2>

          <motion.p variants={revealVariants}>
            We believe productivity tools should be as robust as the software you build.
            Way2Code prioritizes secure server-side logic, decoupled deployments, and 
            distraction-free interfaces.
          </motion.p>

          <motion.div className="aim-vision-quote" variants={revealVariants}>
            <span aria-hidden="true">“</span>
            <p>
              Clean architecture in your workspace translates directly to clean code in your codebase.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="aim-vision-values"
          initial={{ opacity: 0, x: 35 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div>
            <span>01</span>
            <strong>Modularity over monoliths</strong>
          </div>

          <div>
            <span>02</span>
            <strong>Security over client trust</strong>
          </div>

          <div>
            <span>03</span>
            <strong>Velocity over friction</strong>
          </div>
        </motion.div>
      </section>

      <section className="aim-cta">
        <div className="aim-cta-glow" aria-hidden="true" />

        <motion.div
          className="aim-cta-content"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <span className="aim-cta-label">Ready to optimize?</span>

          <h2>Transform your development workspace today.</h2>

          <p>
            Deploy your tasks, track your POTD streaks, and lock into deep-work sessions 
            with Way2Code.
          </p>

          <a href="#aim-page-title" className="aim-cta-button">
            Launch workspace
            <span aria-hidden="true">→</span>
          </a>
        </motion.div>
      </section>
    </main>
  );
};

export default Aim;