// client/src/components/PublicSuggestions.js

import { toast } from "react-toastify";
import React, { useState, useEffect } from "react";
import { apiRequest } from "../services/apiClient";
import "../styles/PublicSuggestions.css";

const PublicSuggestions = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Form inputs
    const [authorName, setAuthorName] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("feature");

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const res = await apiRequest("/suggestions", { authenticated: false });
            setSuggestions(res.data);
            setError("");
        } catch (err) {
            setError(err.message || "Failed to load suggestions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim() || !authorName.trim()) return;

        try {
            const res = await apiRequest("/suggestions", {
                method: "POST",
                authenticated: false,
                body: { authorName, title, description, category }
            });
            setSuggestions([res.data, ...suggestions]);
            setTitle("");
            setDescription("");
            setAuthorName("");
        } catch (err) {
            toast.error(err.message || "That suggestion could not be posted.");
        }
    };

    const handleUpvote = async (id) => {
        try {
            const res = await apiRequest(`/suggestions/${id}/upvote`, {
                method: "PUT",
                authenticated: false
            });
            setSuggestions(suggestions.map(s => s._id === id ? res.data : s));
        } catch (err) {
            toast.error(err.message || "You have already voted on this idea.");
        }
    };

    return (
        <div className="suggestions-wrapper">
            <header className="suggestions-header">
                <h2>Ideas</h2>
                <p>Tell us what would make Way2Code more useful. Vote on what others have asked for.</p>
            </header>

            {error && <div className="suggestions-error">{error}</div>}

            <div className="suggestions-body">
            <form onSubmit={handleSubmit} className="suggestion-form">
                <h3>Suggest something</h3>
                <div className="form-grid">
                    <input
                        type="text"
                        placeholder="Your Name / Handle"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                        maxLength={50}
                    />
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="feature">Feature</option>
                        <option value="content">Learning content</option>
                        <option value="ui">Interface</option>
                        <option value="other">Something else</option>
                    </select>
                </div>
                <input
                    type="text"
                    placeholder="Short Title (e.g., Integrated Code Editor with Test Cases)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={100}
                />
                <textarea
                    placeholder="Explain how this feature would make your learning easier..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    maxLength={500}
                />
                <button type="submit" className="submit-idea-btn">Submit Suggestion</button>
            </form>

            <div className="suggestions-list">
                <h3>What people are asking for</h3>
                {loading ? (
                    <div className="loading-state">Loading ideas...</div>
                ) : suggestions.length === 0 ? (
                    <div className="empty-suggestions">Nothing suggested yet. Add the first idea.</div>
                ) : (
                    suggestions.map((item) => (
                        <div key={item._id} className="suggestion-card">
                            <button
                                type="button"
                                className="upvote-box"
                                onClick={() => handleUpvote(item._id)}
                                aria-label={`Upvote ${item.title}`}
                            >
                                <span className="arrow" aria-hidden="true">▲</span>
                                <span className="count">{item.upvotes}</span>
                            </button>
                            <div className="suggestion-content">
                                <div className="suggestion-meta">
                                    <span className={`badge category-${item.category}`}>{item.category}</span>
                                    <span className="author">by {item.authorName}</span>
                                    <span className={`status-pill ${item.status}`}>{item.status.replace("-", " ")}</span>
                                </div>
                                <h4>{item.title}</h4>
                                <p>{item.description}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
        </div>
    );
};

export default PublicSuggestions;