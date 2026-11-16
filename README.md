This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 26 LTS (or Node.js 20.9.0 or newer) and npm. The recommended major version is recorded in `.nvmrc`.
- A Supabase project. The app uses Supabase for authentication and data storage.

### Install and configure

1. Install Node.js from [nodejs.org](https://nodejs.org/) if `node` or `npm` is not recognized in your terminal. Restart VS Code after installation so its terminal reloads the updated `PATH`.
2. From the project folder, install dependencies with `npm.cmd ci` in PowerShell (or `npm ci` in Command Prompt or other shells). The `.cmd` launcher avoids changing PowerShell's script execution policy.
3. Copy `.env.example` to `.env.local` and replace the Supabase URL, anon key, and service-role key with values from your Supabase project. Keep `.env.local` private; it is ignored by Git.
4. Configure the Gmail SMTP values in `.env.local` only if you need app email notifications. Set a long random `CRON_SECRET` if you use the overdue-notification endpoint.

### Run locally

Start the development server with `npm.cmd run dev` in PowerShell (or `npm run dev` in other shells), then open [http://localhost:3000](http://localhost:3000).

The included Supabase migrations are in `supabase/migrations`. The notification Edge Function also requires `RESEND_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` configured as Supabase function secrets; `FROM_EMAIL` and `APP_URL` are optional.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit it. This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to optimize and load Geist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
