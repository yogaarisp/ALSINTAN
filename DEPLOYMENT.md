# DEPLOYMENT GUIDE — SIAP ALSINTAN (Fase 1)

## 1. Local Development
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Akses di browser: `http://localhost:5173`

---

## 2. Production Build (VPS / Cloudflare Pages / Static Hosting)

```bash
# Run production type-check & build
npm run build
```

Hasil build berada pada direktori `/dist`:
- `index.html`
- `assets/` (Javascript & CSS terkompresi)
- `manifest.webmanifest`, `sw.js` (PWA Service Worker)

### Cloudflare Pages Deployment:
1. Framework preset: **Vite**
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Environment Variables:
   - `VITE_GAS_API_URL`: URL deployment Google Apps Script
   - `VITE_APP_NAME`: `SIAP ALSINTAN`

### Nginx VPS Configuration:
```nginx
server {
    listen 80;
    server_name alsintan.domain.id;
    root /var/www/ALSINTAN/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
