import React from "react";

/**
 * Catches render-time errors so one broken component shows a recoverable
 * message instead of unmounting the entire application.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled UI error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div role="alert" className="app-error-boundary">
        <h1>Something went wrong</h1>
        <p>
          The page could not be displayed. Try again, or reload if the problem
          continues.
        </p>

        {import.meta.env.DEV && this.state.error ? (
          <pre className="app-error-boundary__details">
            {this.state.error.message}
          </pre>
        ) : null}

        <div className="app-error-boundary__actions">
          <button type="button" onClick={this.handleReset}>
            Try again
          </button>
          <button type="button" onClick={() => window.location.assign("/")}>
            Go home
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
