# Contributing to ZKSS

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/zkss.git
   cd zkss
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your [Upstash Redis](https://console.upstash.com/) credentials:

   ```bash
   cp .env.example .env.local
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Code Style

- This project uses **TypeScript** and **ESLint**.
- Run `npm run lint` before submitting a PR.
- Follow the existing patterns and naming conventions.

## Submitting Changes

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature
   ```

2. Make your changes and commit with a descriptive message:

   ```bash
   git commit -m "feat: add something useful"
   ```

3. Push to your fork and open a Pull Request against `main`.

4. Describe what your PR does and why. Link any relevant issues.

## Reporting Issues

- Use [GitHub Issues](https://github.com/wsiff/zkss/issues) to report bugs or request features.
- Include steps to reproduce, expected behavior, and actual behavior.
- For security vulnerabilities, please email the maintainer directly instead of opening a public issue.

## Guidelines

- Keep PRs focused — one feature or fix per PR.
- Don't introduce new dependencies without discussion.
- Ensure the project builds (`npm run build`) and lints cleanly before submitting.
