# CommissionFlow - Getting Started Guide for Testers

Welcome to CommissionFlow! This guide will walk you through the initial setup and help you understand how to use the application.

## What is CommissionFlow?

CommissionFlow is a commission management application designed to automate and streamline the calculation, tracking, and payment of sales commissions. It helps organizations manage their sales teams, track performance, and ensure accurate commission payments.

---

## Initial Setup (15 minutes)

### Step 1: Create Your Account

1. Open CommissionFlow in your web browser
2. Click **Sign Up** to create a new account
3. Enter your email address and create a secure password
4. You'll receive a verification email - click the link to verify your account
5. Once verified, sign in with your credentials

### Step 2: Complete the Onboarding Wizard

After signing in for the first time, you'll be guided through a setup wizard:

#### A. Enter Your Organization Name
- Type the name of your company or team
- This can be a real company name or a test name like "Test Company Inc."
- Click **Continue**

#### B. Select Your Subscription Plan
Choose from the available plan tiers:
- **Starter** ($29/mo): Up to 5 salespeople
- **Growth** ($79/mo): Up to 20 salespeople, includes AI features
- **Professional** ($149/mo): Up to 50 salespeople
- **Enterprise**: Custom pricing for unlimited users

*For testing purposes, select any plan - the features are available regardless of plan selection.*

#### C. Choose Your Role
- **Admin**: Full access to all features, manage team and commissions
- **Salesperson**: Limited access to view personal commissions and sales

*For comprehensive testing, choose **Admin** to access all features.*

Click **Complete Setup** when finished.

### Step 3: Explore the Dashboard

You'll be redirected to your main dashboard. Take a moment to familiarize yourself with the layout:

- **Sidebar Navigation** (left): Access all main features
- **Dashboard** (center): Overview of key metrics and charts
- **User Menu** (top right): Access settings and account options

---

## Understanding the Main Features

### Navigation Overview

The sidebar contains all the main sections of the application:

- **Dashboard**: Overview and analytics
- **Sales**: Manage sales transactions
- **Commissions**: View and manage commission calculations
- **Plans**: Create and manage commission plans
- **Clients**: Manage customer information
- **Projects**: Manage sales projects
- **Team**: Manage team members (Admin only)
- **Reports**: View detailed analytics
- **Settings**: Configure application preferences

---

## Quick Start: Set Up Your First Commission System

Follow these steps to set up a basic commission system and test the core functionality:

### Step 1: Create a Product Category (5 minutes)

Product categories help you organize your sales and create category-specific commission rules.

1. Click **Settings** in the sidebar
2. Click **Product Categories** from the settings menu
3. Click **Add Category**
4. Enter a category name (e.g., "Software Licenses")
5. Click **Save**
6. Create 2-3 more categories (e.g., "Consulting Services", "Hardware")

### Step 2: Create a Territory (Optional, 3 minutes)

Territories allow you to organize clients by region and create location-specific commission rules.

1. In **Settings**, click **Territories**
2. Click **Add Territory**
3. Enter a territory name (e.g., "West Coast", "Northeast")
4. Click **Save**

### Step 3: Add Clients (5 minutes)

Clients are the customers your sales team sells to.

1. Click **Clients** in the sidebar
2. Click **New Client**
3. Fill in the client information:
   - **Name**: Client or company name (e.g., "Acme Corporation")
   - **Email**: Contact email (optional)
   - **Phone**: Contact phone (optional)
   - **Status**: Choose Active, Inactive, Prospective, or Churned
   - **Territory**: Select a territory if you created one
4. Click **Create Client**
5. Create 3-5 test clients to work with

### Step 4: Create Projects (5 minutes)

Projects represent specific sales initiatives or deals.

1. Click **Projects** in the sidebar
2. Click **New Project**
3. Fill in the project details:
   - **Name**: Project name (e.g., "Q1 Enterprise Sale")
   - **Description**: Brief description (optional)
   - **Client**: Select one of the clients you created
   - **Status**: Choose Active, Completed, or On Hold
4. Click **Create Project**
5. Create 2-3 test projects

### Step 5: Create Your First Commission Plan (10 minutes)

Commission plans define how salespeople earn commissions. This is the core of the system.

1. Click **Plans** in the sidebar
2. Click **New Plan**
3. Enter plan details:
   - **Plan Name**: Give it a descriptive name (e.g., "Standard Sales Commission")
   - **Description**: Explain what this plan is for (optional)
   - **Status**: Set to Active
   - **Project**: Leave blank for a general plan, or select a specific project
4. Click **Create Plan**

### Step 6: Add Commission Rules to Your Plan (10 minutes)

Rules determine the actual commission amounts. You can have multiple rules with different conditions.

#### Example Rule 1: Basic Percentage Commission
1. On your commission plan page, click **Add Rule**
2. Select **Rule Type**: Percentage
3. Enter **Commission Rate**: 10 (for 10%)
4. Leave conditions blank for now (this creates a default rule)
5. Click **Save Rule**

#### Example Rule 2: Higher Rate for VIP Customers
1. Click **Add Rule** again
2. Select **Rule Type**: Percentage
3. Enter **Commission Rate**: 15 (for 15%)
4. Under **Customer Tier**, select **VIP**
5. Click **Save Rule**

This rule will pay 15% commission on sales to VIP customers, while all other sales get 10%.

#### Example Rule 3: Tiered Commission (Optional)
1. Click **Add Rule** again
2. Select **Rule Type**: Tiered
3. Add tier thresholds:
   - **$0 - $5,000**: 5% commission
   - **$5,001 - $10,000**: 8% commission
   - **$10,001+**: 10% commission
4. Click **Save Rule**

### Step 7: Add Team Members (Optional, 5 minutes)

If you want to test the multi-user functionality:

1. Click **Team** in the sidebar
2. Click **Invite Member**
3. Enter an email address (use a different email than your main account)
4. Select **Role**: Salesperson or Admin
5. Click **Send Invitation**

The invited user will receive an email to join your organization.

### Step 8: Record Sales Transactions (10 minutes)

Now let's record some sales and see commissions automatically calculated.

#### Manual Entry:
1. Click **Sales** in the sidebar
2. Click **New Sale**
3. Fill in the transaction details:
   - **Amount**: Enter a sale amount (e.g., $5,000)
   - **Date**: Select today's date
   - **Transaction Type**: Sale
   - **Project**: Select one of your projects
   - **Client**: Select the client associated with that project
   - **Salesperson**: Select yourself (or a team member)
   - **Product Category**: Select a category
   - **Invoice Number**: Enter any number (optional)
   - **Description**: Brief description (optional)
4. Click **Create Sale**

The system will automatically calculate the commission based on your rules!

5. Create 5-10 more sales with varying amounts, projects, and categories

#### CSV Import (Alternative):
1. On the Sales page, click **Import from CSV**
2. Download the sample CSV template
3. Fill it with test data
4. Upload the completed CSV
5. Map the columns to the correct fields
6. Review the preview
7. Click **Import**

### Step 9: Review Calculated Commissions (5 minutes)

1. Click **Commissions** in the sidebar
2. You'll see all calculated commissions from your sales
3. Review the details:
   - **Amount**: The commission earned
   - **Status**: Pending, Approved, or Paid
   - **Rule Applied**: Which commission rule was used
   - **Sale Details**: The original transaction

### Step 10: Approve and Pay Commissions (Admin, 5 minutes)

As an admin, you can approve and mark commissions as paid:

1. On the Commissions page, find a **Pending** commission
2. Click on it to view details
3. Click **Approve** to approve the commission
4. For bulk approvals, click **Payouts** in the sidebar
5. Select multiple approved commissions
6. Click **Process Payout**
7. Confirm the payout

Commissions will be marked as **Paid** and logged in the payout history.

---

## Exploring Additional Features

### View Dashboard Analytics

1. Click **Dashboard** in the sidebar
2. Explore the metrics cards showing:
   - Total sales and commissions
   - Average commission rate
   - Breakdown by status (Pending, Approved, Paid)
3. Use the date range picker to filter data
4. Export data to CSV using the Export button

### Generate Reports

1. Click **Reports** in the sidebar
2. View various charts and graphs:
   - Sales by product category
   - Performance comparison by salesperson
   - Top performers
   - Commission status breakdown
3. Use filters to adjust the data displayed

### Search Functionality

1. Click **Search** in the sidebar (or use the search bar)
2. Search for clients, projects, sales, plans, or team members
3. Click on results to navigate directly to details

### User Settings

1. Click your user icon in the top right
2. Select **Settings**
3. Update your profile information
4. Change theme (Light, Dark, System)
5. Configure notification preferences
6. View and manage product categories and territories

### Generate Demo Data (Optional)

If you want to quickly populate the system with realistic test data:

1. Navigate to **Settings** > **Demo Data** (Admin only)
2. Click **Generate Full Dataset**
3. The system will create:
   - 20 sample clients
   - 30 sample projects
   - 50 sample sales transactions
4. Explore the populated data throughout the application

*You can clear demo data at any time using the **Clear All Demo Data** button.*

---

## Understanding User Roles

### Admin Users Can:
- Create and manage commission plans
- Approve and process commission payouts
- Invite and manage team members
- Access all clients, projects, and sales
- View system-wide analytics and reports
- Configure organization settings
- Access audit logs

### Salesperson Users Can:
- View their own commissions (My Commissions page)
- See their personal sales history
- Track their performance and earnings
- Update their profile and notification settings
- Cannot access team management or payout features

---

## Tips for Testing

1. **Start Simple**: Begin with one commission plan and a few sales before adding complexity
2. **Test Different Scenarios**: Try different transaction amounts, product categories, and customer tiers
3. **Use Realistic Data**: Use company and client names that feel real for better testing experience
4. **Try Both Roles**: Test as both Admin and Salesperson to see different perspectives
5. **Test Edge Cases**: Try $0 sales, negative amounts (returns), very large numbers
6. **Experiment with Rules**: Create multiple rules with different conditions to see which takes priority
7. **Check Calculations**: Verify that commission amounts match your expectations
8. **Test Filters**: Use search and filter features throughout the app
9. **Try Bulk Operations**: Import CSV data, process batch payouts
10. **Explore Mobile**: If possible, test on different screen sizes

---

## Common Questions

### Q: Can I delete test data?
**A:** Yes, you can delete individual clients, projects, sales, and plans. If you used the demo data generator, you can clear all demo data at once.

### Q: What happens if I create a sale without selecting a project?
**A:** It depends on your organization settings. By default, projects are optional. You can require projects in Settings > Organization Settings.

### Q: Which commission rule applies if I have multiple rules?
**A:** Rules are evaluated in priority order:
1. Project-specific rules (highest priority)
2. Customer-specific rules
3. Product category rules
4. Territory rules
5. Customer tier rules
6. Default rules (lowest priority)

The first matching rule applies unless the plan is configured for multiple rules.

### Q: Can I edit a sale after it's created?
**A:** Yes, click on the sale in the Sales list and select Edit. Note that editing a sale will recalculate its associated commission.

### Q: How do I see commissions for just one salesperson?
**A:** Use the filter options on the Commissions page to filter by salesperson name.

### Q: Can I export data?
**A:** Yes, most data views have an Export to CSV button for downloading data.

---

## Need Help?

- Click **Help** in the sidebar for in-app documentation
- Review the step-by-step guides and examples
- Check the FAQ section for common questions

---

## What's NOT Included in This Test Version

The following feature is **not included** in this testing phase:

- **Acumatica Integration**: The ability to sync data with Acumatica ERP is not enabled for this test

All other features are fully functional and ready for testing.

---

## Ready to Test!

You're now ready to explore CommissionFlow! Use the testing checklist provided separately to guide your testing process and ensure you cover all the key features.

Happy testing! 🚀
