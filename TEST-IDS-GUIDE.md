# Test ID Implementation Guide

This guide lists the `data-testid` attributes that need to be added to components for E2E tests to work properly.

## Why Test IDs?

Test IDs provide stable, semantic selectors for E2E tests that won't break when styling or structure changes. They make tests more reliable and maintainable.

## Naming Convention

Use descriptive, hierarchical naming:
- `{feature}-{element}-{action/type}`
- Examples: `plan-name-input`, `submit-client-button`, `delete-project-button`

## Commission Plans

### Plans List Page (`/dashboard/plans`)

```tsx
// New Plan Button
<button data-testid="new-plan-button">New Plan</button>

// Plan Rows
<tr data-testid="plan-row">
  <td data-testid="plan-name">{plan.name}</td>
  <button data-testid="edit-plan-button">Edit</button>
  <button data-testid="delete-plan-button">Delete</button>
</tr>

// Empty State
<div data-testid="empty-state">
  <p data-testid="empty-state-message">No commission plans found</p>
</div>
```

### Plan Form Dialog

```tsx
// Dialog Container
<Dialog data-testid="plan-form-dialog">
  // Plan Name Input
  <input data-testid="plan-name-input" name="name" />
  <span data-testid="plan-name-error">{error}</span>

  // Plan Description
  <textarea data-testid="plan-description-input" name="description" />

  // Add Rule Button
  <button data-testid="add-rule-button">Add Rule</button>

  // Rule Type Select (for first rule, use -0, -1 for subsequent rules)
  <select data-testid="rule-type-select">
    <option data-testid="rule-type-percentage">Percentage</option>
    <option data-testid="rule-type-flat">Flat Amount</option>
    <option data-testid="rule-type-tiered">Tiered</option>
  </select>

  // For multiple rules:
  <select data-testid="rule-type-select-0">...</select>
  <select data-testid="rule-type-select-1">...</select>

  // Rule Value Input
  <input data-testid="rule-value-input" />
  <input data-testid="rule-value-input-0" /> // For multiple rules
  <span data-testid="rule-value-error">{error}</span>

  // Min/Max Caps
  <input data-testid="rule-min-amount-input" />
  <input data-testid="rule-max-amount-input" />
  <span data-testid="cap-validation-error">{error}</span>

  // Tiered Rules
  <button data-testid="add-tier-button">Add Tier</button>
  <input data-testid="tier-0-threshold" />
  <input data-testid="tier-0-rate" />
  <input data-testid="tier-1-threshold" />
  <input data-testid="tier-1-rate" />

  // Submit Button
  <button data-testid="submit-plan-button">Save Plan</button>

  // Validation Errors
  <span data-testid="rules-error">{error}</span>
</Dialog>

// Success Message
<div data-testid="success-message">Plan created successfully</div>
```

### Commission Preview Calculator

```tsx
// Preview Container
<div data-testid="commission-preview">
  // Sale Amount Input
  <input data-testid="preview-sale-amount" />

  // Commission Result
  <div data-testid="preview-commission-result">$1,000</div>

  // Cap Indicator
  <span data-testid="preview-cap-indicator">Capped at maximum</span>

  // Tier Breakdown
  <div data-testid="tier-breakdown">
    <div data-testid="tier-0-calculation">Tier 1: $500</div>
    <div data-testid="tier-1-calculation">Tier 2: $350</div>
  </div>
</div>
```

### Delete Confirmation Dialog

```tsx
<Dialog data-testid="confirm-delete-dialog">
  <p data-testid="confirm-delete-message">Are you sure you want to delete this plan?</p>
  <button data-testid="confirm-delete-button">Delete</button>
  <button data-testid="cancel-delete-button">Cancel</button>
</Dialog>
```

## Clients

### Clients List Page (`/dashboard/clients`)

```tsx
// New Client Button
<button data-testid="new-client-button">New Client</button>

// Search and Filters
<input data-testid="client-search-input" placeholder="Search clients..." />
<select data-testid="tier-filter-select">
  <option data-testid="tier-filter-standard">Standard</option>
  <option data-testid="tier-filter-vip">VIP</option>
  <option data-testid="tier-filter-enterprise">Enterprise</option>
  <option data-testid="tier-filter-new">New</option>
</select>
<select data-testid="status-filter-select">
  <option data-testid="status-filter-active">Active</option>
  <option data-testid="status-filter-inactive">Inactive</option>
</select>

// Client Rows
<tr data-testid="client-row">
  <td data-testid="client-name">{client.name}</td>
  <td><span data-testid="client-tier-badge">{client.tier}</span></td>
  <td><span data-testid="client-status-badge">{client.status}</span></td>
  <button data-testid="edit-client-button">Edit</button>
  <button data-testid="delete-client-button">Delete</button>
  <button data-testid="view-client-button">View</button>
</tr>

// Empty State
<div data-testid="empty-state">
  <p data-testid="empty-state-message">No clients found</p>
</div>
```

### Client Form Dialog

```tsx
<Dialog data-testid="client-form-dialog">
  // Name (required)
  <input data-testid="client-name-input" name="name" />
  <span data-testid="client-name-error">{error}</span>

  // Email
  <input data-testid="client-email-input" name="email" type="email" />
  <span data-testid="client-email-error">{error}</span>

  // Phone
  <input data-testid="client-phone-input" name="phone" />

  // Client Tier
  <select data-testid="client-tier-select">
    <option data-testid="client-tier-standard">Standard</option>
    <option data-testid="client-tier-vip">VIP</option>
    <option data-testid="client-tier-enterprise">Enterprise</option>
    <option data-testid="client-tier-new">New</option>
  </select>

  // Status
  <select data-testid="client-status-select">
    <option data-testid="client-status-active">Active</option>
    <option data-testid="client-status-inactive">Inactive</option>
  </select>

  // Address
  <input data-testid="client-address-input" name="address" />
  <input data-testid="client-city-input" name="city" />
  <input data-testid="client-state-input" name="state" />
  <input data-testid="client-zip-input" name="zip" />

  // Submit
  <button data-testid="submit-client-button">Save Client</button>
</Dialog>
```

### Client Detail Page

```tsx
// Client Projects Section
<section data-testid="client-projects-section">
  <h2>Projects</h2>
  <div data-testid="client-project-item">...</div>
</section>
```

## Projects

### Projects List Page (`/dashboard/projects`)

```tsx
// New Project Button
<button data-testid="new-project-button">New Project</button>

// Search and Filters
<input data-testid="project-search-input" placeholder="Search projects..." />
<select data-testid="client-filter-select">
  <option data-testid="client-filter-option">Client Name</option>
</select>
<select data-testid="status-filter-select">
  <option data-testid="status-filter-active">Active</option>
  <option data-testid="status-filter-completed">Completed</option>
</select>

// Project Rows
<tr data-testid="project-row">
  <td data-testid="project-name">{project.name}</td>
  <td><span data-testid="project-status-badge">{project.status}</span></td>
  <td><a data-testid="project-client-link" href={...}>{client.name}</a></td>
  <button data-testid="edit-project-button">Edit</button>
  <button data-testid="delete-project-button">Delete</button>
  <button data-testid="view-project-button">View</button>
</tr>

// Empty State
<div data-testid="empty-state">
  <p data-testid="empty-state-message">No projects found</p>
</div>
```

### Project Form Dialog

```tsx
<Dialog data-testid="project-form-dialog">
  // Name (required)
  <input data-testid="project-name-input" name="name" />
  <span data-testid="project-name-error">{error}</span>

  // Description
  <textarea data-testid="project-description-input" name="description" />

  // Client Select (required)
  <select data-testid="project-client-select">
    <option data-testid="client-option">Client Name</option>
  </select>
  <span data-testid="project-client-error">{error}</span>

  // Budget
  <input data-testid="project-budget-input" name="budget" type="number" />
  <span data-testid="project-budget-error">{error}</span>

  // Dates
  <input data-testid="project-start-date" name="startDate" type="date" />
  <input data-testid="project-end-date" name="endDate" type="date" />
  <span data-testid="project-date-error">{error}</span>

  // Status
  <select data-testid="project-status-select">
    <option data-testid="project-status-planning">Planning</option>
    <option data-testid="project-status-in-progress">In Progress</option>
    <option data-testid="project-status-completed">Completed</option>
  </select>

  // Submit
  <button data-testid="submit-project-button">Save Project</button>
</Dialog>
```

### Project Detail Page

```tsx
// Project Client Info
<div data-testid="project-client-info">
  <span data-testid="project-client-name">{client.name}</span>
</div>
```

## Authentication

### Sign-In Form

```tsx
// Clerk sign-in form (built-in component may need custom wrapper)
<div data-testid="sign-in-form">
  {/* Clerk's built-in form */}
</div>
```

### User Menu/Button

```tsx
// User menu button in navbar
<button data-testid="user-button">
  {user.name}
</button>
```

## Implementation Checklist

### Priority 1 - Critical for E2E Tests

- [ ] Commission Plans form dialog and inputs
- [ ] Clients form dialog and inputs
- [ ] Projects form dialog and inputs
- [ ] Delete confirmation dialogs
- [ ] Success/error messages
- [ ] Submit buttons

### Priority 2 - Important for Testing

- [ ] List page search inputs
- [ ] Filter selects
- [ ] Table rows and action buttons
- [ ] Empty states
- [ ] Validation error messages

### Priority 3 - Nice to Have

- [ ] Preview calculator elements
- [ ] Tier breakdown displays
- [ ] Badge components
- [ ] Navigation links

## Implementation Example

### Before (without test IDs):

```tsx
export function ClientFormDialog({ client, onSuccess }) {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'New Client'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" />
            {errors.name && <span>{errors.name}</span>}
          </div>
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### After (with test IDs):

```tsx
export function ClientFormDialog({ client, onSuccess }) {
  return (
    <Dialog>
      <DialogContent data-testid="client-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'New Client'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              data-testid="client-name-input"
            />
            {errors.name && (
              <span data-testid="client-name-error">
                {errors.name}
              </span>
            )}
          </div>
          <Button
            type="submit"
            data-testid="submit-client-button"
          >
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

## Tips

1. **Be Consistent**: Use the same naming pattern across all components
2. **Be Specific**: `submit-client-button` is better than `submit-button`
3. **Test Early**: Add test IDs as you build components, not after
4. **Document Changes**: Update this guide when adding new test IDs
5. **Review PR**: Check that new components include appropriate test IDs

## Next Steps

1. Start with Priority 1 components
2. Add test IDs incrementally
3. Run E2E tests to verify selectors work
4. Update tests if you change test ID names
5. Keep this guide updated

---

For questions about test IDs, refer to the [TESTING.md](./TESTING.md) guide.
