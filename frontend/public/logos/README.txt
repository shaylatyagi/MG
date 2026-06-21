Drop logo PNG files here:

  logo-cyan.png   — Cyan/blue logo (for light backgrounds and dark nav)
  logo-white.png  — White logo (for dark backgrounds)
  logo-icon.png   — Icon only (optional)

These are served as static assets by Vercel at:
  https://your-app.vercel.app/logos/logo-cyan.png

Once AWS S3 is configured, admin can upload to S3 via /api/config/branding/upload-url
and those URLs will take precedence over these local files.
