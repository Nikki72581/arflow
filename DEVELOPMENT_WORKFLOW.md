# Development Workflow Guide

This is your simple, solo-developer workflow with safety checks built in.

## Daily Development Workflow

### Option 1: Quick fixes (recommended for small changes)
```bash
# 1. Make your code changes
# 2. Run tests locally to check
npm run test:unit

# 3. If tests pass, commit and push
git add .
git commit -m "your message"
git push origin main

# 4. Vercel will run tests again before deploying
# If tests fail, deployment is blocked
```

### Option 2: Feature work (recommended for bigger changes)
```bash
# 1. Create a feature branch
git checkout -b feature/my-feature-name

# 2. Make your changes and test
npm run test:watch  # runs tests as you code

# 3. Commit your changes
git add .
git commit -m "Add my feature"
git push origin feature/my-feature-name

# 4. Create PR on GitHub (web interface)
# 5. GitHub Actions runs all tests automatically
# 6. If tests pass, merge PR on GitHub
# 7. Vercel deploys automatically
```

## What Happens Now

### When You Push to Main Directly
1. GitHub Actions runs tests in the cloud (you'll see this in GitHub)
2. Vercel tries to deploy
3. **Vercel runs unit tests before building**
4. If tests PASS: deployment continues ✅
5. If tests FAIL: deployment is cancelled ❌

### When You Create a Pull Request
1. GitHub Actions runs all tests (unit, integration, E2E)
2. You can see results right in the PR
3. Only merge if tests are green
4. Once merged to main, Vercel deploys (with test check)

## Setting Up GitHub Branch Protection (Optional but Recommended)

This prevents you from accidentally pushing broken code to main:

1. Go to your GitHub repo
2. Click **Settings** → **Branches**
3. Click **Add rule**
4. Branch name pattern: `main`
5. Check these boxes:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ Under status checks, select: `Unit Tests`, `Integration Tests`
6. **Do NOT check** "Include administrators" (so you can still push directly in emergencies)
7. Click **Create** or **Save changes**

**What this does:** Makes it harder to push broken code, but you can still override if needed.

## Tips for Solo Development

- **Small changes?** Push to main directly (tests will still run on Vercel)
- **Bigger features?** Use a branch and PR to get full test coverage before merging
- **Tests failing locally?** Don't push! Fix them first
- **Emergency fix needed?** You can still push to main, but Vercel won't deploy if tests fail

## Quick Command Reference

```bash
# Run tests while coding (re-runs on file changes)
npm run test:watch

# Run just unit tests
npm run test:unit

# Run all tests
npm run test:all

# Run with coverage report
npm run test:coverage

# Run with UI
npm run test:ui
```

## Common Scenarios

### "I pushed to main and tests failed"
- GitHub Actions will show a red X
- Vercel deployment will be cancelled
- Fix the tests and push again

### "I want to test a big change safely"
- Create a branch: `git checkout -b feature/my-change`
- Push branch: `git push origin feature/my-change`
- Create PR on GitHub
- Tests run automatically
- Merge when green

### "I need to deploy RIGHT NOW even with failing tests"
You have two options:
1. **Fix the tests** (recommended)
2. **Temporarily disable** test check in [vercel.json](vercel.json) (not recommended)

## Files That Control This

- [.github/workflows/tests.yml](.github/workflows/tests.yml) - GitHub Actions test runner
- [vercel.json](vercel.json) - Vercel deployment config with test check
- [tests/setup.ts](tests/setup.ts) - Test environment configuration

## Need Help?

- See test failures? Check GitHub Actions tab in your repo
- Vercel deployment failed? Check Vercel dashboard for logs
- Local tests not working? Make sure you ran `npm install`
