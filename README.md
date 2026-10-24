# SnapWall frontend (React + Vite) — deploy on Vercel

## Run locally
```
npm install
copy .env.example .env      # then fill in the Firebase values
npm run dev                 # http://localhost:5173
```
Local development talks to the backend at `http://localhost:5000` unless `VITE_API_BASE_URL` says otherwise.

## Deploy on Vercel
Deploy the **backend first** (you need its public https address below).

1. Push this folder to a GitHub repo. (If the repo also contains the backend, set **Root Directory** to the frontend folder in step 2.)
2. vercel.com > **Add New > Project** > import the repo. Vercel detects Vite automatically
   (Build command `npm run build`, Output directory `dist`).
3. Before clicking Deploy, open **Environment Variables** and add every value from `.env.example`
   (for Production, and Preview if you use it):
   - `VITE_API_BASE_URL` = your backend address, `https://...`, no trailing slash
   - the six `VITE_FIREBASE_*` values (Firebase console > Project settings > General > Your apps > Web app > Config)
   - `VITE_SUPPORT_EMAIL`

   These are baked in at **build** time. If you change one later, redeploy (Deployments > ... > Redeploy).
   A build with a missing value fails on purpose and tells you which one.
4. Click **Deploy**. Vercel gives you an address like `https://your-project.vercel.app`.

`vercel.json` (included) makes refreshes and direct links work and adds security headers and caching.

## After the first deploy: connect the pieces
1. **Backend CORS**: set `CORS_ORIGINS` on the backend to your exact Vercel address
   (`https://your-project.vercel.app`, no trailing slash; add your custom domain too, comma separated) and restart it.
   Without this the browser blocks every API call.
2. **Firebase console > Authentication > Settings > Authorized domains**: add `your-project.vercel.app`
   (and any custom domain), or Google sign-in fails.
3. **Razorpay webhook**: URL `https://<your-backend>/api/payments/webhook` (see the backend's `DEPLOYMENT.md`).
4. **Content-Security-Policy**: `vercel.json` ships it as `Content-Security-Policy-Report-Only`. Replace
   `YOUR_API_ORIGIN` with your backend address, redeploy, then use the live site with the browser console open
   (log in, upload a photo, pay in test mode). If no "Content Security Policy" messages appear, rename the header in
   `vercel.json` to `Content-Security-Policy` to enforce it.

Preview deployments (other branches) get different addresses; add them to the backend's `CORS_ORIGINS` and Firebase's
authorized domains only if you actually test on them.

## Smoke test (test-mode Razorpay)
Sign up, set a username, log in with email, log out, log in with username, upload a profile photo,
buy a space and post a Snap, like / save it, open Settings and Payment History.
Admin accounts: open `/admin` (the account's UID must be in the backend's `ADMIN_UIDS`).
