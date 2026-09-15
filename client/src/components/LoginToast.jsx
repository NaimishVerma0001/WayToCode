import "../styles/LoginToast.css";

function LoginToast({ onLogin }) {
  return (
    <div className="login-toast">

      <div className="login-toast-icon">
        🔒
      </div>

      <div className="login-toast-content">

        <h3>Login Required</h3>

        <p>
          Sign in to access your coding dashboard,
          contests, analytics and profile.
        </p>

      </div>

      <button
        className="login-toast-btn"
        onClick={onLogin}
      >
        Login Now
      </button>

    </div>
  );
}

export default LoginToast;