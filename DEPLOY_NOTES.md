# Deployment Notes (Nginx / CloudPanel)

This project uses static HTML/CSS/JS. If your host is Nginx/CloudPanel, the `_headers` file is not applied automatically.
Use Nginx config rules below to match the same cache behavior.

## 1) Cache policy

- HTML: revalidate on every request.
- Versioned/static assets (`css`, `js`, `svg`, `png`, `webp`, `jpg`, `jpeg`, `ico`, `woff2`): cache for 1 year + immutable.

```nginx
# HTML: always revalidate
location ~* \.html$ {
  add_header Cache-Control "public, max-age=0, must-revalidate" always;
}

# Static assets: long cache
location ~* \.(css|js|svg|png|webp|jpg|jpeg|ico|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

## 2) Compression (Brotli/Gzip)

Enable Brotli if available, and keep gzip as fallback:

```nginx
# Brotli (module-dependent)
brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;

# Gzip fallback
gzip on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
```

## 3) Verify in browser DevTools

1. Open DevTools -> Network.
2. Reload page with cache disabled OFF (normal reload).
3. Check one HTML response header:
   - `cache-control: public, max-age=0, must-revalidate`
4. Check one CSS/JS/SVG response header:
   - `cache-control: public, max-age=31536000, immutable`
5. Check compression header on text assets:
   - `content-encoding: br` or `content-encoding: gzip`

These settings improve repeat-load speed for mobile 4G users without touching pricing/storage logic.
