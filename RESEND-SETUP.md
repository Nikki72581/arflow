# 📧 Resend Email Service Setup

## Step 1: Install Resend Package

```bash
npm install resend
```

## Step 2: Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for free account (100 emails/day free)
3. Go to **API Keys** in dashboard
4. Create new API key
5. Copy the key (starts with `re_`)

## Step 3: Add to Environment Variables

Add to `.env.local`:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important:** 
- Use your verified domain or Resend's onboarding domain
- For testing: `onboarding@resend.dev` works without verification

## Step 4: Add to Vercel

In Vercel dashboard:
1. Go to your project
2. Settings → Environment Variables
3. Add `RESEND_API_KEY`
4. Add `RESEND_FROM_EMAIL`
5. Save and redeploy

## Step 5: Verify Domain (Optional but Recommended)

For production emails:
1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records they provide
4. Wait for verification
5. Update `RESEND_FROM_EMAIL` to use your domain

---

**Next:** Create email templates and notification functions
