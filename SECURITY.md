# Security Policy

## Supported version

Security fixes are applied to the latest version on the `main` branch.

## Reporting a vulnerability

Please use GitHub private vulnerability reporting. If it is unavailable, contact the maintainer through the email address on the [RAZEX0LOL GitHub profile](https://github.com/RAZEX0LOL).

Do not publish Spotify cookies, ingest keys, dashboard credentials, widget URLs, access tokens, database contents, or exploit details in a public issue.

## Deployment notes

- Generate independent `AUTH_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, `DASHBOARD_PASSWORD`, and database credentials.
- Keep `.env` permissions restricted and terminate TLS at a trusted reverse proxy.
- Restrict access to PostgreSQL and back it up before schema or image upgrades.
- Treat every browser-source widget URL as a bearer credential; rotate the widget when its URL is exposed.
- Spotify web-player cookies are encrypted at rest with AES-256-GCM, but operators must still protect the application host and encryption key.

The Spotify web-player and Canvas integrations use unofficial endpoints that may change without notice. This project is not affiliated with Spotify, YouTube, Google, OBS, or their respective owners.
