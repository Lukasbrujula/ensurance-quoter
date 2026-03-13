# FT-01: Custom Fields for Leads

## Model
Claude Opus 4.6

## Objective
Allow agents to add custom fields to leads. Every agent has unique data points they track about clients that don't fit the standard fields (e.g., "Employer", "Referral Source", "Follow-up Priority", "Spouse Name", "Annual Income", "Preferred Contact Time"). This is a CRM fundamental that's currently missing.

## Tools Required
- File editor
- Supabase MCP (for schema changes)
- TypeScript compiler (`bunx tsc --noEmit`)

## What to Do

### 1. Design the custom fields schema

Create a flexible schema that supports different field types:

```sql
-- Custom field definitions (per agent — each agent defines their own fields)
CREATE TABLE custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES auth.users(id),
  field_name text NOT NULL,           -- Display label (e.g., "Employer")
  field_key text NOT NULL,            -- Slug/key (e.g., "employer") — auto-generated from name
  field_type text NOT NULL DEFAULT 'text',  -- 'text' | 'number' | 'date' | 'select' | 'boolean'
  options jsonb,                      -- For 'select' type: ["Hot", "Warm", "Cold"]
  display_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, field_key)
);

-- Custom field values (per lead)
CREATE TABLE custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value text,                         -- Stored as text, cast based on field_type
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, field_definition_id)
);

-- RLS policies
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage own field definitions"
  ON custom_field_definitions FOR ALL
  USING (agent_id = auth.uid());

CREATE POLICY "Agents manage own lead field values"
  ON custom_field_values FOR ALL
  USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid())
  );
```

### 2. Build the field definition management UI

Location: `/settings` page — add a new section/tab "Custom Fields"

- List all custom field definitions for the agent
- "Add Field" button opens a form:
  - Field name (required)
  - Field type dropdown: Text, Number, Date, Dropdown (select), Yes/No (boolean)
  - If "Dropdown" selected: show an input to add options (comma-separated or tag-style)
  - Required toggle
- Each field row has: drag handle (to reorder), name, type, required badge, edit button, delete button
- Delete should confirm ("This will remove the field and all its data from all leads")
- Reorder via drag-and-drop (reuse dnd-kit if UI-02 is done, or simple up/down arrows)

### 3. Display custom fields on lead detail

Location: `components/leads/` — wherever lead detail/edit is rendered

- Below the standard lead fields, add a "Custom Fields" section
- Render each custom field based on its type:
  - `text` → `<Input>`
  - `number` → `<Input type="number">`
  - `date` → Date picker (shadcn `<Calendar>` + `<Popover>`)
  - `select` → `<Select>` with the defined options
  - `boolean` → `<Switch>` or `<Checkbox>`
- Custom fields should save on blur or with a debounce (same pattern as other lead edits)
- If a field is required and empty, show validation inline

### 4. Display in lead list table (optional enhancement)
- In the leads table, allow custom fields to be added as columns
- A "Columns" dropdown/settings button lets agents toggle which custom fields appear as table columns
- Custom field columns should be sortable and filterable

### 5. Include in CSV export/import
- When exporting leads to CSV, include custom fields as additional columns
- When importing CSV, if column headers match custom field names, map them automatically

## Guardrails
- Do NOT modify the `leads` table schema — custom data lives in `custom_field_values`, not as columns on `leads`
- Do NOT allow field_key collisions with standard lead fields (name, email, phone, state, etc.)
- RLS must be enforced — Agent A cannot see Agent B's field definitions or values
- Limit to reasonable bounds: max 20 custom fields per agent, field name max 50 chars
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Agent can create custom fields of different types in settings
- Custom fields appear on lead detail view with appropriate input controls
- Values save correctly and persist across page loads
- Deleting a field definition removes all associated values
- RLS prevents cross-agent data access
- No TypeScript errors

## Dependencies
- Supabase MCP for migration
- Existing lead detail components
- Existing settings page
- shadcn/ui components: Input, Select, Switch, Calendar, Popover

## Failure Handling
- If Supabase MCP is unavailable, write the migration SQL and document it for manual execution
- If the settings page is too crowded, create a dedicated `/settings/custom-fields` sub-route
- Start with just displaying custom fields on lead detail — table column integration can be a follow-up
