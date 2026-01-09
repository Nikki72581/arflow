# File Structure - After Step 2

## Complete Project Structure

```
commissionflow/
│
├── prisma/
│   └── schema.prisma                          # ✅ Step 1 - Database schema
│
├── lib/
│   ├── db.ts                                  # ✅ Step 1 - Prisma client
│   ├── utils.ts                               # ✅ Step 1 - Utility functions
│   ├── api-utils.ts                           # ✅ Step 1 - API error handling
│   ├── types.ts                               # ✅ Step 1 - TypeScript types
│   └── validations/
│       ├── client.ts                          # ✅ Step 1 - Client validation
│       └── project.ts                         # ✅ Step 2 - Project validation
│
├── app/
│   ├── actions/
│   │   ├── clients.ts                         # ✅ Step 1 - Client CRUD
│   │   └── projects.ts                        # ✅ Step 2 - Project CRUD
│   │
│   └── dashboard/
│       ├── clients/
│       │   ├── page.tsx                       # ✅ Step 2 - Client list
│       │   └── [id]/
│       │       └── page.tsx                   # ✅ Step 2 - Client detail
│       │
│       ├── projects/
│       │   └── page.tsx                       # ✅ Step 2 - Project list
│       │
│       ├── admin/
│       │   └── page.tsx                       # From earlier setup
│       │
│       └── salesperson/
│           └── page.tsx                       # From earlier setup
│
└── components/
    ├── ui/
    │   ├── button.tsx                         # shadcn/ui
    │   ├── card.tsx                           # shadcn/ui
    │   ├── input.tsx                          # shadcn/ui
    │   ├── label.tsx                          # shadcn/ui
    │   ├── table.tsx                          # shadcn/ui
    │   ├── badge.tsx                          # shadcn/ui
    │   ├── dialog.tsx                         # shadcn/ui
    │   ├── select.tsx                         # shadcn/ui
    │   ├── textarea.tsx                       # shadcn/ui
    │   ├── separator.tsx                      # shadcn/ui
    │   ├── dropdown-menu.tsx                  # shadcn/ui
    │   ├── alert-dialog.tsx                   # shadcn/ui
    │   └── empty-state.tsx                    # ✅ Step 2 - Custom component
    │
    ├── clients/
    │   ├── client-form-dialog.tsx             # ✅ Step 2 - Create/edit client
    │   └── client-actions.tsx                 # ✅ Step 2 - Table row actions
    │
    └── projects/
        ├── project-form-dialog.tsx            # ✅ Step 2 - Create/edit project
        └── project-actions.tsx                # ✅ Step 2 - Table row actions
```

---

## Where to Put Each File

### **Step 1 Files** (Already Done)

Copy these to your project root:

```bash
# Database schema
prisma/schema.prisma

# Library files
lib/db.ts
lib/utils.ts
lib/api-utils.ts
lib/types.ts
lib/validations/client.ts

# Server actions
app/actions/clients.ts
```

### **Step 2 Files** (New)

Copy these to your project:

```bash
# Validation
lib/validations/project.ts

# Server actions
app/actions/projects.ts

# UI Components
components/ui/empty-state.tsx
components/clients/client-form-dialog.tsx
components/clients/client-actions.tsx
components/projects/project-form-dialog.tsx
components/projects/project-actions.tsx

# Pages
app/dashboard/clients/page.tsx
app/dashboard/clients/[id]/page.tsx
app/dashboard/projects/page.tsx
```

---

## Routes Available

After Step 2, these routes work:

### **Public Routes**
- `/` - Landing page
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page

### **Authenticated Routes**
- `/dashboard` - Main dashboard (redirects based on role)
- `/dashboard/admin` - Admin dashboard
- `/dashboard/salesperson` - Salesperson dashboard
- `/dashboard/clients` - ✅ Client list (NEW)
- `/dashboard/clients/[id]` - ✅ Client detail (NEW)
- `/dashboard/projects` - ✅ Project list (NEW)

---

## Import Paths

All files use these import patterns:

```typescript
// Components
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'

// Actions
import { createClient, getClients } from '@/app/actions/clients'
import { createProject } from '@/app/actions/projects'

// Utils & Types
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client, Project } from '@/lib/types'

// Validation
import { createClientSchema } from '@/lib/validations/client'
import { createProjectSchema } from '@/lib/validations/project'
```

The `@/` alias maps to your project root.

---

## Dependencies Required

Make sure these are installed:

```json
{
  "dependencies": {
    "@prisma/client": "latest",
    "@clerk/nextjs": "latest",
    "next": "latest",
    "react": "latest",
    "zod": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "prisma": "latest",
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest"
  }
}
```

---

## What Each Directory Does

### **`/prisma`**
- Database schema and migrations
- Run `npx prisma generate` after changes

### **`/lib`**
- Shared utilities, types, validation
- Business logic that doesn't fit in components
- Database client configuration

### **`/app/actions`**
- Server-side functions (Server Actions)
- CRUD operations for all entities
- Type-safe, validated operations

### **`/app/dashboard`**
- All authenticated pages
- Uses Next.js App Router file structure
- `page.tsx` = route, `[id]` = dynamic route

### **`/components/ui`**
- Base UI components from shadcn/ui
- Reusable across the entire app
- Styled with Tailwind CSS

### **`/components/clients`**
- Client-specific components
- Forms, tables, actions

### **`/components/projects`**
- Project-specific components
- Forms, tables, actions

---

## Common File Patterns

### **Server Action Pattern**
```typescript
// app/actions/entity.ts
'use server'

export async function createEntity(data) {
  const organizationId = await getOrganizationId()
  const validated = schema.parse(data)
  const entity = await prisma.entity.create({ ... })
  revalidatePath('/dashboard/entities')
  return { success: true, data: entity }
}
```

### **Page Pattern**
```typescript
// app/dashboard/entities/page.tsx
export default async function EntitiesPage() {
  const result = await getEntities()
  return <div>...</div>
}
```

### **Form Dialog Pattern**
```typescript
// components/entities/entity-form-dialog.tsx
'use client'
export function EntityFormDialog({ entity, trigger }) {
  const [open, setOpen] = useState(false)
  // ... form logic
  return <Dialog>...</Dialog>
}
```

---

## Next: Step 3 Structure

Step 3 will add:

```
app/
└── dashboard/
    └── plans/
        ├── page.tsx              # Plan list
        └── [id]/
            └── page.tsx          # Plan builder

components/
└── plans/
    ├── plan-form-dialog.tsx
    ├── plan-builder.tsx
    ├── rule-form.tsx
    └── plan-preview.tsx

app/actions/
└── commission-plans.ts

lib/validations/
└── commission-plan.ts
```

## Next Steps

This file structure will be extended in Step 3 with commission plan components and functionality.
