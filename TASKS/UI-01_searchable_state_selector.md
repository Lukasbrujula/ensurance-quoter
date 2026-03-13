# UI-01: Searchable State Selector

## Model
Claude Opus 4.6

## Objective
Replace the current state dropdown in the quote intake form with a searchable combobox that supports both state name and abbreviation input. Currently agents must scroll through all 50+ states in a plain `<Select>` dropdown, which is slow and frustrating.

## Tools Required
- File editor (str_replace)
- TypeScript compiler (`bunx tsc --noEmit`)
- Browser testing (`bun dev`)

## What to Do

### 1. Locate the state field
- File: `components/quote/intake-form.tsx`
- Find the current state `<Select>` component (it's a standard shadcn/ui Select with all US states + DC as options)

### 2. Replace with shadcn/ui Combobox pattern
- Use the `<Popover>` + `<Command>` (cmdk) pattern from shadcn/ui — this is the standard combobox approach
- Components needed: `Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandEmpty`, `CommandGroup`, `CommandItem`
- These should already be installed in `components/ui/`

### 3. Implement search logic
- The state data array should include both `name` and `abbreviation` (e.g., `{ value: "FL", label: "Florida", abbreviation: "FL" }`)
- Search should match against BOTH the full state name AND the abbreviation
- Typing "FL" or "Flo" or "Florida" should all surface Florida
- Typing "NY" should surface New York
- The display should show: abbreviation + full name (e.g., "FL — Florida")
- Selected value stored should be the abbreviation (this is what the quote engine uses)

### 4. Preserve existing behavior
- The selected state must still flow into the quote form state correctly (React Hook Form or whatever state management is in use)
- Default empty state / placeholder text: "Search state..."
- After selection, display the selected state abbreviation + name in the trigger button

## Guardrails
- Do NOT modify `components/ui/` files
- Do NOT change the form's Zod schema or API contract — the state value format must stay the same
- Do NOT install new dependencies — use existing shadcn/ui primitives
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Agent can type "CA" and immediately see California
- Agent can type "New" and see New Hampshire, New Jersey, New Mexico, New York
- Agent can type full state name and it filters correctly
- Selecting a state closes the popover and shows the selection
- Quote submission still works with the selected state value
- No TypeScript errors

## Dependencies
- `components/ui/popover.tsx`
- `components/ui/command.tsx`
- Both should already exist from shadcn/ui installation

## Failure Handling
- If `Command` component is not installed, run: `npx shadcn@latest add command`
- If `Popover` component is not installed, run: `npx shadcn@latest add popover`
