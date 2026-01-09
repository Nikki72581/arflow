# Phase 1: Global Renaming & Cleanup - Detailed Checklist

## Objective
Update all branding, product names, and basic terminology from CommissionFlow to ARFlow.

---

## 1. Package & Project Files

### package.json
- [ ] Update `name` field: `commissionflow` → `arflow`
- [ ] Update `description` field to ARFlow description
- [ ] Update any CommissionFlow references in scripts

### README.md
- [ ] Rewrite title and description for ARFlow
- [ ] Update all feature descriptions (commissions → AR)
- [ ] Update setup instructions if needed
- [ ] Update any CommissionFlow branding

### .env.example (if exists)
- [ ] Review variable names for CommissionFlow references
- [ ] Update comments/descriptions

---

## 2. Global Text Replacements

Run these find-and-replace operations across the entire codebase:

### Brand Name Replacements
- [ ] `CommissionFlow` → `ARFlow` (exact case)
- [ ] `commissionflow` → `arflow` (lowercase)
- [ ] `COMMISSIONFLOW` → `ARFLOW` (uppercase)

### Entity Name Replacements (be careful with these - review each match)
- [ ] `Salesperson` → `Customer`
- [ ] `salesperson` → `customer`
- [ ] `Salespeople` → `Customers`
- [ ] `salespeople` → `customers`
- [ ] `SalesRep` → `Customer`
- [ ] `salesRep` → `customer`
- [ ] `sales_rep` → `customer`
- [ ] `sales_reps` → `customers`

**Note:** For the entity replacements, manually review each occurrence to ensure context is appropriate.

---

## 3. Metadata & SEO Updates

### Layout Files
- [ ] `src/app/layout.tsx` - Update title, description, OG tags
- [ ] Any other layout files - Check for metadata

### Page Metadata
Search for `export const metadata` or `<title>` tags in:
- [ ] `src/app/page.tsx` (landing page)
- [ ] `src/app/dashboard/page.tsx`
- [ ] Any other pages with metadata

Update to ARFlow branding.

---

## 4. UI Content - High-Level Pages

### Landing/Marketing Pages (if they exist)
- [ ] Landing page hero text
- [ ] Feature descriptions
- [ ] Call-to-action buttons
- [ ] Footer text

### Authentication Pages
- [ ] Sign in page - Update welcome message
- [ ] Sign up page - Update value proposition
- [ ] Password reset - Check for branding

### Dashboard Layout
- [ ] Sidebar/navigation labels
- [ ] Header/top bar branding
- [ ] Footer copyright notice

---

## 5. Email Templates & Notifications

Search for email templates in:
- [ ] Check `src/lib/email/` or similar
- [ ] Check for notification text
- [ ] Update from/subject lines
- [ ] Update email content (commissions → invoices/AR)

---

## 6. Configuration Files

- [ ] `next.config.js` - Check for any references
- [ ] `tailwind.config.js` - Check comments
- [ ] `tsconfig.json` - Check comments
- [ ] Any other config files

---

## 7. Documentation

- [ ] Update any inline documentation
- [ ] Update JSDoc comments with CommissionFlow references
- [ ] Check for developer notes in code

---

## 8. Assets & Static Files

### Logos & Images
- [ ] Replace logo files (if you have ARFlow logos)
- [ ] Update favicon
- [ ] Check `public/` directory for branded assets

### Marketing Copy
- [ ] Check `public/` for any text files
- [ ] Update any hardcoded marketing text

---

## 9. Environment-Specific

### Development
- [ ] Check for hardcoded URLs with "commissionflow"
- [ ] Update any dev-only comments/notes

### Production
- [ ] Verify environment variables in `.env.production` (if exists)
- [ ] Check for CommissionFlow in error messages

---

## 10. Testing & Verification

After completing all replacements:

- [ ] Search entire codebase for "CommissionFlow" (case-insensitive)
- [ ] Search for "commission" in UI-facing text (should be replaced with invoice/AR terms)
- [ ] Search for "salesperson" in UI-facing text (should be replaced with customer)
- [ ] Run TypeScript compiler: `npm run type-check` (or `tsc --noEmit`)
- [ ] Test local dev server: `npm run dev`
- [ ] Spot-check key pages in browser

---

## Tools for Find & Replace

### VS Code
```
Cmd+Shift+F (Mac) or Ctrl+Shift+F (Windows/Linux)
- Enable "Match Case" for exact replacements
- Use "Replace All" carefully after reviewing matches
```

### Command Line (for verification)
```bash
# Search for remaining CommissionFlow references
grep -r "CommissionFlow" src/

# Search for commission in user-facing text (may have false positives)
grep -ri "commission" src/ | grep -v "node_modules"
```

---

## Notes

- **Be selective with "commission" replacements** - Some might be in comments or internal logic that's okay to change later
- **Manual review required** - Don't blindly replace, especially for entity names
- **Prioritize user-facing text** - Text users see should be updated first
- **Internal code** - Can be refactored in later phases

---

## Next Steps After Phase 1

Once Phase 1 is complete and verified:
1. Commit changes: "Phase 1: Global renaming and branding update"
2. Move to [Phase 2: Database Schema Changes](./PHASE_2_CHECKLIST.md)
