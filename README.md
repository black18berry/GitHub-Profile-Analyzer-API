# GitHub Profile Analyzer API

A backend REST API that fetches public GitHub user data, analyzes repository insights, and stores the results in a MySQL database.

## Features

* Fetch public GitHub profile data using a username
* Fetch public repository data from GitHub API
* Calculate useful insights:

  * Public repository count
  * Followers and following count
  * Total stars
  * Total forks
  * Most-used programming language
  * Most-starred repository
  * Most recently updated repository
* Store analysis results in MySQL
* Update existing profile records instead of creating duplicates
* Fetch all analyzed profiles
* Search profiles by username or name
* Pagination support
* Fetch one stored profile
* Delete a stored profile
* Health-check endpoint
* Centralized error handling

## Tech Stack

* Node.js
* Express.js
* MySQL
* Axios
* GitHub Public API
* dotenv
* CORS

## Project Structure

```text
github-profile-analyzer-api/
│
├── config/
│   └── db.js
├── controllers/
│   └── profileController.js
├── middleware/
│   └── errorHandler.js
├── routes/
│   └── profileRoutes.js
├── sql/
│   └── database.sql
├── .env
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/github-profile-analyzer-api.git
cd github-profile-analyzer-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the MySQL database

Open phpMyAdmin or MySQL Workbench and import:

```text
sql/database.sql
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=github_profile_analyzer
GITHUB_TOKEN=
```

`GITHUB_TOKEN` is optional but recommended to avoid GitHub API rate limits.

### 5. Start the server

```bash
npm run dev
```

Or:

```bash
npm start
```

The API runs at:

```text
http://localhost:5000
```

## API Endpoints

| Method | Endpoint                                | Description                                                      |
| ------ | --------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/`                                     | API welcome message                                              |
| GET    | `/api/health`                           | Checks API health                                                |
| POST   | `/api/profiles/analyze/:username`       | Fetches GitHub data, analyzes it, and stores/updates it in MySQL |
| GET    | `/api/profiles?page=1&limit=10&search=` | Fetches all stored profiles with pagination and search           |
| GET    | `/api/profiles/:username`               | Fetches one stored profile                                       |
| DELETE | `/api/profiles/:username`               | Deletes a stored profile                                         |

## Example Requests

### Analyze a GitHub profile

```http
POST /api/profiles/analyze/octocat
```

### Get all profiles

```http
GET /api/profiles?page=1&limit=10
```

### Search profiles

```http
GET /api/profiles?search=octo
```

### Get one profile

```http
GET /api/profiles/octocat
```

### Delete a profile

```http
DELETE /api/profiles/octocat
```

## Example Response

```json
{
  "success": true,
  "message": "GitHub profile analyzed and stored successfully",
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "publicRepos": 8,
    "followers": 23037,
    "following": 9,
    "totalStars": 21592,
    "totalForks": 164920,
    "mostUsedLanguage": "Ruby",
    "mostStarredRepo": "Spoon-Knife",
    "latestUpdatedRepo": "Hello-World"
  }
}
```

## Database

The database schema is available in:

```text
sql/database.sql
```

## Author

Girija Nagarajan
