# WooCommerce Customer Loyalty App - Backend API

This directory contains the Node.js backend API for the Customer Loyalty Program. This API acts as secure middleware, connecting to your live WooCommerce MySQL database and providing data to the frontend application.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup for Local Development](#setup-for-local-development)
- [Deployment to Google Cloud Run](#deployment-to-google-cloud-run)
- [Connecting the Frontend](#connecting-the-frontend)

## Features

-   **Secure JWT Authentication:** User login is validated against the `wp_users` table using WordPress's password hashing scheme.
-   **User Data Endpoints:** Fetches user profiles, loyalty points, and recent order history.
-   **Rewards System:** Provides a list of available rewards and allows users to redeem points.
-   **Database Transactions:** Safely handles point deduction during reward redemption to prevent data corruption.
-   **Ready for Deployment:** Includes a `Dockerfile` for easy containerization and deployment on services like Google Cloud Run.

## Technology Stack

-   **Node.js:** JavaScript runtime environment.
-   **Express.js:** Web application framework for Node.js.
-   **MySQL2:** MySQL client for Node.js with promise support.
-   **JSON Web Token (JWT):** For securing API endpoints.
-   **phpass:** For validating WordPress password hashes.
-   **Docker:** For containerizing the application.

## Project Structure

```
.
├── backend/
│   ├── node_modules/
│   ├── apiRoutes.js      # All API endpoint logic
│   ├── authMiddleware.js # JWT verification middleware
│   ├── db.js             # MySQL database connection pool
│   ├── server.js         # Express server setup
│   ├── .env.example      # Environment variable template
│   ├── .gitignore
│   ├── Dockerfile        # Docker configuration for deployment
│   └── package.json      # Project dependencies and scripts
├── components/           # (Frontend)
├── hooks/                # (Frontend)
├── services/             # (Frontend)
├── App.tsx               # (Frontend)
├── index.html            # (Frontend)
├── ... (other frontend files)
└── README.md             # This file
```

## Setup for Local Development

Follow these steps to run the API on your local machine for testing.

### 1. Navigate to the Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create an Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Now, open the newly created `.env` file in your text editor and fill in the details for your WooCommerce database.

-   `DB_HOST`: The IP address or hostname of your MySQL server.
-   `DB_USER`: The database username.
-   `DB_PASSWORD`: The database password.
-   `DB_NAME`: The name of your WooCommerce database.
-   `JWT_SECRET`: **IMPORTANT!** Change this to a long, random, and secret string. You can use an online generator to create a strong key.

### 4. Run the Server

You can start the server in two ways:

-   **Standard mode:** `npm start`
-   **Development mode:** `npm run dev` (This uses `nodemon` to automatically restart the server when you change a file).

The API should now be running at `http://localhost:8080`.

## Deployment to Google Cloud Run

This guide explains how to deploy the API as a stateless container on Google Cloud Run.

### Prerequisites

1.  A Google Cloud Platform (GCP) project.
2.  The `gcloud` command-line tool installed and configured. ([Install Guide](https://cloud.google.com/sdk/docs/install))
3.  Billing enabled on your GCP project.
4.  Docker installed on your local machine.

### Step 1: Secure Your Database Credentials in Secret Manager

Never put your database password or JWT secret directly into the Cloud Run environment variables. Use Secret Manager.

1.  Go to the Secret Manager page in the Google Cloud Console.
2.  Create secrets for `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET`.
3.  For each secret, give it a name (e.g., `loyalty-db-password`) and enter the secret value.
4.  **Grant Access:** Go to the Cloud Run service's settings page, under the "Security" tab, find the Service Account, and ensure it has the **Secret Manager Secret Accessor** IAM role.

### Step 2: Build and Push the Docker Image

From the `backend` directory, run the following command. Replace `[PROJECT_ID]` with your actual Google Cloud Project ID.

```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/loyalty-api
```

This command uses Cloud Build to create a Docker image based on your `Dockerfile` and pushes it to the Google Container Registry (gcr.io).

### Step 3: Deploy to Cloud Run

Run the following command to deploy your container. Replace `[PROJECT_ID]` and `[REGION]` (e.g., `us-central1`).

```bash
gcloud run deploy loyalty-api \
  --image gcr.io/[PROJECT_ID]/loyalty-api \
  --platform managed \
  --region [REGION] \
  --allow-unauthenticated \
  --set-env-vars="DB_HOST=[YOUR_DB_HOST],DB_NAME=[YOUR_DB_NAME]" \
  --add-cloudsql-instances [YOUR_CLOUDSQL_CONNECTION_NAME] # Optional: if using Cloud SQL
```

-   `--allow-unauthenticated`: This makes your API public. Since you have JWT authentication on protected routes, this is generally fine. For higher security, you could configure authentication via Cloud Identity.
-   `--set-env-vars`: Use this for non-secret variables like the database host and name.
-   `--add-cloudsql-instances`: If your MySQL database is a Google Cloud SQL instance, add this flag with your instance connection name to enable a secure, direct connection.

### Step 4: Link Your Secrets

1.  Go to your new `loyalty-api` service in the Cloud Run section of the Google Cloud Console.
2.  Click "Edit & Deploy New Revision".
3.  Go to the "Variables & Secrets" tab.
4.  Under "Secrets", click "Reference a secret".
5.  For the "Environment variable" name, enter `DB_PASSWORD`.
6.  For the "Secret", select the `loyalty-db-password` secret you created. Choose "latest" for the version.
7.  Repeat this process to link `DB_USER` and `JWT_SECRET` to their respective secrets.
8.  Click "Deploy".

Your API is now live! Cloud Run will give you a URL for your service.

## Connecting the Frontend

Once your API is deployed and you have the URL, you need to update the frontend code to use it.

1.  **Open the file:** `services/api.ts`
2.  **Find the mock functions:** Locate `login`, `getUserProfile`, etc.
3.  **Replace them:** You will need to replace the mock logic inside these functions with `fetch` calls to your new API endpoints.

For example, the `login` function would change from this:

```typescript
// MOCK VERSION
export const login = async (email: string, password: string): Promise<{ token: string }> => {
  await delay(500);
  if (email.toLowerCase() === 'test@example.com' && password === 'password') {
    return { token: 'fake-jwt-token-for-demo' };
  }
  throw new Error('Invalid credentials');
};
```

To this (replace `https://your-api-url.run.app` with your actual URL):

```typescript
// REAL API VERSION
const API_BASE_URL = 'https://your-api-url.run.app/api';

export const login = async (email: string, password: string): Promise<{ token: string }> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
  return response.json();
};
```

You will need to do this for all the functions in `services/api.ts`, making sure to include the `Authorization: Bearer ${token}` header for the protected endpoints.
