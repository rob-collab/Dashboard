# Updraft CCRO Dashboard — User Guide

**For:** Cath (CCRO) & the wider team
**Written in:** Plain English, British spelling
**Version:** February 2025

---

## Contents

1. [What Is This?](#1-what-is-this)
2. [Getting Started](#2-getting-started)
3. [Finding Your Way Around](#3-finding-your-way-around)
4. [The Dashboard (Home Page)](#4-the-dashboard-home-page)
5. [Reports](#5-reports)
6. [The Report Editor — Building a Report](#6-the-report-editor--building-a-report)
7. [Section Types Explained](#7-section-types-explained)
8. [Images in Reports](#8-images-in-reports)
9. [The Consumer Duty Dashboard](#9-the-consumer-duty-dashboard)
10. [Publishing & Versioning](#10-publishing--versioning)
11. [Exporting Reports as HTML](#11-exporting-reports-as-html)
12. [Branding & Logo Settings](#12-branding--logo-settings)
13. [Templates](#13-templates)
14. [Imported Components](#14-imported-components)
15. [Audit Trail](#15-audit-trail)
16. [User Management](#16-user-management)
17. [Roles & Permissions](#17-roles--permissions)
18. [Demo Mode — What to Expect](#18-demo-mode--what-to-expect)
19. [Testing Guide — What to Try and What to Look For](#19-testing-guide--what-to-try-and-what-to-look-for)
20. [Glossary](#20-glossary)

---

## 1. What Is This?

The Updraft CCRO Dashboard is a tool for building, managing, and publishing your monthly CCRO reports. Instead of assembling reports in PowerPoint or Word, you build them in the browser — adding text, tables, charts, images, and Consumer Duty data as modular sections that you can drag around, style, and publish.

**Key things it does:**
- Lets you build reports from reusable building blocks (sections)
- Tracks Consumer Duty outcomes, measures, and management information (MI) with RAG statuses
- Keeps an audit trail of who changed what and when
- Exports reports as standalone HTML files you can share by email or put on SharePoint
- Lets you upload a team logo that appears on every report
- Controls who can see and edit what, based on their role

**Right now** this is a working prototype. It looks and feels like the real thing, but the data resets every time you refresh the page. That's by design — we're in the testing and feedback phase. Once we're happy with how it works, we'll connect a real database so everything saves permanently.

---

## 2. Getting Started

### For testing (right now)

Rob will give you a web address to open in your browser — something like `http://localhost:3000` if running on Rob's machine, or a Vercel URL if it's been deployed.

No login is needed for the demo. You'll land straight on the dashboard, logged in as Rob.

### Switching user

Look at the **bottom-left corner** of the sidebar. You'll see a name and role badge. Click it to open the user switcher.

There are six demo users to try:

| Name | Role | What they can do |
|------|------|-----------------|
| **Rob** | CCRO Team | Everything — create, edit, publish, manage users, settings |
| **Cath** | CCRO Team | Everything — same as Rob |
| **Ash** | Metric Owner | Update the measures assigned to them, view published reports |
| **Chris** | Metric Owner | Update the measures assigned to them, view published reports |
| **Micha** | Metric Owner | Update the measures assigned to them, view published reports |
| **CEO** | Viewer | Read-only — can view published reports, nothing else |

**Try switching to each user** to see how the sidebar and permissions change. When you're a Metric Owner, you'll notice the admin pages (Templates, Components, Audit, Users, Settings) disappear from the sidebar. When you're the CEO, even more is hidden.

---

## 3. Finding Your Way Around

The purple sidebar on the left is your main navigation. It shows different links depending on your role.

| Page | What it's for | Who can see it |
|------|--------------|----------------|
| **Dashboard** | Summary view — report counts, warnings, recent activity | Everyone |
| **Reports** | List of all reports — search, filter, open, create | Everyone |
| **Consumer Duty** | The FCA Consumer Duty outcomes and measures tracker | Everyone |
| **Templates** | Reusable section templates for reports | CCRO Team only |
| **Components** | Imported HTML components (e.g. regulatory widgets) | CCRO Team only |
| **Audit Trail** | Log of every action taken in the system | CCRO Team only |
| **Users** | Manage team members and their roles | CCRO Team only |
| **Settings** | Branding — upload your team logo | CCRO Team only |

**Collapse the sidebar** by clicking the "Collapse" button at the bottom. This gives you more screen space when editing reports.

---

## 4. The Dashboard (Home Page)

This is your landing page. It gives you a quick overview:

- **Report counts** — how many are in Draft, Published, and Archived status
- **Warning indicators** — anything flagged as needing attention
- **Recent activity** — the latest entries from the audit trail

Think of it as your "at a glance" view before diving into the detail.

---

## 5. Reports

### Viewing the reports list

Click **Reports** in the sidebar. You'll see all reports as cards. Each card shows:
- The report title and period
- Its status (Draft, Published, or Archived) with a colour-coded badge
- When it was last updated

### Filtering and searching

- Use the **search bar** at the top to find reports by name
- Use the **status tabs** (All / Draft / Published / Archived) to filter

### Creating a new report

1. Click the **"New Report"** button (top-right)
2. Enter a title (e.g. "CCRO Monthly Report")
3. Choose the reporting period (e.g. "March 2025")
4. Click **Create**
5. You'll be taken straight to the report editor

### Opening an existing report

Click on any report card. This opens the **report view** — a read-only preview of the report as it would appear when published.

From the view page you can:
- Click **Edit** to open the editor
- Click **Export HTML** to download it
- Click **History** to see past versions

---

## 6. The Report Editor — Building a Report

The editor is where you build your report. It has three panels:

### Left panel — Section list
This shows all the sections in your report, in order. You can:
- **Click a section** to select it and see it in the centre
- **Drag sections** up and down to reorder them (grab the six-dot handle on the left)
- **Delete a section** by clicking the bin icon (you'll need to click twice to confirm)

### Centre panel — Content area
This is where you edit the selected section. What you see depends on the section type — it might be a text editor, a table, an image uploader, or chart controls.

### Right panel — Properties (optional)
Click on a section in the left panel to open the properties panel on the right. This lets you style the section:
- **Layout** — width (full, half, third, quarter)
- **Background** — pick a colour from the Updraft palette or enter a custom hex colour
- **Border** — style, width, colour, radius, position
- **Spacing** — padding and margin (the space inside and outside the section)
- **Shadow** — depth level (0 = none, 5 = maximum)

### Adding a section
Click the **"Add Section"** button at the bottom of the left panel. A menu pops up with all available section types. Click one to add it.

### Saving
Click the **Save** button in the top toolbar. You'll see a green "Saved!" flash. Note: in demo mode this saves to memory only — it won't survive a page refresh.

### Top toolbar buttons
- **Back arrow** — return to the reports list
- **Preview** — open the read-only view
- **Save** — save your changes
- **Publish** — publish the report (creates a version snapshot)

---

## 7. Section Types Explained

When you add a section, you choose from these types:

### Text Block
A rich text editor. Works like a simplified Word processor. The toolbar gives you:
- **Bold**, **Italic**, **Underline**, **Strikethrough**
- **Headings** (H1, H2, H3, H4)
- **Bullet lists** and **numbered lists**
- **Blockquotes**
- **Horizontal rules** (divider lines)
- **Text alignment** (left, centre, right, justify)
- **Links** — highlight text, click the link icon, enter a URL
- **Tables** — click the table icon to insert a table
- **Inline images** — click the image icon to embed an image within the text
- **Undo / Redo**

### Data Table
A spreadsheet-like table. You can:
- Edit cell values by clicking on them
- Add or remove rows and columns
- Set header names

Useful for risk profiles, metric summaries, and comparison tables.

### Card Grid
A set of statistic cards — each with an icon, a title, a value, and a subtitle. Good for key performance indicators at the top of a report (e.g. "NPS Score: 72", "Complaints: 23").

### Chart
A chart section that can display data as bar charts, line charts, or pie charts. You can:
- Choose the chart type
- Edit labels and data values
- Add or remove data series
- Pick brand colours for each series

### Image
Upload an image to display in the report. You can:
- Drag and drop an image file, or click to browse
- Set alt text (for accessibility) and a caption
- Choose alignment (left, centre, right)
- Adjust the display width
- Choose how the image fits its container (contain, cover, fill)
- Replace or remove the image

Supports PNG, JPG, GIF, WebP, and SVG files up to 5MB.

### Accordion
Expandable/collapsible sections — useful for "Working Well / Challenges / Actions" style breakdowns where you want to keep things tidy. Readers click to expand each item.

### Consumer Duty Dashboard
A special section that pulls in your Consumer Duty outcomes and measures. This connects to the outcomes you manage in the Consumer Duty page. You don't edit the data here — you manage it on the Consumer Duty page, and it flows into the report automatically.

### Imported Component
Embed a pre-built HTML component from the Components Library. Useful for regulatory widgets or standardised content that needs to look exactly the same in every report.

---

## 8. Images in Reports

There are three ways to use images:

### 1. Image Section (full section)
Add an **Image** section from the "Add Section" menu. This gives you a dedicated image block with full controls for alignment, size, caption, and fit. Best for standalone images like diagrams, screenshots, or infographics.

### 2. Inline Images in Text
When editing a **Text Block**, click the **image icon** (mountain/landscape icon) in the toolbar. Pick a file and it'll be embedded right in the text, alongside your words. Best for small images that support the surrounding text.

### 3. Team Logo (automatic)
Upload a logo in **Settings** and it appears automatically in every report's header and/or footer. See [§12](#12-branding--logo-settings) for details.

### Things to know about images
- Images are stored inside the report data itself (as base64), not as separate files. This means they'll always be there — no broken links.
- Try to keep images under **1–2MB** for best performance. Very large images can make the editor feel sluggish.
- The maximum allowed size is **5MB** per image. Anything larger will be rejected with an error message.
- Accepted formats: **PNG, JPG, GIF, WebP, SVG**
- When you export a report as HTML, all images are embedded in the file — no external dependencies.

---

## 9. The Consumer Duty Dashboard

This is the heart of the CCRO reporting. Click **Consumer Duty** in the sidebar.

### What you'll see

**Outcome cards** — five cards representing the FCA Consumer Duty outcomes:
1. Products & Services
2. Price & Value
3. Customer Understanding
4. Customer Support
5. Governance & Culture

Each card shows a **RAG status** (coloured dot):
- **Green** = Good
- **Amber** = Warning
- **Red** = Harm

### Drilling down

Click on an outcome card to expand its **measures** below. Each measure has:
- A measure ID (e.g. 1.1, 3.3)
- A name
- An owner (the Metric Owner responsible)
- A summary
- Its own RAG status

Click on a measure to open the **MI (Management Information) modal**. This shows the detailed metrics:
- Current value
- Previous value
- Change
- RAG status for each metric

### Who can edit what

- **CCRO Team** (Cath, Rob) can view everything
- **Metric Owners** (Ash, Chris, Micha) can update the MI values for their assigned measures
- **Viewers** (CEO) can only view

### How it flows into reports

When you add a **Consumer Duty Dashboard** section to a report, it pulls in whatever outcome and measure data exists in the system. You manage the data on the Consumer Duty page; the report just displays it.

---

## 10. Publishing & Versioning

### The lifecycle of a report

1. **Draft** — The report is being worked on. Only the author and CCRO Team can see it.
2. **Published** — The report is finalised and visible to everyone. A version snapshot is created.
3. **Archived** — The report is kept for reference but no longer current.

### Publishing a report

1. Open the report in the **editor**
2. Click the **Publish** button (top-right)
3. A dialog appears asking for an optional **publish note** (e.g. "Final version for Board")
4. Click **Publish**
5. The report status changes to Published and a version snapshot is saved

### Viewing version history

On the report view page, click the **History** button. A sidebar opens showing all past versions with:
- Version number
- Who published it
- When
- The publish note

You can also **compare versions** to see what changed between releases.

---

## 11. Exporting Reports as HTML

On any report view page, click the **Export HTML** button. This downloads a standalone HTML file that:

- Opens in any web browser — no special software needed
- Contains all content, styling, and images embedded directly
- Includes your team logo in the header and footer (if configured)
- Has the Updraft purple branding and typography
- Includes interactive elements (clickable Consumer Duty outcomes)
- Can be emailed, put on SharePoint, or printed

The exported file is completely self-contained — no internet connection needed to view it.

---

## 12. Branding & Logo Settings

Go to **Settings** in the sidebar (CCRO Team only).

### Uploading a logo

- **Drag and drop** a logo image onto the upload area, or **click to browse**
- The logo appears in a preview immediately
- Accepted formats: PNG, JPG, GIF, WebP, SVG (max 5MB)

### Configuring the logo

- **Company Name** — displayed alongside the logo in report footers and HTML exports
- **Logo Alt Text** — a text description of the logo for accessibility (screen readers)
- **Logo Width** — use the slider to adjust from 40px to 300px

### Display toggles

- **Show in Report Header** — when ticked, the logo appears above the report title on every report view page
- **Show in Report Footer** — when ticked, the logo appears at the bottom of every report view page with the company name

Both toggles also control whether the logo appears in HTML exports.

### Removing the logo

Click the **Remove** button next to the logo preview. The logo disappears from all reports immediately.

---

## 13. Templates

Templates are reusable section blueprints. Think of them as section "stamps" — instead of building a section from scratch every time, you create a template once and reuse it.

The **Templates** page (CCRO Team only) shows your template library. Each template has:
- A name and description
- A category (e.g. Analysis, Stats)
- The section type it's based on
- A content schema (the fields it expects)

Templates are most useful once you're producing reports regularly and want consistency.

---

## 14. Imported Components

The **Components** page (CCRO Team only) lets you manage pre-built HTML widgets that can be dropped into reports. For example, a regulatory compliance widget or a standardised data visualisation.

Components are imported as raw HTML and are automatically **sanitised** (cleaned of any potentially unsafe code) before being rendered.

---

## 15. Audit Trail

The **Audit Trail** page (CCRO Team only) shows a chronological log of every action taken in the system:

- Who did it (user name and role)
- What they did (e.g. "Edited section", "Updated MI", "Changed RAG status", "Published report")
- When they did it
- Which report or entity was affected
- What the specific changes were

You can filter by:
- **Action type** (e.g. only show publishes)
- **User** (e.g. only show Chris's changes)
- **Date range**

This is your accountability record — useful for governance reviews and understanding how a report evolved.

---

## 16. User Management

The **Users** page (CCRO Team only) lets you:

- View all users, their roles, and whether they're active
- **Add a new user** — name, email, role, assigned measures
- **Edit a user** — change their role or assigned measures
- **Deactivate a user** — remove their access without deleting their history

### Assigning measures

When adding or editing a Metric Owner, you assign specific measure IDs (e.g. "1.1", "3.3", "4.7"). These determine which Consumer Duty measures they can update.

---

## 17. Roles & Permissions

| Permission | CCRO Team | Metric Owner | Viewer |
|-----------|-----------|-------------|--------|
| View dashboard | Yes | Yes | Yes |
| View published reports | Yes | Yes | Yes |
| View draft reports | Yes | No | No |
| Create reports | Yes | No | No |
| Edit reports | Yes | No | No |
| Publish reports | Yes | No | No |
| Update assigned MI metrics | Yes | Yes (own only) | No |
| View Consumer Duty dashboard | Yes | Yes | Yes |
| Manage templates | Yes | No | No |
| Manage components | Yes | No | No |
| View audit trail | Yes | No | No |
| Manage users | Yes | No | No |
| Change branding/logo | Yes | No | No |
| Export reports as HTML | Yes | Yes | Yes |

---

## 18. Demo Mode — What to Expect

**This is important to understand before you start testing.**

The dashboard is currently running in **demo mode**. This means:

1. **Data resets on refresh.** Every time you reload the page (F5 or closing and reopening the tab), all your changes are lost and the demo data comes back. This is normal and expected.

2. **There's no real login.** You switch users from the sidebar dropdown — there's no username/password. This is just for testing different roles.

3. **Three demo reports** are pre-loaded:
   - February 2025 (Draft) — this is the one with full demo content
   - January 2025 (Published) — a finished report
   - December 2024 (Archived) — an old report

4. **Five Consumer Duty outcomes** are pre-loaded with measures, owners, and MI data.

5. **Images are stored in the browser's memory** — not on a server. They'll disappear on refresh too.

6. **Everything you do generates audit entries** — but they also reset on refresh.

**The good news:** everything you see is what the real version will look and feel like. The only difference is that the real version will save everything permanently to a database.

---

## 19. Testing Guide — What to Try and What to Look For

This section is your testing playbook. Work through these scenarios and note anything that feels wrong, confusing, or missing.

### Scenario 1: Create a report from scratch

1. Go to **Reports** → **New Report**
2. Title: "March 2025 CCRO Report", Period: "March 2025"
3. Add sections in this order:
   - A **Card Grid** with key statistics
   - A **Text Block** with an executive summary
   - An **Image** section — upload a chart screenshot or diagram
   - A **Data Table** with a risk profile
   - An **Accordion** with "Working Well / Challenges / Actions"
   - A **Consumer Duty Dashboard** section
4. Drag sections to reorder them
5. Style a section using the Properties panel (change background colour, add a border)
6. Save, then Preview
7. Export as HTML and open the file in your browser

**What to look for:**
- Does the flow feel natural? Is anything confusing?
- Do sections look right in both edit and view mode?
- Does the exported HTML match what you see on screen?
- Is anything missing from the section types?

### Scenario 2: Work as a Metric Owner

1. Switch to **Ash** (Metric Owner)
2. Notice that Templates, Components, Audit, Users, and Settings are gone from the sidebar
3. Go to **Consumer Duty**
4. Click on an outcome → find a measure assigned to Ash
5. Open the MI modal and update a metric value
6. Check if the RAG status updates correctly

**What to look for:**
- Can Ash only see what they should?
- Is the MI editing experience clear?
- Does the RAG status change make sense?

### Scenario 3: Work as the CEO (Viewer)

1. Switch to **CEO**
2. Try to navigate — you should only see Dashboard, Reports, and Consumer Duty
3. Open a published report — you should be able to view and export but not edit

**What to look for:**
- Is anything visible that shouldn't be?
- Is the read-only experience satisfactory?

### Scenario 4: Upload a team logo

1. Switch back to **Cath** or **Rob**
2. Go to **Settings**
3. Upload the Updraft logo (or any image)
4. Set the company name to "Updraft"
5. Adjust the width
6. Go to a report view — check the header and footer
7. Export HTML — check the logo appears in the export

**What to look for:**
- Does the logo look right at different sizes?
- Is the placement in the header/footer appropriate?
- Does the HTML export look professional?

### Scenario 5: Image handling

1. Open the February 2025 report in the editor
2. Add an **Image** section
3. Try drag-and-drop upload
4. Try click-to-browse upload
5. Set a caption: "Figure 1: Risk Distribution"
6. Try all three alignment options
7. Adjust the width slider
8. Replace the image with a different one
9. Remove the image entirely
10. In a **Text Block**, try the inline image button (toolbar)

**What to look for:**
- Is the upload experience intuitive?
- Do alignment and width controls work as expected?
- Does the inline image in text blocks look right?
- Any lag or slowness with larger images?

### Scenario 6: Audit trail review

1. Make several changes (edit sections, update MI values, save reports)
2. Go to **Audit Trail**
3. Check that your actions appear
4. Try the filters

**What to look for:**
- Are all actions logged?
- Are the descriptions clear and accurate?
- Do the filters work?

### What to write down

For each issue you find, note:
1. **What you were doing** (e.g. "Adding an Image section")
2. **What you expected** (e.g. "Image should appear centred")
3. **What actually happened** (e.g. "Image appeared left-aligned")
4. **Your suggestion** (e.g. "Default should be centred" or "Doesn't matter, just noting it")

Don't worry about being too detailed or too vague — any feedback is useful.

---

## 20. Glossary

| Term | Meaning |
|------|---------|
| **RAG** | Red, Amber, Green — a traffic light system for status. In this tool: Harm (red), Warning (amber), Good (green). |
| **MI** | Management Information — the specific data points tracked for each Consumer Duty measure. |
| **Outcome** | One of the five FCA Consumer Duty outcomes (Products & Services, Price & Value, Customer Understanding, Customer Support, Governance & Culture). |
| **Measure** | A specific area being tracked within an outcome (e.g. "1.1 Customer Needs Met"). |
| **Section** | A building block of a report — a text block, table, image, chart, etc. |
| **Template** | A reusable section blueprint that can be stamped into any report. |
| **Component** | A pre-built HTML widget imported into the system. |
| **Publish** | Finalising a report — creates a snapshot and makes it visible to everyone. |
| **Draft** | A report that's still being worked on — not yet visible to Viewers. |
| **Archived** | A published report that's been retired — kept for reference. |
| **Audit Trail** | A log of every action taken in the system — who did what, when. |
| **Role** | Your level of access — CCRO Team, Metric Owner, or Viewer. |
| **Base64** | A way of encoding an image as text, so it can be stored inside a report without needing a separate file. You don't need to know the technical details — just know that your images are embedded directly in the report. |
| **Zustand** | The state management library running in the background. You'll never interact with it directly. |
| **Tiptap** | The rich text editor — the Word-processor-like tool you use in Text Block sections. |
| **HTML Export** | A downloadable file that opens in any web browser and contains the full report with all formatting and images. |
