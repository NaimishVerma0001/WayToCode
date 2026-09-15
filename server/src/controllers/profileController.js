// server/src/controllers/profileController.js

const profileService = require("../services/profileService");
const catchAsync = require("../utils/catchAsync");

const getProfile = catchAsync(async (req, res) => {
    const userId = req.user?._id || req.userId;
    const profile = await profileService.getProfile(userId);

    return res.status(200).json({
        success: true,
        data: profile
    });
});

const updateProfile = catchAsync(async (req, res) => {
    const userId = req.user?._id || req.userId;
    const profile = await profileService.updateProfile(userId, req.body);

    return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: profile
    });
});

const updateCodingProfiles = catchAsync(async (req, res) => {
    const userId = req.user?._id || req.userId;
    const profile = await profileService.updateCodingProfiles(userId, req.body);

    return res.status(200).json({
        success: true,
        message: "Coding profiles updated successfully.",
        data: profile
    });
});

module.exports = {
    getProfile,
    updateProfile,
    updateCodingProfiles
};