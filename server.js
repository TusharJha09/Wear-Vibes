'use strict';

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const Replicate = require('replicate');
const { imageSize } = require('image-size');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MODEL = (process.env.REPLICATE_MODEL || 'prunaai/p-image-try-on').trim();
const TOKEN = (process.env.REPLICATE_API_TOKEN || '').trim();

const PRODUCTS = {
  1: { name: 'Rani Pink Bridal Lehenga', category: 'Lehengas', image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85' },
  2: { name: 'Emerald Zari Lehenga Set', category: 'Lehengas', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85' },
  3: { name: 'Ivory Banarasi Silk Saree', category: 'Sarees', image: 'https://images.unsplash.com/photo-1583391733981-849840d0c4b1?auto=format&fit=crop&w=1000&q=85' },
  4: { name: 'Coral Chiffon Printed Saree', category: 'Sarees', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=85' },
  5: { name: 'Indigo Handloom Cotton Saree', category: 'Sarees', image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85' },
  6: { name: 'Mustard Embroidered Anarkali Suit', category: 'Suits', image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85' },
  7: { name: 'Powder Blue Straight Suit Set', category: 'Suits', image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1000&q=85' },
  8: { name: 'Sage Green Sharara Suit', category: 'Suits', image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=85' },
  9: { name: 'Terracotta Wrap Midi Dress', category: 'Dresses', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85' },
  10: { name: 'Ivory Tiered Cotton Dress', category: 'Dresses', image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=1000&q=85' },
  11: { name: 'Blush Floral Kurti', category: 'Kurtis', image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1000&q=85' },
  12: { name: 'Charcoal Chikankari Kurti', category: 'Kurtis', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=85' },
  13: { name: 'Olive Printed Co-ord Set', category: 'Coord Sets', image: 'https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&w=1000&q=85' },
  14: { name: 'Rust Ikat Co-ord Set', category: 'Coord Sets', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85' },
};

let replicate = null;
if (TOKEN) replicate = new Replicate({ auth: TOKEN });

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// Explicitly serve the storefront homepage so GET / always maps to public/index.html.
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

const tryOnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { detail: 'Too many try-on requests. Please wait a few minutes and try again.' },
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 30, fieldSize: 4000 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) return cb(new Error('Upload a JPG, PNG, or WEBP photo.'));
    cb(null, true);
  },
});

function outputUrl(output) {
  const item = Array.isArray(output) ? output[0] : output;
  if (typeof item === 'string' && /^https:\/\//i.test(item)) return item;
  if (item && typeof item.url === 'function') {
    const value = item.url();
    return value ? String(value) : null;
  }
  if (item && typeof item.url === 'string' && /^https:\/\//i.test(item.url)) return item.url;
  return null;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'WearVibes AI', provider: 'replicate', provider_configured: Boolean(TOKEN), model: MODEL });
});

app.post('/api/try-on', tryOnLimiter, upload.single('photo'), async (req, res, next) => {
  try {
    if (!replicate) {
      return res.status(503).json({ detail: 'AI try-on is not configured yet. Set REPLICATE_API_TOKEN in your server environment and restart the service.' });
    }
    if (!req.file) return res.status(400).json({ detail: 'Upload a person photo before generating a try-on.' });

    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(req.file.buffer);
    const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!detected || mimeMap[detected.ext] !== detected.mime || detected.mime !== req.file.mimetype) {
      return res.status(415).json({ detail: 'The file content does not match a supported JPG, PNG, or WEBP image.' });
    }

    let dimensions;
    try { dimensions = imageSize(req.file.buffer); }
    catch { return res.status(400).json({ detail: 'The uploaded image could not be decoded. Try exporting it as JPG or PNG.' }); }
    if (!dimensions.width || !dimensions.height || dimensions.width < 256 || dimensions.height < 384) {
      return res.status(422).json({ detail: 'Use a clear, larger photo at least 256 × 384 pixels. A full-body or three-quarter photo works best.' });
    }

    const productId = Number.parseInt(req.body.product_id, 10);
    const product = PRODUCTS[productId];
    if (!product) return res.status(400).json({ detail: 'Unknown catalog item. Refresh WearVibes and select a product again.' });

    const input = {
      person_image: req.file.buffer,
      garment_images: [product.image],
      output_format: 'jpg',
      output_quality: 95,
      preserve_input_size: true,
      turbo: false,
    };

    // Keep inference time bounded; hosted inference may take a few minutes.
    let timeoutId;
    let result;
    try {
      result = await Promise.race([
        replicate.run(MODEL, { input }),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TRYON_TIMEOUT')), 240000);
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    const imageUrl = outputUrl(result);
    if (!imageUrl) throw new Error('The AI model returned no usable image URL.');
    return res.json({ image_url: imageUrl, product_name: product.name, provider: 'replicate', message: 'AI try-on generated.' });
  } catch (err) {
    const message = String(err && err.message || err || 'Unknown error');
    console.error('[try-on]', message);
    if (message === 'TRYON_TIMEOUT') return res.status(504).json({ detail: 'AI generation took too long. Try again with a clear, well-lit photo.' });
    if (/401|unauthorized|invalid token/i.test(message)) return res.status(502).json({ detail: 'Replicate rejected the API token. Verify REPLICATE_API_TOKEN in your hosting environment.' });
    if (/402|billing|payment|credit/i.test(message)) return res.status(502).json({ detail: 'Replicate requires billing or available credits. Check your Replicate account.' });
    if (/429|throttl|rate.?limit/i.test(message)) return res.status(429).json({ detail: 'Replicate is rate-limiting requests. Wait briefly and try again.' });
    if (/not found|404/i.test(message)) return res.status(502).json({ detail: 'The selected Replicate model could not be found or is unavailable. Check REPLICATE_MODEL.' });
    return res.status(502).json({ detail: 'AI generation failed. Check the server logs, Replicate token, account credits, and model availability.' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ detail: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ detail: status === 413 ? 'Photo must be 10 MB or smaller.' : 'Upload could not be processed. Please try a JPG, PNG, or WEBP image.' });
  }
  console.error('[server]', err.message || err);
  return res.status(400).json({ detail: err.message || 'Invalid request.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WearVibes AI is running on port ${PORT}`);
  console.log(`Replicate configured: ${Boolean(TOKEN)} | model: ${MODEL}`);
});
