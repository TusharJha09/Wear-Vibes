# WearVibes AI — Fashion Storefront & Virtual Try-On

A responsive fashion storefront and virtual fitting-room demo. The existing WearVibes UI is preserved in `public/index.html`; the Node.js/Express backend serves it and securely calls Replicate for virtual try-on.

## Features

- Responsive fashion storefront, search, category filters, product details, wishlist and cart demo
- Fashion imagery loaded from Unsplash (remote images require internet access)
- Virtual try-on using a user photo plus the selected catalog garment
- Replicate API token is read only by the backend from an environment variable
- Image content validation, size/dimension checks, upload limits and rate limiting
- Health endpoint at `/api/health`
- Render Blueprint (`render.yaml`) and Dockerfile included

## Requirements

- Node.js 20+ (Node.js 22 recommended)
- A Replicate account and API token: https://replicate.com/account/api-tokens
- Replicate account billing/credits as required by the selected model

## Run on Windows

1. Extract the ZIP and open the `WearVibes_AI_Pro` folder in VS Code.
2. Install Node.js 22 if it is not installed: https://nodejs.org/
3. Run `start_windows.bat`, or run the following commands in the project folder:

```powershell
Copy-Item .env.example .env
# Edit .env and set REPLICATE_API_TOKEN to your actual token
npm install
npm start
```

4. Open http://localhost:3000.
5. Check http://localhost:3000/api/health. `provider_configured` should be `true` after you set the token.

Do not open `public/index.html` directly from File Explorer; the API is served by the Node.js server.

## Configure Replicate

Set these server environment variables:

- `REPLICATE_API_TOKEN` — secret token from your Replicate account
- `REPLICATE_MODEL` — defaults to `prunaai/p-image-try-on`
- `PORT` — set by most hosting providers automatically; defaults to `3000` locally

The project uses Replicate's official `prunaai/p-image-try-on` model. Review its current input schema, pricing, availability and terms before use: https://replicate.com/prunaai/p-image-try-on

## Deploy on Render

1. Create a GitHub repository and upload the contents of this folder. Do not upload `.env` or `node_modules`.
2. Open https://render.com and create a **New + → Blueprint** service, then connect your repository containing `render.yaml`.
3. When Render asks for `REPLICATE_API_TOKEN`, enter your token in the secret environment variable field. Do not put the token in `render.yaml` or GitHub.
4. Deploy. Render will build with `npm install` and start with `npm start`.
5. Open the generated `https://...onrender.com` URL and test `/api/health`, then try a virtual fitting.

Render free services may sleep after inactivity. The first request after sleeping may take longer. A real AI prediction requires a valid token, available provider credits, and model availability.

## Deploy with Docker

```bash
docker build -t wearvibes-ai .
docker run --rm -p 3000:3000 --env-file .env wearvibes-ai
```

## Security and limitations

- Never commit `.env`, reveal your API token in frontend JavaScript, or share the token in screenshots.
- Rotate the token immediately if it is exposed.
- The backend limits image uploads to 10 MB and accepts JPG, PNG and WebP. Use a clear full-body or three-quarter photo.
- Uploaded photos are sent to Replicate for inference. Tell users this before public launch and review the provider's privacy/data-handling terms.
- The catalog uses remote Unsplash editorial images; these may not be exact product cutouts. Use licensed, product-only images for better garment transfer and verify the image license and product accuracy.
- The store's account, cart, wishlist and checkout are demonstration features using browser storage. No real payments, server-side orders, inventory or user authentication are implemented. Do not accept real orders until those systems are added and security-reviewed.
- The generated image is a visual simulation, not a guarantee of actual fit, size, fabric behaviour or exact preservation of every garment detail.

## API

- `GET /api/health` — service status and whether the provider token is configured (never returns the token)
- `POST /api/try-on` — multipart fields `photo` and `product_id`; returns `image_url` on success
