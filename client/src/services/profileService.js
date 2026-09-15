import { apiRequest } from "./apiClient";

/*
|--------------------------------------------------------------------------
| Get Profile API
|--------------------------------------------------------------------------
*/
export const getProfile = async ({ signal } = {}) => {
    const response = await apiRequest("/profile", {
        authenticated: true,
        signal
    });

    return response.data || response;
};

/*
|--------------------------------------------------------------------------
| Update Profile API
|--------------------------------------------------------------------------
*/
export const updateProfile = async (profileData, { signal } = {}) => {
    const response = await apiRequest("/profile", {
        method: "PUT",
        authenticated: true,
        body: profileData,
        signal
    });

    return response.data || response;
};

/*
|--------------------------------------------------------------------------
| Update Coding Profiles API
|--------------------------------------------------------------------------
*/
export const updateCodingProfiles = async (codingProfiles, { signal } = {}) => {
    const response = await apiRequest("/profile/coding-profiles", {
        method: "PUT",
        authenticated: true,
        body: codingProfiles,
        signal
    });

    return response.data || response;
};

/*
|--------------------------------------------------------------------------
| Dashboard API Stub / Extension point if needed locally
|--------------------------------------------------------------------------
*/