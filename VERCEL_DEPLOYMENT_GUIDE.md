# FreelanceHub – Vercel Deployment & Production Setup Guide

This guide walks you through deploying the complete **FreelanceHub** marketplace (AngularJS Frontend + Node.js/Express Serverless Backend + MongoDB Atlas Database) under **ONE unified public URL** on **Vercel** (`https://<your-project>.vercel.app`).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          VERCEL EDGE NETWORK           │
                      │  https://your-freelancehub.vercel.app  │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     Static Assets & SPA Routing                    Serverless Express Function
     (/, /css/*, /js/*, /assets/*, etc.)             (/api/*)
     Loaded directly by Vercel CDN                  api/index.js -> backend/server.js
                 │                                               │
                 ▼                                               ▼
       AngularJS 1.8.2 SPA                            MongoDB Atlas Cluster
       Bootstrap 5, jQuery                            (Mongoose with Connection Pool)
```

* **Frontend**: AngularJS 1.8.2 SPA served via Vercel's global CDN.
* **Backend**: Express.js REST API executed as a Vercel Serverless Function (`api/index.js`).
* **Database**: MongoDB Atlas cloud cluster with cached connection pooling.
* **Payments**: Razorpay test/live checkout with secret credentials guarded on the server.
* **Uploads**: Serverless-compatible in-memory storage with Base64 Data URL persistence directly in MongoDB Atlas (eliminating ephemeral local disk data-loss).

---

## 1. Prerequisites

1. A free **[Vercel Account](https://vercel.com/signup)**.
2. A free **[MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas/register)** with a cluster created.
3. (Optional) A **[Razorpay Account](https://razorpay.com/)** in test mode to obtain API keys.
4. Git installed locally, or a GitHub/GitLab repository with your FreelanceHub code.

---

## 2. MongoDB Atlas Configuration

1. **Log in to MongoDB Atlas**:
   * Navigate to **Database Deployments**.
   * If you don't have a cluster, create a **Free Shared Cluster (M0)**.
2. **Configure Database Access (User Credentials)**:
   * Go to **Security** -> **Database Access**.
   * Click **Add New Database User**.
   * Authentication Method: **Password**.
   * Set a Username (e.g. `freelancehub_admin`) and a secure Password.
   * Built-in Role: **Read and write to any database**.
   * Click **Add User**.
3. **Configure Network Access (IP Whitelist)**:
   * Go to **Security** -> **Network Access**.
   * Click **Add IP Address**.
   * Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   * *Note: Vercel serverless functions use dynamic IP addresses, so `0.0.0.0/0` is required.*
   * Click **Confirm**.
4. **Get Connection String**:
   * Under **Database Deployments**, click **Connect** on your cluster.
   * Choose **Drivers** (Node.js).
   * Copy the connection string. It will look like:
     ```text
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/freelancehub?retryWrites=true&w=majority
     ```
   * Replace `<username>` and `<password>` with your database user credentials.
   * Set the database name to `freelancehub`.

---

## 3. Required Environment Variables

Add these environment variables in your Vercel Project Settings (**Settings** -> **Environment Variables**):

| Variable Name | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Node environment | `production` |
| `MONGO_URI` | Yes | MongoDB Atlas Connection String | `mongodb+srv://admin:pass@cluster0.abc.mongodb.net/freelancehub?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens | `generate_a_random_32_character_string` |
| `JWT_EXPIRE` | Optional | JWT expiration duration | `7d` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay Key ID | `rzp_test_FreelanceHubDemoKey` |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay Key Secret | `rzp_test_FreelanceHubDemoSecret` |
| `DEFAULT_PLATFORM_COMMISSION`| Optional | Platform commission percentage | `10` |

---

## 4. Deployment Methods

### Method A: Deploy via GitHub (Recommended)

1. Push your FreelanceHub code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Configure FreelanceHub for Vercel deployment"
   git remote add origin https://github.com/<your-username>/freelancehub.git
   git branch -M main
   git push -u origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)**.
3. Import your `freelancehub` repository.
4. Configure Project Settings:
   * **Framework Preset**: **Other** (Leave as Other).
   * **Root Directory**: `./` (Leave as default root).
   * **Build Command**: `npm run build` (or leave default).
   * **Output Directory**: Leave empty / default.
   * **Install Command**: `npm install` (default).
5. Expand **Environment Variables** and enter the variables from Section 3 (`MONGO_URI`, `JWT_SECRET`, etc.).
6. Click **Deploy**.

---

### Method B: Deploy via Vercel CLI

1. Open your terminal in the `FreelanceHub` project directory.
2. Run the deployment command using `npx`:
   ```bash
   npx vercel
   ```
3. Follow the CLI prompts:
   * Set up and deploy: **y**
   * Which scope: Select your Vercel account.
   * Link to existing project: **N**
   * What's your project's name: `freelancehub`
   * In which directory is your code located: `./`
4. Set the environment variables in Vercel:
   ```bash
   npx vercel env add MONGO_URI
   npx vercel env add JWT_SECRET
   npx vercel env add NODE_ENV
   ```
5. Deploy to Production:
   ```bash
   npx vercel --prod
   ```

---

## 5. Post-Deployment Verification & Database Seeding

Once deployed, your application will be available at `https://<your-project>.vercel.app`.

### Automatic Seeding:
* When the application runs for the first time on a fresh MongoDB Atlas database, `api/index.js` automatically checks if categories exist. If the database is empty, it automatically populates:
  * 25 Marketplace Categories (Web Dev, Graphic Design, Tutoring, etc.).
  * Admin, Client, and Freelancer demo accounts.
  * Sample Services and Projects.

### Manual Seeding (If Needed):
You can trigger database re-seeding at any time by making a `POST` request to `/api/seed`:
```bash
curl -X POST https://<your-project>.vercel.app/api/seed
```
Or test via browser console / Postman.

### Health Check:
Verify backend status anytime at:
```text
https://<your-project>.vercel.app/api/health
```
Expected response:
```json
{
  "status": "online",
  "appName": "FreelanceHub",
  "version": "1.0.0",
  "database": "connected",
  "environment": "production"
}
```

---

## 6. Demo Login Credentials

After seeding, test accounts are immediately available:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Client** | `client@freelancehub.com` | `client123` |
| **Freelancer** | `freelancer1@freelancehub.com` | `freelancer123` |
| **Admin** | `admin@freelancehub.com` | `admin123` |

---

## 7. Troubleshooting & FAQ

### Q1: API requests return `404` or `API endpoint not found`
* Ensure your request starts with `/api/` (e.g. `/api/categories`, `/api/auth/login`).
* Check Vercel Function logs under the **Deployments** -> **Functions** tab in the Vercel dashboard.

### Q2: Database connection timeout (`MongoServerSelectionError`)
* Verify MongoDB Atlas **Network Access** IP whitelist includes `0.0.0.0/0`.
* Verify the username and password in `MONGO_URI` are correct (special characters in passwords must be URL-encoded, e.g. `@` becomes `%40`).

### Q3: Page refresh on `/services` or `/freelancers` shows 404
* `vercel.json` contains rewrites that direct all non-API paths to `/frontend/index.html`.
* Ensure `vercel.json` is located in the repository root.

### Q4: Uploaded images do not show up
* FreelanceHub automatically converts uploaded images into Base64 Data URLs when deployed on Vercel. These are saved directly in MongoDB Atlas and render immediately without disk dependencies.
