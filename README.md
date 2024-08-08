# Etched AI Chat
This is the monorepo for Etched's AI chat platform. Connect it to any open-source model (or any endpoint that streams responses like OpenAI or Anthropic's API) and start chatting!

Features:
- Google OAuth
- Custom system prompts
- Artifact plugins (In progress)

## Repo Structure
This is a [turborepo](https://turbo.build/repo/docs) managed monorepo. Read up on it if you have never heard of it before.

There are two main components: `apps/` and `packages/`.

`apps/` is where the applications live. Currently there is the chat UI and the backend server.

`packages/` is where any shareable code should go. With pnpm workspaces, you can import local modules by adding `"[package-name]": "workspace:*"` to a `package.json`.

## Development
Make sure you have [pnpm](https://pnpm.io/) installed. Then run:
```
pnpm i
pnpm dev
```
