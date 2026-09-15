import React from 'react';
import { FaYoutube, FaGlobe, FaGithub, FaBrain } from "react-icons/fa";

export const RESOURCE_DATA = [
  {
    id: 1,
    title: "NeetCode Roadmap",
    description: "Complete DSA roadmap with blind 75, practice sheets and video explanations.",
    category: "DSA",
    level: "Intermediate",
    type: "YouTube",
    featured: true,
    trending: true,
    icon: <FaYoutube />,
    url: "https://www.youtube.com/@NeetCode"
  },
  {
    id: 2,
    title: "The Odin Project",
    description: "One of the best completely free full stack development curriculums.",
    category: "Web Development",
    level: "Beginner",
    type: "Website",
    featured: true,
    trending: false,
    icon: <FaGlobe />,
    url: "https://www.theodinproject.com/"
  },
  {
    id: 3,
    title: "Full Stack Open",
    description: "University of Helsinki's React, Node.js and GraphQL course.",
    category: "Web Development",
    level: "Intermediate",
    type: "Course",
    featured: true,
    trending: true,
    icon: <FaGlobe />,
    url: "https://fullstackopen.com/en/"
  },
  {
    id: 4,
    title: "Codeforces",
    description: "Competitive programming platform with rated contests every week.",
    category: "Competitive Programming",
    level: "Advanced",
    type: "Practice",
    featured: false,
    trending: true,
    icon: <FaGlobe />,
    url: "https://codeforces.com/"
  },
  {
    id: 5,
    title: "LeetCode",
    description: "Interview preparation with thousands of coding problems.",
    category: "Interview",
    level: "All Levels",
    type: "Practice",
    featured: true,
    trending: true,
    icon: <FaGlobe />,
    url: "https://leetcode.com/"
  },
  {
    id: 6,
    title: "Roadmap.sh",
    description: "Developer roadmaps for frontend, backend, DevOps, AI and more.",
    category: "Career",
    level: "All Levels",
    type: "Roadmap",
    featured: false,
    trending: true,
    icon: <FaGlobe />,
    url: "https://roadmap.sh/"
  },
  {
    id: 7,
    title: "Developer Roadmaps GitHub",
    description: "Community maintained learning paths and engineering guides.",
    category: "Career",
    level: "All Levels",
    type: "GitHub",
    featured: false,
    trending: false,
    icon: <FaGithub />,
    url: "https://github.com/kamranahmedse/developer-roadmap"
  },
  {
    id: 8,
    title: "FreeCodeCamp",
    description: "Completely free certifications for web development and backend.",
    category: "Web Development",
    level: "Beginner",
    type: "Course",
    featured: true,
    trending: true,
    icon: <FaYoutube />,
    url: "https://www.freecodecamp.org/"
  },
  {
    id: 9,
    title: "CS50 Harvard",
    description: "One of the world's best introductory computer science courses.",
    category: "Computer Science",
    level: "Beginner",
    type: "Course",
    featured: false,
    trending: true,
    icon: <FaYoutube />,
    url: "https://cs50.harvard.edu/"
  },
  {
    id: 10,
    title: "Hugging Face",
    description: "Learn AI, LLMs, Transformers and open-source machine learning.",
    category: "Artificial Intelligence",
    level: "Intermediate",
    type: "Documentation",
    featured: true,
    trending: true,
    icon: <FaBrain />,
    url: "https://huggingface.co/"
  },
  {
    id: 11,
    title: "Awesome AI",
    description: "Curated collection of AI tools, frameworks and learning resources.",
    category: "Artificial Intelligence",
    level: "All Levels",
    type: "GitHub",
    featured: false,
    trending: true,
    icon: <FaGithub />,
    url: "https://github.com/mahseema/awesome-ai-tools"
  },
  {
    id: 12,
    title: "GeeksforGeeks DSA",
    description: "Structured DSA tutorials, interview questions and practice.",
    category: "DSA",
    level: "Beginner",
    type: "Website",
    featured: false,
    trending: true,
    icon: <FaGlobe />,
    url: "https://www.geeksforgeeks.org/"
  } ,

  // Append these inside the RESOURCE_DATA array in src/data/resources.js
  {
    id: 13,
    title: "Striver's A2Z DSA Sheet",
    description: "The most structured C++ & Java DSA roadmap for product-based company interviews.",
    category: "DSA",
    level: "All Levels",
    type: "Practice",
    featured: true,
    trending: true,
    icon: <FaGlobe />,
    url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/"
  },
  {
    id: 14,
    title: "System Design Primer",
    description: "Learn how to design large-scale scalable systems. Essential for advanced interviews.",
    category: "Computer Science",
    level: "Advanced",
    type: "GitHub",
    featured: true,
    trending: true,
    icon: <FaGithub />,
    url: "https://github.com/donnemartin/system-design-primer"
  },
  {
    id: 15,
    title: "React Official Documentation",
    description: "The absolute best place to learn modern React (Hooks, Server Components, Architecture).",
    category: "Web Development",
    level: "All Levels",
    type: "Documentation",
    featured: true,
    trending: false,
    icon: <FaGlobe />,
    url: "https://react.dev/"
  },
  {
    id: 16,
    title: "MDN Web Docs",
    description: "The gold standard reference for HTML, CSS, and core JavaScript.",
    category: "Web Development",
    level: "Beginner",
    type: "Documentation",
    featured: false,
    trending: false,
    icon: <FaGlobe />,
    url: "https://developer.mozilla.org/en-US/"
  },
  {
    id: 17,
    title: "Kaggle",
    description: "Machine learning and data science community. Find datasets, models, and competitions.",
    category: "Artificial Intelligence",
    level: "Intermediate",
    type: "Practice",
    featured: true,
    trending: true,
    icon: <FaBrain />,
    url: "https://www.kaggle.com/"
  },
  {
    id: 18,
    title: "OSSU Computer Science",
    description: "Path to a free self-taught education in Computer Science using online materials.",
    category: "Computer Science",
    level: "All Levels",
    type: "GitHub",
    featured: false,
    trending: true,
    icon: <FaGithub />,
    url: "https://github.com/ossu/computer-science"
  }
];