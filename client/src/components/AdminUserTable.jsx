import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  FaBan,
  FaChevronLeft,
  FaChevronRight,
  FaExternalLinkAlt,
  FaFilter,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaUndo,
  FaUser,
  FaUserCheck,
  FaUsers
} from "react-icons/fa";

import { toast } from
  "react-toastify";

import {
  blockAdminUser,
  getAdminUserById,
  getAdminUsers,
  unblockAdminUser
} from "../services";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const PAGE_SIZE = 25;
const SEARCH_DELAY = 400;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getUserId = (
  user
) => {
  return (
    user?._id ||
    user?.id ||
    ""
  );
};

const formatDate = (
  value,
  includeTime = false
) => {
  if (!value) {
    return "Never";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    includeTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
  ).format(date);
};

const formatRelativeActivity = (
  value
) => {
  if (!value) {
    return "Never active";
  }

  const activityTime =
    new Date(value).getTime();

  if (
    Number.isNaN(activityTime)
  ) {
    return "Unknown";
  }

  const difference =
    Date.now() - activityTime;

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return `${days}d ago`;
};

const getInitials = (
  username
) => {
  return String(
    username || "U"
  )
    .slice(0, 2)
    .toUpperCase();
};

/*
|--------------------------------------------------------------------------
| User Management
|--------------------------------------------------------------------------
*/

function AdminUserTable({
  currentAdministrator,
  onOverviewChanged
}) {
  const [users, setUsers] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      totalPages: 1,
      totalUsers: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
  ] = useState("");

  const [status, setStatus] =
    useState("all");

  const [role, setRole] =
    useState("all");

  const [activity, setActivity] =
    useState("all");

  const [sort, setSort] =
    useState("newest");

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedUser,
    setSelectedUser
  ] = useState(null);

  const [
    isLoadingDetails,
    setIsLoadingDetails
  ] = useState(false);

  const [
    accountAction,
    setAccountAction
  ] = useState(null);

  const [
    actionReason,
    setActionReason
  ] = useState("");

  const [
    isSubmittingAction,
    setIsSubmittingAction
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Debounced Search
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim()
          );

          setPage(1);
        },
        SEARCH_DELAY
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [search]);

  /*
  |--------------------------------------------------------------------------
  | Load Users
  |--------------------------------------------------------------------------
  */

  const loadUsers =
    useCallback(
      async ({
        signal,
        silent = false
      } = {}) => {
        if (!silent) {
          setIsLoading(true);
        }

        setError("");

        try {
          const result =
            await getAdminUsers({
              page,
              limit: PAGE_SIZE,
              search:
                debouncedSearch,
              status,
              role,
              activity,
              sort,
              signal
            });

          setUsers(
            Array.isArray(
              result.users
            )
              ? result.users
              : []
          );

          setPagination(
            result.pagination || {
              page,
              totalPages: 1,
              totalUsers: 0
            }
          );
        } catch (requestError) {
          if (
            requestError.name ===
            "AbortError"
          ) {
            return;
          }

          setError(
            requestError.message ||
            "Users could not be loaded."
          );
        } finally {
          if (!signal?.aborted) {
            setIsLoading(false);
          }
        }
      },
      [
        activity,
        debouncedSearch,
        page,
        role,
        sort,
        status
      ]
    );

  useEffect(() => {
    const controller =
      new AbortController();

    loadUsers({
      signal: controller.signal
    });

    return () => {
      controller.abort();
    };
  }, [loadUsers]);

  /*
  |--------------------------------------------------------------------------
  | Filter Reset
  |--------------------------------------------------------------------------
  */

  const hasActiveFilters =
    Boolean(
      search ||
      status !== "all" ||
      role !== "all" ||
      activity !== "all" ||
      sort !== "newest"
    );

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setRole("all");
    setActivity("all");
    setSort("newest");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | User Details
  |--------------------------------------------------------------------------
  */

  const openUserDetails =
    async (user) => {
      const userId =
        getUserId(user);

      if (!userId) {
        return;
      }

      setSelectedUser(user);
      setIsLoadingDetails(true);

      try {
        const details =
          await getAdminUserById(
            userId
          );

        setSelectedUser(details);
      } catch (requestError) {
        toast.error(
          requestError.message ||
          "User details could not be loaded.",
          {
            position: "top-center",
            autoClose: 3200,
            toastId:
              "admin-user-details-error"
          }
        );
      } finally {
        setIsLoadingDetails(false);
      }
    };

  const closeUserDetails = () => {
    if (isSubmittingAction) {
      return;
    }

    setSelectedUser(null);
  };

  /*
  |--------------------------------------------------------------------------
  | Account Action
  |--------------------------------------------------------------------------
  */

  const beginAccountAction = (
    user,
    type
  ) => {
    setAccountAction({
      type,
      user
    });

    setActionReason("");
  };

  const closeAccountAction = () => {
    if (isSubmittingAction) {
      return;
    }

    setAccountAction(null);
    setActionReason("");
  };

  const submitAccountAction =
    async () => {
      if (!accountAction) {
        return;
      }

      const targetUser =
        accountAction.user;

      const userId =
        getUserId(targetUser);

      if (!userId) {
        return;
      }

      const normalizedReason =
        actionReason.trim();

      if (
        accountAction.type ===
          "block" &&
        normalizedReason.length < 5
      ) {
        toast.error(
          "Provide a blocking reason of at least 5 characters.",
          {
            position: "top-center",
            autoClose: 3000,
            toastId:
              "admin-block-reason"
          }
        );

        return;
      }

      setIsSubmittingAction(true);

      try {
        const updatedUser =
          accountAction.type ===
            "block"
            ? await blockAdminUser(
                userId,
                normalizedReason
              )
            : await unblockAdminUser(
                userId,
                normalizedReason
              );

        const updatedUserId =
          getUserId(updatedUser);

        setUsers(
          (currentUsers) =>
            currentUsers.map(
              (user) =>
                getUserId(user) ===
                updatedUserId
                  ? {
                      ...user,
                      ...updatedUser,

                      isActive:
                        updatedUser
                          .accountStatus !==
                        "blocked" &&
                        user.isActive
                    }
                  : user
            )
        );

        if (
          getUserId(
            selectedUser
          ) === updatedUserId
        ) {
          setSelectedUser(
            (currentUser) => ({
              ...currentUser,
              ...updatedUser
            })
          );
        }

        toast.success(
          accountAction.type ===
            "block"
            ? "User blocked successfully."
            : "User unblocked successfully.",
          {
            position: "top-center",
            autoClose: 2600,
            toastId:
              `admin-${accountAction.type}-${userId}`
          }
        );

        setAccountAction(null);
        setActionReason("");

        await loadUsers({
          silent: true
        });

        onOverviewChanged?.();
      } catch (requestError) {
        toast.error(
          requestError.message ||
          "The account action could not be completed.",
          {
            position: "top-center",
            autoClose: 3500,
            toastId:
              "admin-account-action-error"
          }
        );
      } finally {
        setIsSubmittingAction(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Current Administrator
  |--------------------------------------------------------------------------
  */

  const administratorId =
    getUserId(
      currentAdministrator
    );

  /*
  |--------------------------------------------------------------------------
  | Connected Platform Links
  |--------------------------------------------------------------------------
  */

  const profileLinks =
    useMemo(
      () => {
        const profiles =
          selectedUser
            ?.codingProfiles ||
          {};

        const links = {
          leetcode:
            "https://leetcode.com/u/",

          codeforces:
            "https://codeforces.com/profile/",

          codechef:
            "https://www.codechef.com/users/",

          geeksforgeeks:
            "https://www.geeksforgeeks.org/profile/",

          hackerrank:
            "https://www.hackerrank.com/profile/",

          atcoder:
            "https://atcoder.jp/users/",

          github:
            "https://github.com/"
        };

        return Object.entries(
          profiles
        )
          .filter(
            ([, username]) =>
              typeof username ===
                "string" &&
              username.trim()
          )
          .map(
            ([
              platform,
              username
            ]) => ({
              platform,
              username:
                username.trim(),

              url:
                `${
                  links[platform] ||
                  ""
                }${encodeURIComponent(
                  username.trim()
                )}`
            })
          );
      },
      [selectedUser]
    );

  return (
    <section className=
      "admin-users-section"
    >
      <header className=
        "admin-section-heading"
      >
        <div>
          <span className=
            "admin-card-eyebrow"
          >
            <FaUsers />
            Account directory
          </span>

          <h2>
            User management
          </h2>

          <p>
            Search, inspect and control
            registered Way2Code
            accounts.
          </p>
        </div>

        <div className=
          "admin-user-count"
        >
          <span>
            Matching users
          </span>

          <strong>
            {new Intl.NumberFormat(
              "en-US"
            ).format(
              pagination.totalUsers ||
              0
            )}
          </strong>
        </div>
      </header>

      <div className=
        "admin-user-toolbar"
      >
        <label className=
          "admin-user-search"
        >
          <FaSearch />

          <input
            type="search"
            value={search}
            placeholder=
              "Search username or email"
            aria-label=
              "Search users"
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              aria-label=
                "Clear user search"
              onClick={() =>
                setSearch("")
              }
            >
              <FaTimes />
            </button>
          )}
        </label>

        <div className=
          "admin-user-filters"
        >
          <span>
            <FaFilter />
            Filters
          </span>

          <select
            value={status}
            aria-label=
              "Filter by account status"
            onChange={(event) => {
              setStatus(
                event.target.value
              );
              setPage(1);
            }}
          >
            <option value="all">
              All statuses
            </option>

            <option value="active">
              Active accounts
            </option>

            <option value="blocked">
              Blocked accounts
            </option>
          </select>

          <select
            value={activity}
            aria-label=
              "Filter by user activity"
            onChange={(event) => {
              setActivity(
                event.target.value
              );
              setPage(1);
            }}
          >
            <option value="all">
              Any activity
            </option>

            <option value="online">
              Active now
            </option>

            <option value="offline">
              Offline
            </option>
          </select>

          <select
            value={role}
            aria-label=
              "Filter by user role"
            onChange={(event) => {
              setRole(
                event.target.value
              );
              setPage(1);
            }}
          >
            <option value="all">
              All roles
            </option>

            <option value="user">
              Users
            </option>

            <option value="admin">
              Administrators
            </option>
          </select>

          <select
            value={sort}
            aria-label=
              "Sort users"
            onChange={(event) => {
              setSort(
                event.target.value
              );
              setPage(1);
            }}
          >
            <option value="newest">
              Newest first
            </option>

            <option value="oldest">
              Oldest first
            </option>

            <option value=
              "recentlyActive"
            >
              Recently active
            </option>

            <option value="username">
              Username
            </option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className=
                "admin-reset-filters"
              onClick={
                resetFilters
              }
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className=
        "admin-user-table-card"
      >
        {isLoading ? (
          <div className=
            "admin-table-loading"
          >
            <span />

            <h3>
              Loading users
            </h3>

            <p>
              Retrieving the account
              directory securely...
            </p>
          </div>
        ) : error ? (
          <div
            className=
              "admin-table-state admin-table-error"
            role="alert"
          >
            <FaShieldAlt />

            <h3>
              Users unavailable
            </h3>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                loadUsers()
              }
            >
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className=
            "admin-table-state"
          >
            <FaUser />

            <h3>
              No users found
            </h3>

            <p>
              Adjust the search or
              account filters.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className=
            "admin-table-scroll"
          >
            <table className=
              "admin-user-table"
            >
              <thead>
                <tr>
                  <th scope="col">
                    User
                  </th>

                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Role
                  </th>

                  <th scope="col">
                    Platforms
                  </th>

                  <th scope="col">
                    Last activity
                  </th>

                  <th scope="col">
                    Joined
                  </th>

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  (user) => {
                    const userId =
                      getUserId(
                        user
                      );

                    const blocked =
                      user
                        .accountStatus ===
                      "blocked";

                    const isSelf =
                      userId ===
                      administratorId;

                    const protectedAdmin =
                      user.role ===
                      "admin";

                    return (
                      <tr key={userId}>
                        <td>
                          <button
                            type="button"
                            className=
                              "admin-user-identity"
                            onClick={() =>
                              openUserDetails(
                                user
                              )
                            }
                          >
                            <span>
                              {
                                getInitials(
                                  user.username
                                )
                              }

                              {user.isActive && (
                                <i />
                              )}
                            </span>

                            <div>
                              <strong>
                                {
                                  user.username
                                }
                              </strong>

                              <small>
                                {
                                  user.email
                                }
                              </small>
                            </div>
                          </button>
                        </td>

                        <td>
                          <span
                            className={
                              blocked
                                ? (
                                  "admin-status-badge blocked"
                                )
                                : (
                                  "admin-status-badge active"
                                )
                            }
                          >
                            {blocked
                              ? "Blocked"
                              : "Active"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              user.role ===
                              "admin"
                                ? (
                                  "admin-role-badge administrator"
                                )
                                : (
                                  "admin-role-badge"
                                )
                            }
                          >
                            {user.role ===
                            "admin"
                              ? (
                                <>
                                  <FaShieldAlt />
                                  Admin
                                </>
                              )
                              : "User"}
                          </span>
                        </td>

                        <td>
                          <strong className=
                            "admin-platform-count"
                          >
                            {
                              user
                                .connectedPlatformCount ||
                              0
                            }
                          </strong>
                        </td>

                        <td>
                          <div className=
                            "admin-activity-cell"
                          >
                            <span
                              className={
                                user.isActive
                                  ? "online"
                                  : ""
                              }
                            />

                            <div>
                              <strong>
                                {user.isActive
                                  ? "Active now"
                                  : (
                                    formatRelativeActivity(
                                      user.lastSeenAt
                                    )
                                  )}
                              </strong>

                              <small>
                                {
                                  formatDate(
                                    user.lastSeenAt,
                                    true
                                  )
                                }
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className=
                            "admin-date-cell"
                          >
                            {
                              formatDate(
                                user.createdAt
                              )
                            }
                          </span>
                        </td>

                        <td>
                          <div className=
                            "admin-row-actions"
                          >
                            <button
                              type="button"
                              className=
                                "admin-view-user"
                              onClick={() =>
                                openUserDetails(
                                  user
                                )
                              }
                            >
                              View
                            </button>

                            {!isSelf &&
                              !protectedAdmin &&
                              (
                                <button
                                  type="button"
                                  className={
                                    blocked
                                      ? (
                                        "admin-unblock-user"
                                      )
                                      : (
                                        "admin-block-user"
                                      )
                                  }
                                  onClick={() =>
                                    beginAccountAction(
                                      user,
                                      blocked
                                        ? "unblock"
                                        : "block"
                                    )
                                  }
                                >
                                  {blocked
                                    ? <FaUndo />
                                    : <FaBan />
                                  }

                                  {blocked
                                    ? "Unblock"
                                    : "Block"}
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading &&
          !error &&
          users.length > 0 && (
          <footer className=
            "admin-table-pagination"
          >
            <p>
              Page{" "}
              <strong>
                {pagination.page}
              </strong>{" "}
              of{" "}
              <strong>
                {
                  pagination.totalPages
                }
              </strong>
            </p>

            <div>
              <button
                type="button"
                disabled={
                  !pagination
                    .hasPreviousPage
                }
                onClick={() =>
                  setPage(
                    (currentPage) =>
                      Math.max(
                        1,
                        currentPage - 1
                      )
                  )
                }
              >
                <FaChevronLeft />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  !pagination
                    .hasNextPage
                }
                onClick={() =>
                  setPage(
                    (currentPage) =>
                      currentPage + 1
                  )
                }
              >
                Next
                <FaChevronRight />
              </button>
            </div>
          </footer>
        )}
      </div>

      {selectedUser && (
        <div
          className=
            "admin-drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            // Only a click on the backdrop itself dismisses the drawer; a
            // click that started inside the dialog must not close it.
            if (event.target === event.currentTarget) {
              closeUserDetails();
            }
          }}
        >
          <aside
            className=
              "admin-user-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "admin-user-drawer-title"
          >
            <header>
              <div>
                <span>
                  User intelligence
                </span>

                <h2 id=
                  "admin-user-drawer-title"
                >
                  Account details
                </h2>
              </div>

              <button
                type="button"
                aria-label=
                  "Close user details"
                onClick={
                  closeUserDetails
                }
              >
                <FaTimes />
              </button>
            </header>

            {isLoadingDetails ? (
              <div className=
                "admin-drawer-loading"
              >
                <span />
                Loading account...
              </div>
            ) : (
              <>
                <section className=
                  "admin-drawer-profile"
                >
                  <span>
                    {
                      getInitials(
                        selectedUser
                          .username
                      )
                    }

                    {selectedUser
                      .isActive && (
                      <i />
                    )}
                  </span>

                  <div>
                    <h3>
                      {
                        selectedUser
                          .username
                      }
                    </h3>

                    <p>
                      {
                        selectedUser
                          .email
                      }
                    </p>

                    <div>
                      <b
                        className={
                          selectedUser
                            .accountStatus ===
                          "blocked"
                            ? "blocked"
                            : "active"
                        }
                      >
                        {
                          selectedUser
                            .accountStatus ||
                          "active"
                        }
                      </b>

                      <b>
                        {
                          selectedUser
                            .role ||
                          "user"
                        }
                      </b>
                    </div>
                  </div>
                </section>

                <section className=
                  "admin-drawer-metrics"
                >
                  <article>
                    <span>
                      Login count
                    </span>

                    <strong>
                      {
                        new Intl
                          .NumberFormat(
                            "en-US"
                          )
                          .format(
                            selectedUser
                              .loginCount ||
                            0
                          )
                      }
                    </strong>
                  </article>

                  <article>
                    <span>
                      Platforms
                    </span>

                    <strong>
                      {
                        selectedUser
                          .connectedPlatformCount ||
                        profileLinks.length
                      }
                    </strong>
                  </article>

                  <article>
                    <span>
                      Last active
                    </span>

                    <strong>
                      {
                        formatRelativeActivity(
                          selectedUser
                            .lastSeenAt
                        )
                      }
                    </strong>
                  </article>
                </section>

                <section className=
                  "admin-drawer-section"
                >
                  <h3>
                    Account timeline
                  </h3>

                  <dl>
                    <div>
                      <dt>
                        Registered
                      </dt>

                      <dd>
                        {
                          formatDate(
                            selectedUser
                              .createdAt,
                            true
                          )
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Last login
                      </dt>

                      <dd>
                        {
                          formatDate(
                            selectedUser
                              .lastLoginAt,
                            true
                          )
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Last activity
                      </dt>

                      <dd>
                        {
                          formatDate(
                            selectedUser
                              .lastSeenAt,
                            true
                          )
                        }
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className=
                  "admin-drawer-section"
                >
                  <h3>
                    Connected profiles
                  </h3>

                  {profileLinks.length >
                  0 ? (
                    <div className=
                      "admin-profile-links"
                    >
                      {profileLinks.map(
                        (profile) => (
                          <a
                            key={
                              profile.platform
                            }
                            href={
                              profile.url
                            }
                            target="_blank"
                            rel=
                              "noopener noreferrer"
                          >
                            <span>
                              {
                                profile
                                  .platform
                              }
                            </span>

                            <strong>
                              @
                              {
                                profile
                                  .username
                              }
                            </strong>

                            <FaExternalLinkAlt />
                          </a>
                        )
                      )}
                    </div>
                  ) : (
                    <p className=
                      "admin-no-profile"
                    >
                      No coding profiles
                      connected.
                    </p>
                  )}
                </section>

                {selectedUser
                  .accountStatus ===
                  "blocked" && (
                  <section className=
                    "admin-block-information"
                  >
                    <FaBan />

                    <div>
                      <strong>
                        Account blocked
                      </strong>

                      <p>
                        {
                          selectedUser
                            .blockedReason ||
                          "No reason provided."
                        }
                      </p>

                      <small>
                        {
                          formatDate(
                            selectedUser
                              .blockedAt,
                            true
                          )
                        }
                      </small>
                    </div>
                  </section>
                )}

                {selectedUser.role !==
                  "admin" && (
                  <footer className=
                    "admin-drawer-actions"
                  >
                    <button
                      type="button"
                      className={
                        selectedUser
                          .accountStatus ===
                        "blocked"
                          ? "unblock"
                          : "block"
                      }
                      onClick={() =>
                        beginAccountAction(
                          selectedUser,
                          selectedUser
                            .accountStatus ===
                          "blocked"
                            ? "unblock"
                            : "block"
                        )
                      }
                    >
                      {
                        selectedUser
                          .accountStatus ===
                        "blocked"
                          ? <FaUserCheck />
                          : <FaBan />
                      }

                      {
                        selectedUser
                          .accountStatus ===
                        "blocked"
                          ? "Unblock account"
                          : "Block account"
                      }
                    </button>
                  </footer>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      {accountAction && (
        <div
          className=
            "admin-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            // Only a click on the backdrop itself dismisses the dialog.
            if (event.target === event.currentTarget) {
              closeAccountAction();
            }
          }}
        >
          <section
            className={
              `admin-action-dialog ` +
              `admin-action-${
                accountAction.type
              }`
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby=
              "admin-action-title"
          >
            <span className=
              "admin-action-icon"
            >
              {accountAction.type ===
              "block"
                ? <FaBan />
                : <FaUserCheck />
              }
            </span>

            <h2 id=
              "admin-action-title"
            >
              {accountAction.type ===
              "block"
                ? "Block this user?"
                : "Restore this account?"
              }
            </h2>

            <p>
              {accountAction.type ===
              "block"
                ? (
                  `${accountAction.user
                    .username} will immediately ` +
                  "lose access to protected Way2Code features."
                )
                : (
                  `${accountAction.user
                    .username} will regain access ` +
                  "to protected Way2Code features."
                )
              }
            </p>

            <label>
              <span>
                {accountAction.type ===
                "block"
                  ? "Reason for blocking"
                  : "Administrative note (optional)"
                }
              </span>

              <textarea
                rows="4"
                maxLength="300"
                value={
                  actionReason
                }
                placeholder={
                  accountAction.type ===
                  "block"
                    ? (
                      "Explain why this account is being blocked..."
                    )
                    : (
                      "Add a note about restoring this account..."
                    )
                }
                onChange={(event) =>
                  setActionReason(
                    event.target.value
                  )
                }
                disabled={
                  isSubmittingAction
                }
              />

              <small>
                {actionReason.length}/300
              </small>
            </label>

            <div className=
              "admin-action-dialog-buttons"
            >
              <button
                type="button"
                onClick={
                  closeAccountAction
                }
                disabled={
                  isSubmittingAction
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm"
                onClick={
                  submitAccountAction
                }
                disabled={
                  isSubmittingAction
                }
              >
                {isSubmittingAction
                  ? "Processing..."
                  : (
                    accountAction.type ===
                    "block"
                      ? "Block user"
                      : "Unblock user"
                  )
                }
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default AdminUserTable;