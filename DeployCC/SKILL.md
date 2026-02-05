---
name: DeployCC
description: Deploy Cosine Cartographer to production. Builds the app, commits changes to Git, and pushes to GitHub. Use when the user says "deploy", "push to production", "publish", or "/DeployCC".
---

# DeployCC - Cosine Cartographer Deployment

Deploy the app with a single command.

## Deployment Steps

1. Build production version
2. Stage all changes
3. Commit with user-provided or auto-generated message
4. Push to GitHub

## Usage

Run the deploy script:

```bash
./DeployCC/scripts/deploy.sh "Your commit message"
```

Or run steps manually:

```bash
npm run build
git add .
git commit -m "Your commit message"
git push
```

## After Pushing

Remind the user to pull updates in cPanel:
1. Go to cPanel → Git Version Control
2. Click "Update from Remote" on the CosineCartographer repo

## Notes

- Always build before committing to ensure dist/ is up to date
- If no commit message provided, generate one based on recent changes
- The script will fail safely if there are no changes to commit
