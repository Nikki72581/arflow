# CommissionFlow - Step 2: Clients & Projects Management UI

## Summary

Step 2 builds your first fully functional feature - client and project management with complete CRUD operations through a polished UI.

**What was built:**
- ✅ Project server actions (CRUD operations)
- ✅ Project validation schemas
- ✅ Client list page with search and table
- ✅ Client detail page showing projects
- ✅ Project list page with search
- ✅ Create/edit forms in dialogs
- ✅ Action menus with edit/delete
- ✅ Empty states
- ✅ Loading states

---

## Files Created

### **Server Actions & Validation**
```
lib/validations/
└── project.ts                # Zod schemas for project validation

app/actions/
└── projects.ts               # Project CRUD server actions
```

### **UI Components**
```
components/
├── ui/
│   └── empty-state.tsx       # Reusable empty state component
├── clients/
│   ├── client-form-dialog.tsx    # Create/edit client dialog
│   └── client-actions.tsx        # Table row actions (edit/delete)
└── projects/
    ├── project-form-dialog.tsx   # Create/edit project dialog
    └── project-actions.tsx       # Table row actions (edit/delete)
```

### **Pages**
```
app/dashboard/
├── clients/
│   ├── page.tsx              # Client list with table
│   └── [id]/
│       └── page.tsx          # Client detail page
└── projects/
    └── page.tsx              # Project list with table
```

---

## Installation Steps

### 1. Copy Files to Your Project

Copy all the new files to your CommissionFlow project:

```bash
# In your commissionflow directory

# Copy validation schema
cp lib/validations/project.ts [your-project]/lib/validations/

# Copy actions
cp app/actions/projects.ts [your-project]/app/actions/

# Copy UI components
cp -r components/* [your-project]/components/

# Copy pages
cp -r app/dashboard/clients [your-project]/app/dashboard/
cp -r app/dashboard/projects [your-project]/app/dashboard/
```

### 2. Make Sure You Have Required shadcn/ui Components

If you haven't already installed all shadcn/ui components, run:

```bash
npx shadcn-ui@latest add button card input label table badge dialog form select textarea separator dropdown-menu alert-dialog
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test the Features

Visit these URLs to test:
- **Clients list:** http://localhost:3000/dashboard/clients
- **Projects list:** http://localhost:3000/dashboard/projects

---

## Features Built

### **Client Management**

#### 1. Client List (`/dashboard/clients`)
- View all clients in a sortable table
- Search clients by name or email
- Create new clients with "New Client" button
- Edit/delete clients via action menu (⋯ button)
- See project count per client
- Empty state when no clients exist

#### 2. Client Detail (`/dashboard/clients/[id]`)
- View complete client information
  - Contact details (email, phone, address)
  - Notes
  - Creation date
- See all projects for this client
- Create new projects for this client
- Edit/delete projects
- Empty state when client has no projects

#### 3. Client Form Dialog
- Create new clients
- Edit existing clients
- Validation:
  - Name is required
  - Email must be valid format
  - All other fields optional
- Proper error handling
- Loading states

### **Project Management**

#### 1. Project List (`/dashboard/projects`)
- View all projects in a sortable table
- Search projects by name, client, or description
- See associated client for each project
- Status badges (Active, Completed, Cancelled)
- Commission plan count
- Transaction count
- Create new projects with "New Project" button
- Edit/delete projects via action menu
- Empty state when no projects exist

#### 2. Project Form Dialog
- Create new projects
- Edit existing projects
- Features:
  - Select client from dropdown
  - Add description
  - Set start/end dates
  - Choose status
  - Validation ensures client is selected
- Proper error handling
- Loading states

---

## How to Use

### **Creating a Client**

1. Go to `/dashboard/clients`
2. Click "New Client" button
3. Fill in the form:
   - Name (required)
   - Email, Phone, Address (optional)
   - Notes (optional)
4. Click "Create Client"
5. Client appears in the list

### **Creating a Project**

**Option A: From Clients Page**
1. Go to client detail page
2. Click "New Project" in the Projects section
3. Client is pre-selected
4. Fill in project details
5. Click "Create Project"

**Option B: From Projects Page**
1. Go to `/dashboard/projects`
2. Click "New Project" button
3. Select a client
4. Fill in project details
5. Click "Create Project"

### **Editing**

1. Click the ⋯ (three dots) menu on any row
2. Select "Edit"
3. Modify the information
4. Click "Save Changes"

### **Deleting**

1. Click the ⋯ menu on any row
2. Select "Delete"
3. Confirm in the dialog
4. Item is deleted

**Note:** You cannot delete:
- Clients with projects
- Projects with sales transactions

### **Searching**

1. Use the search bar at the top of list pages
2. Type client/project name
3. Results filter automatically

---

## Code Highlights

### **Type-Safe Server Actions**

All operations are fully typed:

```typescript
import { createProject } from '@/app/actions/projects'

const result = await createProject({
  name: 'Website Redesign',
  clientId: 'abc123',
  description: 'Complete site overhaul',
  status: 'active',
})

if (result.success) {
  console.log(result.data) // Fully typed project
}
```

### **Automatic Revalidation**

After any mutation, Next.js automatically refreshes the data:

```typescript
// In server action
await prisma.project.create({ ... })

// Revalidate affected pages
revalidatePath('/dashboard/projects')
revalidatePath('/dashboard/clients')
```

No need for manual state management or cache invalidation!

### **Organization Scoping**

All queries are automatically scoped to the user's organization:

```typescript
async function getOrganizationId() {
  const { userId } = await auth()
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })
  return user.organizationId
}

// Used in every query
const projects = await prisma.project.findMany({
  where: { organizationId },  // ← Automatic multi-tenant isolation
})
```

### **Error Handling**

Consistent error handling throughout:

```typescript
try {
  const result = await createClient(data)
  if (!result.success) {
    setError(result.error)  // Show to user
  }
} catch (err) {
  setError('An unexpected error occurred')
}
```

---

## Component Architecture

### **Dialog Pattern**

All forms use a consistent dialog pattern:

```typescript
<ClientFormDialog />  {/* Creates new client */}

<ClientFormDialog client={existingClient} />  {/* Edits client */}

<ClientFormDialog 
  trigger={<Button>Custom Button</Button>}  {/* Custom trigger */}
/>
```

The dialog manages its own open/close state internally.

### **Action Menu Pattern**

Row actions use a dropdown menu:

```typescript
<DropdownMenu>
  <DropdownMenuTrigger>⋯</DropdownMenuTrigger>
  <DropdownMenuContent>
    <ClientFormDialog 
      client={client}
      trigger={<DropdownMenuItem>Edit</DropdownMenuItem>}
    />
    <DropdownMenuItem onClick={handleDelete}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### **Empty States**

Consistent empty states throughout:

```typescript
<EmptyState
  icon={Users}
  title="No clients yet"
  description="Get started by adding your first client."
/>
```

---

## Next Steps

With Step 2 complete, you now have:
- ✅ Full client management
- ✅ Full project management
- ✅ Search functionality
- ✅ Edit/delete operations
- ✅ Proper validation
- ✅ Loading and empty states

**Ready for Step 3:** Build the Commission Plan Builder
- Define commission structures
- Add rules (percentage, flat, tiered)
- Attach plans to projects
- Preview calculations

---

## Troubleshooting

### "Cannot find module '@/components/ui/...'

Make sure you've installed the shadcn/ui components:
```bash
npx shadcn-ui@latest add [component-name]
```

### Forms Not Submitting

Check browser console for errors. Most common issues:
1. Missing required fields
2. Invalid email format
3. No client selected (for projects)

### Empty Tables Not Showing Data

1. Make sure you're signed in
2. Check that your user has an organization
3. Open browser console for errors
4. Verify database schema is pushed: `npx prisma db push`

### "Client not found" Error

This means the client doesn't belong to your organization. Make sure:
1. You're using the correct organization
2. The client was created through the UI (not manually in DB)

---

## What You Can Do Now

Try these workflows:

1. **Add 3-5 clients** with different information
2. **Create 2-3 projects per client**
3. **Search for clients** and projects
4. **Edit a client's** contact information
5. **Change a project's status** from active to completed
6. **Try to delete a client with projects** (should fail)
7. **Delete a project** (should succeed if no transactions)

---

## API Reference

### Client Actions

```typescript
import { 
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  getClientStats,
} from '@/app/actions/clients'
```

### Project Actions

```typescript
import { 
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getClientProjects,
} from '@/app/actions/projects'
```

---

## Next Steps

Proceed to [STEP-3-README.md](STEP-3-README.md) to build the Commission Plan Builder.
