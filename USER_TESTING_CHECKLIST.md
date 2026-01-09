# CommissionFlow - User Testing Checklist

Use this checklist to systematically test all features of the CommissionFlow application. Check off each item as you complete it and note any issues or feedback.

---

## Pre-Testing Setup

- [ ] Received access to the test environment
- [ ] Successfully created an account
- [ ] Verified email address
- [ ] Completed initial onboarding
- [ ] Understand the purpose of the application

---

## 1. Authentication & Onboarding

### Sign Up / Sign In
- [ ] Create a new account with email and password
- [ ] Sign out and sign back in
- [ ] Verify password requirements work correctly
- [ ] Test "Forgot Password" flow (if available)

### Onboarding Wizard
- [ ] Enter organization name
- [ ] View all subscription plan options
- [ ] Select a subscription plan
- [ ] Choose user role (Admin or Salesperson)
- [ ] Complete onboarding and reach dashboard
- [ ] Verify organization details saved correctly

**Notes/Issues:**
```


```

---

## 2. Dashboard & Analytics

### Main Dashboard
- [ ] View dashboard after login
- [ ] See all metric cards (total sales, commissions, averages)
- [ ] View commission status breakdown (Pending, Approved, Paid)
- [ ] View activity statistics (plans, clients, salespeople counts)
- [ ] Check that charts load (commission trends, top performers)
- [ ] Change date range filter and verify data updates
- [ ] Export dashboard data to CSV
- [ ] Verify exported CSV contains correct data

**Notes/Issues:**
```


```

---

## 3. Settings & Configuration

### User Settings
- [ ] Navigate to Settings
- [ ] Update first name and last name
- [ ] Update email address (if editable)
- [ ] View account role and creation date
- [ ] Save changes successfully

### Theme Settings
- [ ] Switch to Light mode
- [ ] Switch to Dark mode
- [ ] Switch to System mode
- [ ] Verify theme persists after page refresh

### Notification Settings
- [ ] Toggle email notifications on/off
- [ ] Toggle sales alerts
- [ ] Toggle commission alerts
- [ ] Toggle weekly reports
- [ ] Save preferences

### Product Categories
- [ ] Navigate to Settings > Product Categories
- [ ] Create a new product category
- [ ] Edit an existing category
- [ ] Delete a category (verify confirmation)
- [ ] Create at least 3 categories for testing

**Categories Created:**
```


```

### Territories
- [ ] Navigate to Settings > Territories
- [ ] Create a new territory
- [ ] Edit an existing territory
- [ ] Delete a territory
- [ ] Create at least 2 territories for testing

**Territories Created:**
```


```

### Customer Tiers
- [ ] View available customer tiers (STANDARD, VIP, NEW, ENTERPRISE)
- [ ] Understand how tiers are used in commission rules

**Notes/Issues:**
```


```

---

## 4. Client Management

### Create Clients
- [ ] Navigate to Clients page
- [ ] Click "New Client"
- [ ] Fill in all required fields (name)
- [ ] Add optional fields (email, phone)
- [ ] Select a status (Active, Inactive, Prospective, Churned)
- [ ] Assign a territory
- [ ] Assign a customer tier
- [ ] Save the client
- [ ] Verify client appears in the list
- [ ] Create at least 5 test clients

**Test Clients Created:**
```


```

### Manage Clients
- [ ] View list of all clients
- [ ] Search for a specific client
- [ ] Filter clients by status
- [ ] Click on a client to view details
- [ ] Edit a client's information
- [ ] View projects associated with a client
- [ ] View sales associated with a client
- [ ] Delete a client (verify confirmation)

**Notes/Issues:**
```


```

---

## 5. Project Management

### Create Projects
- [ ] Navigate to Projects page
- [ ] Click "New Project"
- [ ] Enter project name
- [ ] Add description (optional)
- [ ] Select a client
- [ ] Set project status (Active, Completed, On Hold)
- [ ] Assign a commission plan (optional)
- [ ] Save the project
- [ ] Verify project appears in the list
- [ ] Create at least 3 test projects

**Test Projects Created:**
```


```

### Manage Projects
- [ ] View list of all projects
- [ ] Search for a specific project
- [ ] Filter by status or client
- [ ] Click on a project to view details
- [ ] Edit project information
- [ ] View associated sales transactions
- [ ] View associated commission plan
- [ ] Delete a project (verify confirmation)

**Notes/Issues:**
```


```

---

## 6. Commission Plans & Rules

### Create Commission Plans
- [ ] Navigate to Plans page
- [ ] Click "New Plan"
- [ ] Enter plan name and description
- [ ] Set status to Active
- [ ] Create a general plan (not project-specific)
- [ ] Create a project-specific plan
- [ ] Save the plan
- [ ] Create at least 2 commission plans

**Plans Created:**
```


```

### Add Commission Rules - Percentage Type
- [ ] Open a commission plan
- [ ] Click "Add Rule"
- [ ] Select "Percentage" as rule type
- [ ] Enter commission rate (e.g., 10%)
- [ ] Leave conditions blank (default rule)
- [ ] Save the rule
- [ ] Verify rule appears in the plan

### Add Commission Rules - Flat Rate Type
- [ ] Click "Add Rule"
- [ ] Select "Flat Rate" as rule type
- [ ] Enter a fixed commission amount (e.g., $500)
- [ ] Set a minimum sale amount condition (optional)
- [ ] Save the rule

### Add Commission Rules - Tiered Type
- [ ] Click "Add Rule"
- [ ] Select "Tiered" as rule type
- [ ] Add multiple tiers with different thresholds:
  - [ ] Tier 1: $0 - $5,000 at 5%
  - [ ] Tier 2: $5,001 - $10,000 at 8%
  - [ ] Tier 3: $10,001+ at 10%
- [ ] Save the rule

### Add Conditional Rules
- [ ] Create a rule for VIP customers only
- [ ] Create a rule for a specific product category
- [ ] Create a rule for a specific territory
- [ ] Create a rule with minimum/maximum sale amounts
- [ ] Test multiple conditions on one rule

### Manage Rules
- [ ] View all rules in a plan
- [ ] Edit an existing rule
- [ ] Delete a rule
- [ ] Verify rule priority/order
- [ ] Activate/deactivate a plan
- [ ] Delete a commission plan

**Notes/Issues:**
```


```

---

## 7. Sales Transactions

### Manual Sale Entry
- [ ] Navigate to Sales page
- [ ] Click "New Sale"
- [ ] Enter sale amount
- [ ] Select date
- [ ] Choose transaction type (Sale)
- [ ] Select a project
- [ ] Select a client (auto-filled from project)
- [ ] Select a salesperson
- [ ] Choose a product category
- [ ] Add invoice number (optional)
- [ ] Add description (optional)
- [ ] Save the sale
- [ ] Verify sale appears in the list
- [ ] Verify commission was automatically calculated
- [ ] Create at least 10 sales with varying amounts

### Sales Entry - Different Types
- [ ] Create a "Return" transaction (negative impact)
- [ ] Create an "Adjustment" transaction
- [ ] Test with very small amounts (e.g., $10)
- [ ] Test with very large amounts (e.g., $100,000)
- [ ] Test with $0 amount

### CSV Import
- [ ] Click "Import from CSV"
- [ ] Download the sample CSV template
- [ ] Fill template with 10-20 rows of test data
- [ ] Upload the completed CSV
- [ ] Map columns to correct fields
- [ ] Review the import preview
- [ ] Verify validation errors (if any)
- [ ] Confirm and complete import
- [ ] Verify all imported sales appear correctly
- [ ] Verify commissions calculated for imported sales

### Manage Sales
- [ ] View list of all sales
- [ ] Search for a specific sale
- [ ] Filter by date range
- [ ] Filter by project, client, or salesperson
- [ ] Filter by product category
- [ ] Sort by amount, date, or salesperson
- [ ] Click on a sale to view details
- [ ] Edit a sale and verify commission recalculates
- [ ] Delete a sale (verify confirmation)

**Notes/Issues:**
```


```

---

## 8. Commission Management

### View Commissions
- [ ] Navigate to Commissions page
- [ ] View all calculated commissions
- [ ] See commission amounts
- [ ] See associated sales, salespeople, and rules
- [ ] View commission status (Pending, Approved, Paid)
- [ ] Filter by status
- [ ] Filter by salesperson
- [ ] Filter by date range
- [ ] Search commissions

### Review Commission Details
- [ ] Click on a commission to view details
- [ ] Verify sale information is correct
- [ ] Verify commission amount matches expected calculation
- [ ] Check which rule was applied
- [ ] View salesperson information

### Commission Approval (Admin Only)
- [ ] Find a Pending commission
- [ ] Approve the commission
- [ ] Verify status changes to Approved
- [ ] Try to approve an already approved commission

### Bulk Payouts (Admin Only)
- [ ] Navigate to Commissions > Payouts
- [ ] Select multiple Approved commissions
- [ ] Click "Process Payout"
- [ ] Review payout summary
- [ ] Confirm payout
- [ ] Verify commissions marked as Paid
- [ ] Check if email notifications sent (if enabled)

### Payout History (Admin Only)
- [ ] Navigate to Commissions > Payout History
- [ ] View all completed payouts
- [ ] Filter by date range
- [ ] Click on a payout to view details
- [ ] Export payout history to CSV

**Notes/Issues:**
```


```

---

## 9. Team Management (Admin Only)

### View Team
- [ ] Navigate to Team page
- [ ] View all team members
- [ ] See member roles (Admin/Salesperson)
- [ ] View commission statistics per member
- [ ] View pending invitations (if any)

### Invite Team Members
- [ ] Click "Invite Member"
- [ ] Enter email address for new member
- [ ] Select role (Salesperson or Admin)
- [ ] Send invitation
- [ ] Verify invitation appears in pending invitations
- [ ] Check email was sent (if accessible)

### Manage Team Members
- [ ] Edit a team member's role
- [ ] Assign an employee ID to a member
- [ ] Assign a salesperson ID
- [ ] View a member's commission history
- [ ] Remove a team member (if applicable)

**Test Team Members Invited:**
```


```

**Notes/Issues:**
```


```

---

## 10. Reports & Analytics

### Access Reports
- [ ] Navigate to Reports page
- [ ] View available report types
- [ ] See visualizations load

### Sales by Product Category Report
- [ ] View pie or bar chart of sales by category
- [ ] Verify data matches actual sales
- [ ] Change date range and verify update
- [ ] Export report to CSV

### Performance Comparison Report
- [ ] View salesperson performance comparison
- [ ] Check data accuracy
- [ ] Use filters to adjust view

### Top Performers Report
- [ ] View top performers leaderboard
- [ ] Verify rankings are correct
- [ ] Check metrics displayed (sales, commissions, etc.)

### Commission Status Breakdown
- [ ] View breakdown of Pending/Approved/Paid commissions
- [ ] Verify totals match Commission page

### Time-Based Trends
- [ ] View sales trends over time (line/bar charts)
- [ ] Adjust time period
- [ ] Verify data accuracy

**Notes/Issues:**
```


```

---

## 11. Search Functionality

### Global Search
- [ ] Navigate to Search page (or use search bar)
- [ ] Search for a client by name
- [ ] Search for a project by name
- [ ] Search for a sale by invoice number or description
- [ ] Search for a commission plan
- [ ] Search for a team member
- [ ] Click on a search result to navigate to details

**Notes/Issues:**
```


```

---

## 12. Audit Logs (Admin Only)

### View Audit Logs
- [ ] Navigate to Audit Logs (if available)
- [ ] View list of system actions
- [ ] See user who performed each action
- [ ] View timestamps
- [ ] Filter by date range
- [ ] Filter by action type
- [ ] Search logs

**Notes/Issues:**
```


```

---

## 13. Help & Documentation

### Access Help
- [ ] Navigate to Help page
- [ ] Read through setup guide
- [ ] Review commission plan examples
- [ ] Check feature explanations
- [ ] Review FAQ section
- [ ] Verify all links work

**Notes/Issues:**
```


```

---

## 14. Demo Data Generator (Admin Only)

### Generate Demo Data
- [ ] Navigate to Settings > Demo Data
- [ ] Click "Generate Full Dataset"
- [ ] Wait for data generation to complete
- [ ] Verify clients were created (check Clients page)
- [ ] Verify projects were created (check Projects page)
- [ ] Verify sales were created (check Sales page)
- [ ] Verify commissions were calculated
- [ ] Explore the generated data throughout the app

### Clear Demo Data
- [ ] Click "Clear All Demo Data"
- [ ] Confirm deletion
- [ ] Verify demo data is removed
- [ ] Check that manually created data remains

**Notes/Issues:**
```


```

---

## 15. Multi-User Testing (If Possible)

### Test as Salesperson
If you can create or access a Salesperson account:

- [ ] Sign in as a Salesperson user
- [ ] Verify limited access (no Team, Payouts, etc.)
- [ ] Navigate to My Commissions
- [ ] View personal commission dashboard
- [ ] View own sales history
- [ ] Check commission earnings
- [ ] Verify cannot access admin features
- [ ] Update personal settings
- [ ] Sign out

**Notes/Issues:**
```


```

---

## 16. Edge Cases & Error Handling

### Test Error Scenarios
- [ ] Try to create a client without a name
- [ ] Try to create a sale with invalid amount (letters, negative)
- [ ] Try to delete a client with associated projects
- [ ] Try to delete a project with associated sales
- [ ] Try to create a commission rule with no rate/amount
- [ ] Upload an invalid CSV file
- [ ] Upload a CSV with missing required fields
- [ ] Test with extremely long text inputs
- [ ] Test with special characters in names

### Test Validations
- [ ] Verify required fields are marked
- [ ] Verify error messages are clear
- [ ] Verify success messages appear
- [ ] Test form validation before submission

**Notes/Issues:**
```


```

---

## 17. User Experience & Interface

### General Usability
- [ ] Navigation is intuitive and easy to find
- [ ] Buttons and actions are clearly labeled
- [ ] Forms are easy to understand and fill out
- [ ] Error messages are helpful
- [ ] Success confirmations are visible
- [ ] Loading states appear for async operations
- [ ] No broken images or missing elements

### Responsive Design (if applicable)
- [ ] Test on desktop browser
- [ ] Test on tablet (if available)
- [ ] Test on mobile phone (if available)
- [ ] Verify layout adjusts appropriately
- [ ] Verify all features accessible on smaller screens

### Visual Design
- [ ] Layout is clean and organized
- [ ] Colors are consistent
- [ ] Text is readable
- [ ] Spacing is appropriate
- [ ] Charts and graphs are clear

**Notes/Issues:**
```


```

---

## 18. Performance & Speed

### Page Load Times
- [ ] Dashboard loads quickly
- [ ] Sales list loads quickly (with many transactions)
- [ ] Commissions list loads quickly
- [ ] Charts render without delay
- [ ] Forms submit and respond quickly

### Data Operations
- [ ] CSV import completes in reasonable time
- [ ] Bulk payout processes quickly
- [ ] Search returns results quickly
- [ ] Filtering updates view without delay

**Notes/Issues:**
```


```

---

## 19. Data Accuracy & Calculations

### Verify Commission Calculations
Create specific test scenarios and verify calculations:

#### Test Case 1: Simple Percentage
- [ ] Create 10% commission rule
- [ ] Create $1,000 sale
- [ ] Verify commission = $100

#### Test Case 2: VIP Customer Rule
- [ ] Create 15% rule for VIP customers
- [ ] Create client with VIP tier
- [ ] Create $1,000 sale to VIP client
- [ ] Verify commission = $150 (not $100)

#### Test Case 3: Tiered Commission
- [ ] Create tiered rule (5% up to $5K, 10% above $5K)
- [ ] Create $8,000 sale
- [ ] Verify commission = ($5,000 × 5%) + ($3,000 × 10%) = $550

#### Test Case 4: Flat Rate
- [ ] Create $500 flat rate rule
- [ ] Create sales of $1,000, $5,000, $10,000
- [ ] Verify each earns exactly $500 commission

#### Test Case 5: Multiple Rules Priority
- [ ] Create default 10% rule
- [ ] Create 15% rule for specific product category
- [ ] Create sale in that category
- [ ] Verify 15% rule applies (higher priority)

**Calculation Results:**
```


```

---

## 20. Feedback & Overall Assessment

### What Worked Well
```




```

### Issues Encountered
```




```

### Confusing or Unclear Features
```




```

### Missing Features or Suggestions
```




```

### Bugs or Errors Found
```




```

### Overall Experience Rating
- [ ] Excellent
- [ ] Good
- [ ] Fair
- [ ] Needs Improvement

### Would you recommend this application?
- [ ] Yes
- [ ] Maybe
- [ ] No

**Final Comments:**
```




```

---

## Testing Complete!

Thank you for thoroughly testing CommissionFlow. Please save this completed checklist and share it with the development team along with any screenshots of issues you encountered.

**Tester Name:** _______________________

**Date Completed:** _______________________

**Time Spent Testing:** _______________________
