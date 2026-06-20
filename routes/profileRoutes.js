const express = require("express");

const {
  analyzeProfile,
  getAllProfiles,
  getSingleProfile,
  deleteProfile
} = require("../controllers/profileController");

const router = express.Router();

router.post("/analyze/:username", analyzeProfile);
router.get("/", getAllProfiles);
router.get("/:username", getSingleProfile);
router.delete("/:username", deleteProfile);

module.exports = router;