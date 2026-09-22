# Installation

```bash
cp .env.example .env
npm install
npm start
```

Required environment variables:

- `MONGODB_URI`
- `SESSION_SECRET` (16+ characters)

Then open `/admin/setup` and create the first administrator. For public deployments, set `ADMIN_SETUP_TOKEN` before using the setup page.
