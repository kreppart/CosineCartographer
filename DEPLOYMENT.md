# Deployment Guide for Cosine Cartographer

## Quick Start

```bash
# Build the production version
./deploy.sh

# Or manually:
npm run build
```

The built files will be in the `./dist/` folder.

---

## Option 1: cPanel Git Deployment (Recommended)

This method auto-deploys whenever you push to GitHub.

### Initial Setup (One-time)

#### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository named `CosineCartographer`
3. Keep it public (or private if you have GitHub Pro)

#### Step 2: Push Your Code to GitHub

```bash
# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/CosineCartographer.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### Step 3: Connect cPanel to GitHub

1. Log into cPanel
2. Find **"Git Version Control"** (under Files section)
3. Click **"Create"**
4. Enter your GitHub repository URL: `https://github.com/YOUR_USERNAME/CosineCartographer.git`
5. Set the deployment path (e.g., `/public_html/CosineCartographer`)
6. Click **"Create"**

#### Step 4: Set Up Auto-Deploy with .cpanel.yml

Create a `.cpanel.yml` file in your project root to auto-build on deploy:

```yaml
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/YOUR_CPANEL_USER/public_html/CosineCartographer
    - /bin/cp -R dist/* $DEPLOYPATH/
```

### Deploying Updates

After the initial setup, deploying is simple:

```bash
# 1. Build the production version
npm run build

# 2. Commit your changes
git add .
git commit -m "Your update message"

# 3. Push to GitHub
git push

# 4. In cPanel Git Version Control, click "Update from Remote"
#    (or set up a webhook for automatic pulls)
```

---

## Option 2: FTP Deployment

If you prefer manual FTP uploads:

### Using FileZilla or similar:

1. Build the project: `npm run build`
2. Connect to your server via FTP/SFTP
3. Navigate to your web directory (e.g., `/public_html/CosineCartographer`)
4. Upload everything from the `./dist/` folder

### Using command-line lftp:

```bash
# Install lftp if needed: brew install lftp (Mac) or apt install lftp (Linux)

lftp -u YOUR_FTP_USERNAME,YOUR_FTP_PASSWORD YOUR_FTP_HOST << EOF
mirror -R --delete dist/ /public_html/CosineCartographer/
quit
EOF
```

---

## Build Output

After running `npm run build`, the `./dist/` folder contains:

```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── index-*.js      # Bundled JavaScript
│   └── index-*.css     # Bundled CSS
└── CosineCartographer/
    └── banner.png      # Static assets
```

Upload the **contents** of `dist/` to your web server's target directory.

---

## Troubleshooting

### "Page not found" after deployment
- Make sure your server is configured to serve `index.html` for all routes
- Check that the `base` in `vite.config.js` matches your deployment path

### Assets not loading
- Verify the `base` path in `vite.config.js`
- Check browser console for 404 errors

### cPanel Git won't pull
- Verify your repository is public, or add deploy keys for private repos
- Check the cPanel Git logs for error messages
