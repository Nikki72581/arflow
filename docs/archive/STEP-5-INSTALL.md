# Step 5: Installation Guide

## 🚀 Quick Start (5 Minutes)

Follow these steps to add reporting & dashboards to your CommissionFlow app.

---

## Step 1: Install Dependencies

```bash
npm install recharts date-fns
```

**What these do:**
- `recharts` - Charts for commission trends
- `date-fns` - Date range utilities

---

## Step 2: Copy Files

### Create Directory Structure

```bash
# Create directories
mkdir -p src/lib
mkdir -p src/components/dashboard
mkdir -p src/app/api/dashboard/stats
mkdir -p src/app/api/dashboard/trends
mkdir -p src/app/api/dashboard/performers
mkdir -p src/app/api/dashboard/export
mkdir -p src/app/dashboard/reports
```

### Copy Library Files (2 files)

```bash
cp outputs/lib/date-range.ts src/lib/
cp outputs/lib/csv-export.ts src/lib/
```

### Copy Components (6 files)

```bash
cp outputs/components/dashboard/stats-card.tsx src/components/dashboard/
cp outputs/components/dashboard/commission-trends-chart.tsx src/components/dashboard/
cp outputs/components/dashboard/top-performers.tsx src/components/dashboard/
cp outputs/components/dashboard/date-range-picker.tsx src/components/dashboard/
cp outputs/components/dashboard/export-button.tsx src/components/dashboard/
cp outputs/components/dashboard/dashboard-client.tsx src/components/dashboard/
```

### Copy Server Actions (1 file)

```bash
cp outputs/app/actions/dashboard.ts src/app/actions/
```

### Copy API Routes (4 files)

```bash
cp outputs/app/api/dashboard/stats/route.ts src/app/api/dashboard/stats/
cp outputs/app/api/dashboard/trends/route.ts src/app/api/dashboard/trends/
cp outputs/app/api/dashboard/performers/route.ts src/app/api/dashboard/performers/
cp outputs/app/api/dashboard/export/route.ts src/app/api/dashboard/export/
```

### Copy Pages (2 files)

```bash
cp outputs/app/dashboard/page.tsx src/app/dashboard/
cp outputs/app/dashboard/reports/page.tsx src/app/dashboard/reports/
```

---

## Step 3: Verify File Structure

Your project should now have:

```
src/
├── lib/
│   ├── date-range.ts          ✓ NEW
│   └── csv-export.ts          ✓ NEW
├── components/
│   └── dashboard/             ✓ NEW
│       ├── stats-card.tsx
│       ├── commission-trends-chart.tsx
│       ├── top-performers.tsx
│       ├── date-range-picker.tsx
│       ├── export-button.tsx
│       └── dashboard-client.tsx
├── app/
│   ├── actions/
│   │   └── dashboard.ts       ✓ NEW
│   ├── api/
│   │   └── dashboard/         ✓ NEW
│   │       ├── stats/route.ts
│   │       ├── trends/route.ts
│   │       ├── performers/route.ts
│   │       └── export/route.ts
│   └── dashboard/
│       ├── page.tsx           ✓ UPDATED
│       └── reports/           ✓ NEW
│           └── page.tsx
```

---

## Step 4: Start Development Server

```bash
npm run dev
```

Wait for compilation to complete.

---

## Step 5: Test the Dashboard

### Open Main Dashboard

```bash
# In browser, visit:
http://localhost:3000/dashboard
```

**You should see:**
- 7 KPI cards at top
- Commission trends chart
- Top performers list
- Date range filter
- Export CSV button

### Open Performance Reports

```bash
# In browser, visit:
http://localhost:3000/dashboard/reports
```

**You should see:**
- Table with all salespeople
- Rankings and badges
- Performance metrics

---

## Step 6: Add Test Data (If Empty)

If your dashboard is empty, add some test data:

### 1. Create a Commission Plan

```
http://localhost:3000/dashboard/plans
→ Click "New Plan"
→ Fill in details
→ Add rules (e.g., 10% commission)
```

### 2. Record a Sale

```
http://localhost:3000/dashboard/sales
→ Click "New Sale"
→ Enter amount: $10,000
→ Select project & salesperson
```

### 3. Approve Commission

```
http://localhost:3000/dashboard/commissions
→ Find the PENDING commission
→ Click "Approve"
```

### 4. Refresh Dashboard

```
http://localhost:3000/dashboard
→ See your data!
```

---

## Step 7: Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Add Step 5: Reporting & Dashboards"

# Push to GitHub
git push origin main

# Vercel will auto-deploy
```

Visit your production URL to see the live dashboard!

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`recharts`, `date-fns`)
- [ ] All 15 files copied
- [ ] `npm run dev` runs without errors
- [ ] Dashboard page loads (`/dashboard`)
- [ ] Stats cards show data
- [ ] Chart displays
- [ ] Top performers list shows
- [ ] Date filter works
- [ ] Export button works
- [ ] Reports page loads (`/dashboard/reports`)
- [ ] No console errors
- [ ] Mobile responsive

---

## 🐛 Common Issues

### Issue: Module not found errors

**Solution:**
```bash
# Make sure paths are correct
# In Next.js, paths should be like:
import { StatsCard } from '@/components/dashboard/stats-card'

# Not:
import { StatsCard } from 'src/components/dashboard/stats-card'
```

### Issue: recharts errors

**Solution:**
```bash
npm install recharts
# Then restart dev server
npm run dev
```

### Issue: date-fns errors

**Solution:**
```bash
npm install date-fns
# Then restart dev server
npm run dev
```

### Issue: API routes 404

**Cause:** File must be named `route.ts` (not `index.ts` or `api.ts`)

**Check:**
```
app/api/dashboard/stats/route.ts  ✓ Correct
app/api/dashboard/stats.ts        ✗ Wrong
```

### Issue: Dashboard stuck loading

**Check:**
1. Browser console for errors (F12)
2. Network tab - are API calls succeeding?
3. Database connection working?

**Debug:**
```bash
# Test API endpoint directly
curl http://localhost:3000/api/dashboard/stats

# Check database
npx prisma studio
```

### Issue: No data showing

**Cause:** No sales/commissions in database

**Solution:** Add test data (see Step 6 above)

---

## 📚 Next Steps

### After Installation

1. **Explore Features**
   - Try different date ranges
   - Export a CSV
   - View performance reports

2. **Customize Dashboard**
   - See `STEP-5-COMPONENTS.md` for API reference
   - Modify colors, labels, etc.

3. **Add More Data**
   - Record more sales
   - Create more commission plans
   - Invite team members

4. **Move to Step 6**
   - Final step: Payouts & Polish
   - 100% MVP ready!

---

## 🎯 What You Can Do Now

### For Finance Team
- Export monthly commissions for payroll
- Filter by date range
- Download CSV for accounting system

### For Sales Managers
- Review team performance
- See top performers
- Track commission trends

### For Executives
- View dashboard KPIs
- Monitor sales & commission metrics
- Export reports for board meetings

---

## 📖 Documentation

**Full Guides:**
- [STEP-5-README.md](./STEP-5-README.md) - Complete documentation
- [STEP-5-QUICK-REFERENCE.md](./STEP-5-QUICK-REFERENCE.md) - Command cheat sheet
- [STEP-5-COMPONENTS.md](./STEP-5-COMPONENTS.md) - Component API reference
- [STEP-5-COMPLETE.md](./STEP-5-COMPLETE.md) - Completion summary

---

## 🎉 Success!

If you made it here, you now have:

✅ Professional dashboard with real-time KPIs
✅ Interactive commission trends chart
✅ Top performers leaderboard
✅ Date range filtering
✅ CSV export for payroll
✅ Detailed performance reports

**You're 85% done with the MVP!** 🚀

---

## ❓ Need Help?

**If stuck:**
1. Check documentation files
2. Review error messages carefully
3. Verify file paths and names
4. Test API endpoints individually
5. Check database has data

**Still stuck?** Review the full `STEP-5-README.md` for detailed troubleshooting.

---

## 🚀 Ready for Step 6!

Once everything works:

```bash
# Commit and deploy
git add .
git commit -m "Complete Step 5: Reporting & Dashboards"
git push

# Ready for final step!
```

**Next:** Step 6 - Payouts & Polish (final step to 100% MVP!)
