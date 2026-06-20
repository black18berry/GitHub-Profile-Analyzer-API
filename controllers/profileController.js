const axios = require("axios");
const pool = require("../config/db");

// Helper function: calculate GitHub repository insights
const calculateInsights = (repos) => {
  const totalStars = repos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0
  );

  const totalForks = repos.reduce(
    (sum, repo) => sum + repo.forks_count,
    0
  );

  const totalWatchers = repos.reduce(
    (sum, repo) => sum + repo.watchers_count,
    0
  );

  let mostStarredRepo = null;
  let latestUpdatedRepo = null;

  if (repos.length > 0) {
    mostStarredRepo = repos.reduce((bestRepo, currentRepo) => {
      return currentRepo.stargazers_count > bestRepo.stargazers_count
        ? currentRepo
        : bestRepo;
    });

    latestUpdatedRepo = repos.reduce((latestRepo, currentRepo) => {
      return new Date(currentRepo.updated_at) > new Date(latestRepo.updated_at)
        ? currentRepo
        : latestRepo;
    });
  }

  const languageCount = {};

  repos.forEach((repo) => {
    if (repo.language) {
      languageCount[repo.language] =
        (languageCount[repo.language] || 0) + 1;
    }
  });

  let mostUsedLanguage = null;

  if (Object.keys(languageCount).length > 0) {
    mostUsedLanguage = Object.keys(languageCount).reduce((language1, language2) => {
      return languageCount[language1] > languageCount[language2]
        ? language1
        : language2;
    });
  }

  return {
    totalStars,
    totalForks,
    totalWatchers,
    mostUsedLanguage,
    mostStarredRepo: mostStarredRepo ? mostStarredRepo.name : null,
    mostStarredRepoStars: mostStarredRepo
      ? mostStarredRepo.stargazers_count
      : 0,
    latestUpdatedRepo: latestUpdatedRepo ? latestUpdatedRepo.name : null
  };
};

// POST /api/profiles/analyze/:username
const analyzeProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (!username || username.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "GitHub username is required"
      });
    }

    const headers = {};

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch GitHub user profile
    const profileResponse = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers }
    );

    // Fetch up to 100 public repositories
    const reposResponse = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers }
    );

    const profile = profileResponse.data;
    const repos = reposResponse.data;

    const insights = calculateInsights(repos);

    const sql = `
      INSERT INTO github_profiles (
        github_id,
        username,
        name,
        avatar_url,
        profile_url,
        bio,
        location,
        company,
        blog,
        public_repos,
        public_gists,
        followers,
        following,
        total_stars,
        total_forks,
        total_watchers,
        most_used_language,
        most_starred_repo,
        most_starred_repo_stars,
        latest_updated_repo,
        github_created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        avatar_url = VALUES(avatar_url),
        profile_url = VALUES(profile_url),
        bio = VALUES(bio),
        location = VALUES(location),
        company = VALUES(company),
        blog = VALUES(blog),
        public_repos = VALUES(public_repos),
        public_gists = VALUES(public_gists),
        followers = VALUES(followers),
        following = VALUES(following),
        total_stars = VALUES(total_stars),
        total_forks = VALUES(total_forks),
        total_watchers = VALUES(total_watchers),
        most_used_language = VALUES(most_used_language),
        most_starred_repo = VALUES(most_starred_repo),
        most_starred_repo_stars = VALUES(most_starred_repo_stars),
        latest_updated_repo = VALUES(latest_updated_repo),
        github_created_at = VALUES(github_created_at)
    `;

    const values = [
      profile.id,
      profile.login,
      profile.name,
      profile.avatar_url,
      profile.html_url,
      profile.bio,
      profile.location,
      profile.company,
      profile.blog,
      profile.public_repos,
      profile.public_gists,
      profile.followers,
      profile.following,
      insights.totalStars,
      insights.totalForks,
      insights.totalWatchers,
      insights.mostUsedLanguage,
      insights.mostStarredRepo,
      insights.mostStarredRepoStars,
      insights.latestUpdatedRepo,
      new Date(profile.created_at)
    ];

    await pool.execute(sql, values);

    res.status(200).json({
      success: true,
      message: "GitHub profile analyzed and stored successfully",
      data: {
        username: profile.login,
        name: profile.name,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        totalStars: insights.totalStars,
        totalForks: insights.totalForks,
        totalWatchers: insights.totalWatchers,
        mostUsedLanguage: insights.mostUsedLanguage,
        mostStarredRepo: insights.mostStarredRepo,
        latestUpdatedRepo: insights.latestUpdatedRepo
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "GitHub user not found"
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message: "GitHub API rate limit exceeded. Add a GitHub token in .env"
      });
    }

    next(error);
  }
};

// GET /api/profiles?page=1&limit=10&search=octo
const getAllProfiles = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Page must be at least 1 and limit must be between 1 and 100"
      });
    }

    const offset = (page - 1) * limit;

    const searchValue = `%${search}%`;

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM github_profiles
       WHERE username LIKE ? OR name LIKE ?`,
      [searchValue, searchValue]
    );

    const totalProfiles = countResult[0].total;
    const totalPages = Math.ceil(totalProfiles / limit);

    const [profiles] = await pool.execute(
      `SELECT *
       FROM github_profiles
       WHERE username LIKE ? OR name LIKE ?
       ORDER BY analyzed_at DESC
       LIMIT ? OFFSET ?`,
      [searchValue, searchValue, limit, offset]
    );

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalProfiles,
        totalPages
      },
      data: profiles
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/profiles/:username
const getSingleProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const [profiles] = await pool.execute(
      `SELECT * FROM github_profiles WHERE username = ?`,
      [username]
    );

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile analysis not found in database"
      });
    }

    res.status(200).json({
      success: true,
      data: profiles[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/profiles/:username
const deleteProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const [result] = await pool.execute(
      `DELETE FROM github_profiles WHERE username = ?`,
      [username]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getSingleProfile,
  deleteProfile
};