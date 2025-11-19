<objective>
Add a clickable port column to the processes table and rename processes to use their folder/directory name for better identification.
</objective>

<context>
This is for the PM2 Control Center GUI at http://localhost:5173/processes.
Users need to quickly identify which port each process runs on and click to open the web app.
The process name should reflect the folder it runs from for easier identification.

@packages/frontend/src/pages/Processes.tsx
@packages/frontend/src/types/index.ts
@packages/frontend/src/components/process/ProcessDetailPanel.tsx
</context>

<requirements>
1. Add a "Port" column to the processes table (between Name and Status columns)
2. Display the port number extracted from process environment or args (look for -p, --port, PORT env var)
3. Make the port number a clickable link that opens http://localhost:{port} in a new tab
4. If no port is found, show "N/A" or "-"
5. Extract and display folder name from the process cwd (current working directory) in the Name column
   - Format: "folder-name" (last directory segment from cwd path)
   - Keep the original pm_id visible (e.g., "my-app [0]" or "my-app (ID: 0)")
6. Ensure the port link is styled distinctively (blue, underlined on hover)
</requirements>

<implementation>
Parse port from multiple sources in this priority:
1. Process env.PORT variable
2. Args containing -p or --port flags
3. PM2 process configuration

For folder name extraction:
- Use process.pm2_env.cwd or process.pm2_env.pm_cwd
- Extract last segment: /path/to/my-project → "my-project"
- Fallback to original process name if cwd not available

Add to the table columns:
```tsx
// After Name column, before Status
<th>Port</th>
...
<td>
  {port ? (
    <a
      href={`http://localhost:${port}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline"
    >
      {port}
    </a>
  ) : (
    <span className="text-muted-foreground">-</span>
  )}
</td>
```
</implementation>

<output>
Modify these files with relative paths:
- `./packages/frontend/src/pages/Processes.tsx` - Add port column and folder name display
- `./packages/frontend/src/utils/processHelpers.ts` (create if needed) - Helper functions for port extraction and folder name parsing
</output>

<verification>
Before declaring complete:
1. Verify the Port column appears in the processes table
2. Test that clicking a port number opens the correct URL in new tab
3. Confirm folder names are extracted correctly from cwd paths
4. Check that processes without ports show appropriate fallback
5. Ensure the UI is responsive and styled consistently
</verification>

<success_criteria>
- Port column visible with clickable links
- Links correctly open http://localhost:{port} in new tab
- Process names show folder name with ID (e.g., "my-project [0]")
- Graceful handling of missing port or cwd data
- Consistent styling with rest of the application
</success_criteria>
