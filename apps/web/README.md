This is the **ops web** app for this monorepo (port **3001** by default).

## Local dev

```bash
npm install
npm run dev
```

Open **`http://127.0.0.1:3001`** (or **`http://localhost:3001`** — use **one host consistently**).

- Set **`OPS_API_URL`** in **`.env.local`** to match the Nest API (**`PORT`**, often `3000` or `8899`). Login hits **`POST /api/auth/login`** on this app first; Nest is called **from the Next server**, so you will **not** see `8899` in the browser Network tab unless some client code calls it directly.

### Dev console: `WebSocket … /_next/webpack-hmr` failed

That line is **Next hot-reload**, not your API. If it fails (VPN, firewall, browser privacy, `localhost` vs `127.0.0.1` mismatch), client JS may not hydrate and the login form might not run **`fetch`**. Try:

1. Same URL host the dev server printed (usually **`127.0.0.1:3001`**).
2. Disable extensions / VPN for localhost, or try another browser.
3. **`npm run dev:webpack`** — webpack dev server instead of Turbopack (often fixes flaky HMR WebSockets).

---

Below is the default create-next-app readme (generic).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
