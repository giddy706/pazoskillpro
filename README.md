# Project Structure

This project is separated into frontend and backend directories.

- `frontend/`
  - Contains the static website files
  - `public/` holds the main site frontend assets
  - `admin/` holds the admin dashboard frontend files
  - `academee.themerex.net/` contains additional frontend content

- `backend/`
  - Contains the Node.js backend service
  - `server.js` serves the public frontend and backend APIs
  - `package.json`, `package-lock.json`, `node_modules/`, `.env`, `server/`, `scripts/`, and database files are in this folder

## Local Development

Run the backend from the `backend` folder. It will serve the frontend static files on the same origin:

```bash
cd backend && npm run dev
```

Then open the hosted frontend at `https://35f64cfd.pazoskillpro.pages.dev/` or use the backend API at `https://pazoskillpro-backend.onrender.com/api`.

## Deployment

- The frontend is static HTML/CSS/JS and can be deployed to any static host.
- The backend must be deployed to a Node.js host (e.g., Render, Railway, Fly.io).
- If the frontend is served from a different origin than the backend, set `window.API_BASE_URL` before loading the app scripts (e.g., `<script>window.API_BASE_URL = 'https://your-api.example.com'</script>`).
- `netlify.toml` includes an example proxy redirect configuration for deploying the frontend on Netlify while the backend runs elsewhere.

## Notes

- Admin dashboard is served by the backend at `/admin`.
- The frontend uses relative API paths by default, so it works out of the box when the backend serves the static files.
