This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Missing translations

If you see placeholders like `⟦namespace.key⟧` in the UI, a translation is missing. Add the key to `messages/uz.json`, `messages/ru.json`, and `messages/en.json` before merging changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Telegram OIDC setup

- Set `PUBLIC_APP_URL` to your canonical external URL.
- For local development with ngrok, use your ngrok HTTPS URL (for example `https://xxxx.ngrok-free.app`).
- Keep `LOCAL_HTTPS=false` for normal localhost development.
- `TELEGRAM_OIDC_REDIRECT_URI` is optional:
  - leave empty to auto-use `${PUBLIC_APP_URL}/auth/telegram/callback`
  - or set a full absolute callback URL with path

In BotFather Web Login Allowed URLs, add both:
- your origin (for example `https://xxxx.ngrok-free.app`)
- your exact callback URL (for example `https://xxxx.ngrok-free.app/auth/telegram/callback`)

## Google OIDC setup

- Configure OAuth consent screen in Google Cloud Console.
- Create OAuth 2.0 Client ID with application type `Web application`.
- Set environment variables:
  - `GOOGLE_OIDC_CLIENT_ID`
  - `GOOGLE_OIDC_CLIENT_SECRET`
  - `GOOGLE_OIDC_REDIRECT_URI` (full callback URL, for example `https://your-domain.com/auth/google/callback`)
  - `GOOGLE_OIDC_SCOPES` (recommended: `openid email profile`)
- Add Authorized redirect URIs:
  - `https://<ngrok-domain>/auth/google/callback`
  - `https://<prod-domain>/auth/google/callback`
- Add Authorized JavaScript origins:
  - `https://<ngrok-domain>`
  - `https://<prod-domain>`
