"use strict";

/**
 * @route   GET /api/health
 * @desc    Returns backend health status
 * @access  Public
 */
const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: "MediTrack Backend Running",
    version: "1.0.0",
  });
};

module.exports = { getHealth };
