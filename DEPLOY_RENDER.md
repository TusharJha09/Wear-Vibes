# Publish WearVibes AI on Render

This repository includes `render.yaml`, so Render can configure the Node service automatically.

1. Create a new **private or public** GitHub repository named `wearvibes-ai`.
2. Upload the contents of this project folder to the repository root. Keep `public/index.html`, `server.js`, `package.json`, `render.yaml`, and `Dockerfile` at the locations shown. Do **not** upload `.env` or `node_modules`.
3. Sign in to Render at https://render.com and choose **New + → Blueprint**.
4. Connect the GitHub repository and confirm the service detected from `render.yaml`.
5. Add `REPLICATE_API_TOKEN` as a secret environment variable when prompted. You can create the token at https://replicate.com/account/api-tokens. Do not paste it into GitHub or the source files.
6. Deploy and wait for the build to finish. Render will install npm dependencies and run `npm start`.
7. Open the URL Render provides. Test `https://YOUR-SERVICE.onrender.com/api/health`; it should return JSON with `ok: true` and `provider_configured: true`.
8. Test the storefront and generate one try-on using a clear, front-facing full-body photo. A successful health check confirms the server is up, but a successful AI try-on additionally requires a valid Replicate token, provider credits, and model availability.

If you change the token later, update it in Render's Environment settings and redeploy/restart the service. Do not expose the token in browser code or screenshots.
