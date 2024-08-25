# Etched AI Chat
This is the monorepo for Etched's AI chat platform. Connect it to any open-source model (or any endpoint that streams responses like OpenAI or Anthropic's API) and start chatting!

Features:
- Google OAuth (Planned)
- Custom system prompts
- Artifact plugins (Planned)
- Org-wide and personal RAG (Planned)

## Repo Structure
This is a [turborepo](https://turbo.build/repo/docs) managed monorepo. Read up on it if you have never heard of it before.

There are three main components: `apps/`, `packages/`, and `infra/`.

`apps/` is where the applications live. Currently there is the chat UI and the backend server.

`packages/` is where any shareable code should go. With pnpm workspaces, you can import local modules by adding `"[package-name]": "workspace:*"` to a `package.json`.

`infra/` is for any infrastructure, like the local supabase setup.

## Development
First set up your `.env` files. You will need them in `apps/ui/.env`, `apps/server/.env`, and `infra/.env`. Follow the `.env.sample` files in each of them.

For Google OAuth, follow [these steps](https://supabase.com/docs/guides/auth/social-login/auth-google) to create a Google OAuth client. Then, for local development go to the Credentials page and edit your OAuth client. Add `http://localhost:54321/auth/v1/callback` to the Authorized redirect URIs.

Get the rest of the supabase environment variables from the output of your local supabase cli (it'll show up in `turbo dev` the first time you run it, otherwise just check `pnpm exec supabase status`).

Make sure you have [pnpm](https://pnpm.io/) installed. Then run:
```
pnpm i
pnpm dev
```
