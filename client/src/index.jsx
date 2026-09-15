import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";
import Home from "./pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteFallback from "./components/RouteFallback";
import { SocketProvider } from "./context/SocketContext";

/*
|--------------------------------------------------------------------------
| Code Splitting
|--------------------------------------------------------------------------
| Only the landing page ships in the initial bundle. Everything else loads on
| navigation, which keeps first paint fast instead of shipping every admin,
| chart and planner dependency to a first-time visitor.
*/
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Aim = lazy(() => import("./pages/Aim"));
const ContestSpace = lazy(() => import("./pages/ContestSpace"));
const ExploreMore = lazy(() => import("./pages/ExploreMore"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PublicSuggestions = lazy(() => import("./components/PublicSuggestions"));
const DailySprintTracker = lazy(() =>
  import("./components/DailySprintTracker").then((module) => ({
    default: module.DailySprintTracker ?? module.default
  }))
);

const withSuspense = (element) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    // A thrown loader/render error renders this instead of the router default.
    errorElement: <RouteFallback error />,
    children: [
      { index: true, element: <Home /> },
      { path: "register", element: withSuspense(<Register />) },
      { path: "login", element: withSuspense(<Register />) },
      { path: "profile", element: withSuspense(<Dashboard />) },
      { path: "aim", element: withSuspense(<Aim />) },
      { path: "contest", element: withSuspense(<ContestSpace />) },
      { path: "explore", element: withSuspense(<ExploreMore />) },
      { path: "forgot-password", element: withSuspense(<ForgotPassword />) },
      { path: "reset-password", element: withSuspense(<ResetPassword />) },
      { path: "admin", element: withSuspense(<AdminPanel />) },
      { path: "planner", element: withSuspense(<DailySprintTracker />) },
      { path: "suggestions", element: withSuspense(<PublicSuggestions />) },
      { path: "*", element: <RouteFallback notFound /> }
    ]
  }
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // An authentication failure is terminal; retrying it only delays the
      // redirect to the sign-in screen.
      retry: (failureCount, error) =>
        error?.status === 401 || error?.status === 403 ? false : failureCount < 1,
      staleTime: 60 * 1000
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <RouterProvider router={router} />
        </SocketProvider>
      </QueryClientProvider>

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
        limit={3}
      />
    </ErrorBoundary>
  </React.StrictMode>
);
