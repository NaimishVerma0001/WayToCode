import React, { useEffect, useMemo, useState } from "react";
import {
  FaSearch, FaStar, FaRegStar, FaExternalLinkAlt,
  FaFireAlt, FaBrain,
} from "react-icons/fa";
import { RESOURCE_DATA } from "../data/resource"; // MOVE YOUR DATA HERE
import "../styles/ExploreMore.css";

const FILTERS = [
  "All", "DSA", "Web Development", "Competitive Programming",
  "Artificial Intelligence", "Interview", "Career", "Computer Science"
];

// 1. EXTRACTED CARD COMPONENT
const ResourceCard = ({ resource, isFavorite, onToggleFavorite }) => (
  <div className={`resource-card ${resource.featured ? 'featured-card' : ''}`}>
    <div className="card-top">
      <div className="card-icon">{resource.icon}</div>
      <button className="favorite-btn" onClick={() => onToggleFavorite(resource.id)}>
        {isFavorite ? <FaStar /> : <FaRegStar />}
      </button>
    </div>
    <span className="resource-category">{resource.category}</span>
    <h3>{resource.title}</h3>
    <p>{resource.description}</p>
    <div className="resource-tags">
      <span>{resource.level}</span>
      <span>{resource.type}</span>
    </div>
    {/* APPLY THE INLINE STYLE FIX HERE */}
    <a 
      href={resource.url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="resource-link"
      style={{ position: "relative", zIndex: 9999, pointerEvents: "auto", display: "inline-block" }}
    >
      Visit Resource <FaExternalLinkAlt />
    </a>
  </div>
);

export default function ExploreMore() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("way2codeFavorites")) || [];
    setFavorites(stored);
  }, []);

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("way2codeFavorites", JSON.stringify(updated));
  };

  const filteredResources = useMemo(() => {
    return RESOURCE_DATA.filter((resource) => {
      const matchSearch =
        resource.title.toLowerCase().includes(search.toLowerCase()) ||
        resource.description.toLowerCase().includes(search.toLowerCase()) ||
        resource.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeFilter === "All" || resource.category === activeFilter;
      
      return matchSearch && matchCategory;
    });
  }, [search, activeFilter]);

  const isSearching = search.trim() !== "" || activeFilter !== "All";

  // Pre-compute sections only if we aren't searching to save CPU cycles
  const featured = !isSearching ? RESOURCE_DATA.filter(r => r.featured) : [];
  const trending = !isSearching ? RESOURCE_DATA.filter(r => r.trending) : [];
  const recommended = !isSearching ? RESOURCE_DATA.filter(r => r.category === "Web Development" || r.category === "DSA") : [];

  return (
    <div className="explore-page">
      {/* HERO SECTION STAYS THE SAME */}
      <section className="explore-hero">
        <div className="hero-left">
          <span className="hero-badge"><FaFireAlt /> Developer Resource Hub</span>
          <h1>Explore<span> Learn.</span><span> Build.</span></h1>
          <p>Discover the best free resources, roadmaps, and interview prep.</p>
          <div className="hero-search">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-stat"><h2>{RESOURCE_DATA.length}</h2><p>Resources</p></div>
          <div className="hero-stat"><h2>{favorites.length}</h2><p>Bookmarks</p></div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="filter-section">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? "active-filter" : ""}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </section>

      {/* CONDITIONAL LAYOUT: Search Results OR Default View */}
      {isSearching ? (
        <section className="resource-section">
          <div className="section-header">
            <h2><FaSearch className="mr-2" style={{ display: 'inline' }} /> Search Results</h2>
            <p>Showing <strong>{filteredResources.length}</strong> resources</p>
          </div>
          {filteredResources.length === 0 ? (
            <div className="empty-state">
              <h3>No resources found</h3>
              <p>Try another keyword or select a different category.</p>
            </div>
          ) : (
            <div className="resource-grid">
              {filteredResources.map((res) => (
                <ResourceCard 
                  key={res.id} 
                  resource={res} 
                  isFavorite={favorites.includes(res.id)} 
                  onToggleFavorite={toggleFavorite} 
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="resource-section">
            <div className="section-header">
              <h2>Featured</h2>
            </div>
            <div className="resource-grid">
              {featured.map((res) => (
                <ResourceCard key={res.id} resource={res} isFavorite={favorites.includes(res.id)} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          </section>

          <section className="resource-section">
            <div className="section-header">
              <h2><FaBrain style={{ display: 'inline' }} /> Recommended For You</h2>
            </div>
            <div className="resource-grid">
              {recommended.map((res) => (
                <ResourceCard key={res.id} resource={res} isFavorite={favorites.includes(res.id)} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          </section>

          <section className="resource-section">
            <div className="section-header">
              <h2>Trending</h2>
            </div>
            <div className="resource-grid">
              {trending.map((res) => (
                <ResourceCard key={res.id} resource={res} isFavorite={favorites.includes(res.id)} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}