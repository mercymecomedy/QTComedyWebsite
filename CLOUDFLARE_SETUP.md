# Cloudflare Pages Setup Guide

This guide walks you through setting up Cloudflare Pages deployment for the QTs & Cuties website from scratch.

## Prerequisites

- A GitHub account with the repository created
- A Cloudflare account (free tier works fine)
- Domain configured in Cloudflare (optional)

## Step 1: Connect GitHub to Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)

2. Navigate to **Workers & Pages** in the left sidebar

3. Click **Create application**

4. Select the **Pages** tab

5. Click **Connect to Git**

6. Select **GitHub** as your Git provider

7. Click **Connect GitHub** and authorize Cloudflare to access your repositories

8. You can choose to grant access to:
   - All repositories, or
   - Only select repositories (recommended for security)

9. Select the `QTComedyWebsite` repository

## Step 2: Configure Build Settings

Fill in the build configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `qtcomedy-website` (or your preferred name) |
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `_site` |
| **Root directory** | (leave empty) |

## Step 3: Set Environment Variables

1. Click **Add variable** under **Environment variables**

2. Add the following variable:
   - **Variable name**: `NODE_VERSION`
   - **Value**: `18`
   - **Environment**: Select both **Production** and **Preview**

3. (Optional) Add additional variables if needed in the future

## Step 4: Save and Deploy

1. Review your settings

2. Click **Save and Deploy**

3. Cloudflare will start the first deployment

4. Wait for the deployment to complete (usually 1-2 minutes)

5. You'll see a success message with your site URL

## Step 5: Configure Custom Domain (Optional)

If you want to use a custom domain:

1. In your Pages project, go to **Custom domains**

2. Click **Set up a custom domain**

3. Enter your domain (e.g., `qtcomedy.com`)

4. Cloudflare will verify DNS configuration

5. Update DNS records as instructed:
   - Add a `CNAME` record pointing to your Pages URL
   
6. Ensure the `CNAME` file in your repository contains your domain name

## Step 6: Verify Preview Deployments

Preview deployments are automatically enabled for all non-production branches.

To test:

1. Create a test branch: `git checkout -b test-preview`

2. Make a small change to `events.json`

3. Commit and push: `git push origin test-preview`

4. Open a pull request on GitHub

5. Check the PR for a comment with the preview URL

6. The preview URL will be: `https://test-preview--qtcomedy-website.pages.dev`

7. Verify the changes appear correctly

8. Close the PR and delete the test branch

## Branch Deployment Settings

By default, Cloudflare Pages deploys:
- **Production**: `main` branch → production URL
- **Preview**: All other branches → unique preview URLs

You can customize this in **Settings** > **Builds & deployments** > **Branch deploy controls**.

## Build Status Notifications

To receive notifications about build status:

1. Go to **Settings** > **Builds & deployments**

2. Under **Build notifications**, you can:
   - Enable email notifications
   - Configure Slack/Discord webhooks
   - Use Cloudflare's email routing

## Troubleshooting Common Issues

### Build fails with "npm not found"

- Ensure `NODE_VERSION` environment variable is set to `18`
- Cloudflare Pages uses this to select the Node.js version

### Build fails with "events.json not found"

- Verify the file exists in the repository root
- Check that the file is committed to Git (not in .gitignore)

### Custom domain not working

- Verify DNS records in Cloudflare
- Ensure `CNAME` file contains the correct domain
- Wait for DNS propagation (can take up to 24 hours)

### Preview deployments not working

- Check that branch protection rules allow Cloudflare to access the branch
- Verify the branch is not `main` (main deploys to production)

## Production Deployment Checklist

Before deploying to production:

- [ ] Test locally with `npm run build && npm run preview`
- [ ] Verify all events display correctly
- [ ] Test filter functionality
- [ ] Test calendar integration on mobile and desktop
- [ ] Review responsive layout on mobile devices
- [ ] Check custom domain configuration (if applicable)
- [ ] Verify `CNAME` file contains correct domain

## Monitoring Deployments

View deployment history:
1. Go to your Pages project
2. Click **View details** on any deployment
3. See build logs, deploy time, and commit information

Roll back to a previous deployment:
1. Find the deployment you want to restore
2. Click **Rollback to this deployment**

## Next Steps

After setup is complete:

1. Bookmark your Cloudflare Pages dashboard
2. Save your production URL and preview URL pattern
3. Share the deployment workflow with team members
4. Set up notifications for build failures (recommended)

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Eleventy Documentation](https://www.11ty.dev/docs/)
- [GitHub Pull Request Workflow](https://docs.github.com/en/pull-requests)
