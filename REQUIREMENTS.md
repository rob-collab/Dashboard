# CCRO Dashboard & Report Management System
## Requirements Document v1.0

**Project:** Updraft CCRO Report Management System  
**Client:** Updraft (FCA-Regulated Fintech)  
**Date:** 13 February 2025  
**Prepared for:** Cath (CCRO) & Rob  
**Status:** For Approval

---

## Executive Summary

### The Problem
The current CCRO reporting system uses static HTML files that only Rob can edit. This creates a technical bottleneck, prevents timely updates, lacks audit trails, and limits the team's ability to adapt reports to changing regulatory needs.

### The Solution
Build a web-based content management system (CMS) that enables the CCRO team to create, edit, and publish professional compliance reports with:
- **Easy editing** for non-technical users (Cath and team)
- **Visual layout editor** for drag-and-drop section arrangement
- **HTML component import** for custom-designed sections
- **Template system** for reusable layouts
- **Interactive Consumer Duty Dashboard** (CEO's favorite feature)
- **Complete audit trail** for regulatory compliance
- **Immutable version history** for FCA documentation

### Business Impact
- **Reduce report creation time:** From days to hours
- **Enable quarterly reports:** Currently limited by complexity
- **Eliminate technical bottleneck:** Team edits without Rob
- **Improve compliance posture:** Full audit trail + version history
- **Maintain professional appearance:** CEO-approved design preserved

### Timeline & Budget
- **Duration:** 2-3 weeks to full implementation
- **Budget:** £0 (using free-tier cloud services)
- **Resources:** Rob (development lead), Cath (testing/feedback), 1 hour CEO review

---

## 1. Business Requirements

### 1.1 Strategic Goals
1. **Operational Efficiency:** Reduce CCRO report production time by 80%
2. **Scalability:** Enable monthly (vs quarterly) reporting cadence
3. **Compliance:** Meet FCA Threshold Conditions for audit trails and documentation
4. **Flexibility:** Adapt report structure to emerging risks without technical expertise
5. **Professional Standards:** Maintain high-quality, executive-ready presentation

### 1.2 Core Problems to Solve
| Problem | Current State | Desired State |
|---------|--------------|---------------|
| **Technical Bottleneck** | Only Rob can edit HTML | Cath and team edit independently |
| **Slow Updates** | Multi-day process | 2-hour turnaround |
| **No Audit Trail** | No record of changes | Complete change log with timestamps |
| **Rigid Structure** | HTML coding required to add sections | Drag-and-drop visual editor |
| **Metric Owner Delays** | Email Rob → Wait → Manual update | Owners update directly |
| **Version History** | Manual file copies | Automatic immutable snapshots |

### 1.3 Success Criteria
- ✅ Cath creates a complete report without Rob's assistance
- ✅ All 4-6 metric owners update their data within 24 hours
- ✅ Report published and shared with ExCo within 2 hours of final edits
- ✅ CEO confirms interactive dashboard experience maintained
- ✅ FCA audit trail requirements met (who/what/when)
- ✅ 6-month historical versions accessible in < 10 seconds

---

## 2. User Roles & Access Control

### 2.1 CCRO Team (3 users)
**Users:** Cath, Rob, + 1 new team member (TBD)

**Permissions:**
- ✅ Full edit access to all content
- ✅ Add/remove sections
- ✅ Publish reports
- ✅ Manage user permissions
- ✅ View complete audit logs
- ✅ Export historical versions
- ✅ Import HTML components
- ✅ Create global templates
- ✅ Configure Consumer Duty structure

**Use Cases:**
- Create monthly CCRO reports
- Add one-off sections (e.g., "DPO Deep Dive" for Q1 only)
- Review metric owner changes before publishing
- Respond to FCA information requests
- Design reusable templates for consistency

### 2.2 Metric Owners (4-6 users)
**Users:** Ash, Chris, Micha, Cath (dual role), others TBD

**Permissions:**
- ✅ Edit assigned measures only (row-level security)
- ✅ Update MI data for their measures
- ✅ View published reports
- ✅ Create personal templates
- ❌ Cannot publish reports
- ❌ Cannot delete measures
- ❌ Cannot see other owners' draft changes

**Assignments (Current):**
- **Ash:** Measures 1.1, 1.3, 1.4, 3.1, 3.6, 3.7
- **Chris:** Measures 1.5, 1.8, 3.3, 3.4, 3.5, 4.2-4.10
- **Micha:** Measures 1.2, 1.6, 1.7, 2.1-2.7
- **Cath:** Measures 1.9, 4.1, 5.1, 5.2, 5.5, 5.8

**Use Cases:**
- End-of-month: Update all assigned measures in one session
- Monthly cycle: Review previous values, enter current, update RAG
- Efficiency: Bulk update multiple measures on one screen

### 2.3 ExCo Viewers (5-10 users)
**Users:** CEO, CFO, COO, CTO, + Board members

**Permissions:**
- ✅ View published reports
- ✅ Access historical versions
- ✅ Download reports (HTML/PDF)
- ✅ Interactive dashboard features
- ❌ No editing capabilities
- ❌ Cannot see drafts

**Use Cases:**
- CEO: Monthly review of compliance posture
- CFO: Track risk metrics over time
- Board: Quarterly governance review

### 2.4 Company-Wide Viewers (Optional - Future)
**Use Case:** Consumer Duty Dashboard visible to all staff for transparency

**Permissions:**
- ✅ View designated "public" sections only
- ❌ No access to Executive Summary or sensitive commentary
- ❌ No historical versions

---

## 3. Functional Requirements

### 3.1 Content Management & Editing

#### 3.1.1 Rich Text Editor
**Requirement:** Professional text editing without HTML knowledge

**Features:**
- Formatting: Bold, italic, underline, strikethrough
- Structure: Headings (H1-H4), paragraphs, block quotes
- Lists: Bulleted, numbered, nested
- Tables: Create, edit, add/remove rows/columns
- Links: Hyperlinks to external resources
- Alignment: Left, center, right, justified
- Colors: Text color, highlight (within brand palette)
- Special: Horizontal rules, callout boxes

**Technical Note:** Similar to Medium, Notion, or Google Docs editor

#### 3.1.2 Visual Layout Editor
**Requirement:** Drag-and-drop interface to arrange sections without coding

**Core Capabilities:**

**A) Section Reordering**
- Drag sections up/down in sidebar
- Visual drop indicator shows placement
- Instant reordering (no save required)
- Works within and across parent containers

**B) Sizing & Positioning**
- 12-column responsive grid system
- Section widths: Full (12), Half (6), Third (4), Quarter (3)
- Drag handles to resize
- Automatic mobile responsiveness

**C) Layout Types**
```
Available Layouts:
├─ Single Column (default)
├─ Two Columns (50/50, 60/40, 70/30)
├─ Three Columns (equal or custom)
├─ Sidebar Layout (content + fixed sidebar)
├─ Card Grid (2×2, 3×3, 4×4)
├─ Bento Box (mixed sizes, Pinterest-style)
└─ Custom (free positioning)
```

**D) Spacing Controls**
- Margin: Top, Right, Bottom, Left (0-100px)
- Padding: Top, Right, Bottom, Left (0-100px)
- Gap: Space between child elements
- Visual sliders + numeric input

**E) Styling Controls**
```
Per-Section Styling:
├─ Background
│  ├─ Color (brand palette + custom)
│  ├─ Gradient (linear, radial)
│  ├─ Opacity (0-100%)
│  └─ Ambient shapes (SVG decorations)
│
├─ Borders
│  ├─ Style (solid, dashed, none)
│  ├─ Width (0-10px)
│  ├─ Color (brand palette)
│  ├─ Radius (rounded corners: 0-32px)
│  └─ Position (all, left accent, top, bottom)
│
├─ Effects
│  ├─ Shadow depth (0-5 levels)
│  ├─ Blur (glassmorphism effect)
│  ├─ Hover animations (lift, glow, scale)
│  └─ Transitions (smooth, bounce, fade)
│
└─ Typography
   ├─ Font family (Inter, Poppins, system)
   ├─ Font size (relative: xs, sm, md, lg, xl)
   └─ Line height & letter spacing
```

**F) Media Management**
- Image upload (drag-drop or file picker)
- Image positioning (left, right, center, background)
- Image sizing (contain, cover, custom dimensions)
- Icon library (Lucide icons - 1000+ icons)
- SVG upload for custom graphics
- Media library (reuse uploaded assets)

**Interface Layout:**
```
┌─────────────────────────────────────────────────────┐
│  CCRO Dashboard Editor                    [Preview] │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│ SECTIONS │  ┌───────────────────────────────────┐   │
│          │  │ Executive Summary                 │   │
│ ▼ Exec   │  │ ⠿ Drag to move                    │   │
│  • Verdict│  │                                  │   │
│  • Stats │  │ [Rich text editing area...]       │   │
│  • Pillars│  │                                  │   │
│          │  └───────────────────────────────────┘   │
│ ▼ Consumer│                                          │
│ ▶ Risk   │  ┌──────┬──────┬──────┐                 │
│ ▶ Complts │  │Stat 1│Stat 2│Stat 3│ ⠿              │
│          │  └──────┴──────┴──────┘                 │
│[+ Section]│                                          │
│          │  [+ Add Section ▼]                       │
├──────────┤   • Text Block                           │
│PROPERTIES│   • Data Table                           │
│          │   • Card Grid                            │
│Layout:   │   • Consumer Duty Dashboard              │
│[Full ▼]  │   • Imported Component                   │
│          │   • From Template                        │
│Width:    │                                           │
│[━━━━━━]  │                                           │
│          │                                           │
│Background│                                           │
│[●Purple] │                                           │
│          │                                           │
│Border:   │                                           │
│[Left▼]   │                                           │
│[#7B1FA2] │                                           │
└──────────┴──────────────────────────────────────────┘
```

#### 3.1.3 HTML Component Import System
**Requirement:** Import externally-designed HTML sections into reports

**Use Case:**
> "I design a DPO section twice a year in my HTML editor, perfect the styling and interactions, then import it into the tool. Next time, I just toggle it on rather than rebuilding."

**Import Workflow:**

**Step 1: Design Externally**
```
Rob's Process:
1. Opens HTML editor (VS Code, CodePen, etc.)
2. Designs "DPO Section" with custom HTML/CSS/JS
3. Tests interactions, iterates styling
4. Finalizes design
```

**Step 2: Import to Dashboard**
```
Import Dialog:
├─ [Upload .html file] or [Paste HTML code]
├─ Component Name: "DPO Deep Dive Q1 2025"
├─ Description: "Data protection compliance review"
├─ Category: [Regulatory] ▼
├─ Version: 1.0
└─ [Preview] [Security Check] [Import]
```

**Step 3: Security Validation**
```
Automatic Checks:
✓ Sanitize HTML (remove dangerous scripts)
✓ Scope CSS (prevent global conflicts)
✓ Validate JavaScript (whitelist safe functions)
✓ Check external resources (no malicious CDNs)
✓ Generate sandboxed version

Results:
✓ Safe to import
⚠ Warning: External script blocked (analytics.js)
✗ Blocked: eval() detected in code
```

**Step 4: Add to Report**
```
Component Library:
[DPO Deep Dive Q1 2025] ● Safe ● v1.0
↓ Drag into report
or
[+ Add Section] → [Imported Components] → Select
```

**Component Management:**
```
Component Library View:
┌─────────────────────────────────────┐
│ My Components                        │
├─────────────────────────────────────┤
│ [📄] DPO Deep Dive                  │
│      v1.0, v1.1, v2.0               │
│      Used in: Feb 2025, Aug 2024    │
│      [Edit] [Duplicate] [Export]    │
│                                      │
│ [📊] Tech Risk Analysis             │
│      v1.0                           │
│      Used in: Jan 2025, Dec 2024    │
│      [Edit] [Duplicate] [Export]    │
│                                      │
│ [⚠️] Cyber Incident Widget          │
│      v1.0                           │
│      Not used yet                   │
│      [Edit] [Duplicate] [Delete]    │
└─────────────────────────────────────┘

[+ Import New Component]
```

**Technical Implementation:**
- **Sandboxing:** Shadow DOM isolation prevents style/script conflicts
- **Variable Injection:** Pass data into components: `{{metric_value}}`
- **Versioning:** Track component versions, update all instances optionally
- **Export:** Download component for reuse in other systems

**Allowed in Imports:**
✅ Standard HTML elements (div, span, section, article, etc.)  
✅ CSS classes and inline styles  
✅ Safe JavaScript (event handlers, animations)  
✅ SVG graphics  
✅ Whitelisted CDN resources (Chart.js, Lucide icons)  
❌ `<script src="external">` from non-whitelisted sources  
❌ `eval()`, `Function()`, `innerHTML` with user input  
❌ Forms that POST to external URLs  
❌ `<iframe>` elements  

#### 3.1.4 Template System
**Requirement:** Save section layouts as reusable templates for consistency

**Use Case:**
> "I've designed the perfect Risk Analysis layout - narrative on left, data table on right, with a highlighted call-out box. I want to reuse this exact layout for Financial Crime, Governance, Tech Risk, etc."

**Template Creation:**
```
Designer's Workflow:
1. Create section with perfect layout
2. Click "Save as Template"
3. Fill in metadata:
   ├─ Name: "Risk Analysis Layout"
   ├─ Description: "2-col narrative + data table"
   ├─ Category: [Analysis] ▼
   ├─ Thumbnail: Auto-generated preview
   └─ Visibility: [Global] ▼ (all users or just me)
4. Define content placeholders:
   ├─ {{title}} - Text input
   ├─ {{narrative}} - Rich text editor
   ├─ {{risk_table}} - Data table (Risk, Owner, RAG, Trend)
   └─ {{callout}} - Optional highlight box
5. Save → Template available in library
```

**Template Usage:**
```
User Workflow:
1. Click [+ Add Section]
2. Choose "From Template"
3. Browse template gallery (with thumbnails)
4. Select "Risk Analysis Layout"
5. Fill in form:
   ├─ Title: "Financial Crime Risk Profile"
   ├─ Narrative: [Rich text editor opens]
   ├─ Risk Table: [Add rows interface]
   └─ Callout: "Enhanced due diligence required"
6. Section renders with beautiful styling
```

**Template Library Interface:**
```
┌─────────────────────────────────────────────┐
│ Templates                          [+ Create]│
├─────────────────────────────────────────────┤
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │[Preview] │ │[Preview] │ │[Preview] │    │
│ │Risk      │ │3-Stat    │ │Challenge │    │
│ │Analysis  │ │Cards     │ │Box       │    │
│ │          │ │          │ │          │    │
│ │Global    │ │Personal  │ │Global    │    │
│ │Rob       │ │You       │ │Cath      │    │
│ └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│ ┌──────────┐ ┌──────────┐                  │
│ │[Preview] │ │[Preview] │                  │
│ │DPO       │ │Executive │                  │
│ │Section   │ │Summary   │                  │
│ │          │ │          │                  │
│ │Global    │ │Global    │                  │
│ │Rob       │ │Cath      │                  │
│ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────┘

Filter: [All ▼] [Global ▼] [Category ▼]
Sort: [Recently Used ▼]
```

**Template Features:**
- **Smart Placeholders:** Typed fields (text, rich text, table, number, date)
- **Conditional Elements:** "Show callout box if RAG = Red"
- **Default Values:** Pre-fill common values
- **Validation:** Required fields, format checks
- **Preview:** See what content will look like before adding
- **Update Cascade:** Update template → optionally update all instances
- **Version Control:** Template v1, v2, v3 (like components)
- **Export/Import:** Share templates between team members

#### 3.1.5 Consumer Duty Dashboard (Interactive - CEO Priority)
**Requirement:** Maintain exact interactive dashboard that impressed CEO

**Structure:**
```
5 Outcome Cards (Top Level):
├─ Products & Services
├─ Price & Value
├─ Customer Understanding
├─ Customer Support
└─ Governance & Culture

Each Outcome contains:
├─ 4-8 Measures (e.g., "Customer Needs Met", "APR Alignment")
│
Each Measure contains:
└─ 1-5 MI Metrics (e.g., "Net Promoter Score: 72")
```

**Interaction Flow:**
```
User clicks Outcome Card
   ↓
Panel slides in below showing Measures
   ↓
User clicks Measure Card
   ↓
Modal pops up showing MI table with:
   • Metric Name
   • Current Value
   • Previous Value
   • Change (+/-, %)
   • RAG Status (Good/Warning/Harm)
```

**Data Management Interface (for Metric Owners):**
```
Metric Owner View:
┌─────────────────────────────────────────────┐
│ My Measures - Ash                           │
├─────────────────────────────────────────────┤
│                                              │
│ 1.1 Customer Needs Met                      │
│ ┌────────────────────────────────────────┐ │
│ │ Net Promoter Score                     │ │
│ │ Current: [72] Prev: 70  Change: +2    │ │
│ │ RAG: ● Good ○ Warning ○ Harm          │ │
│ ├────────────────────────────────────────┤ │
│ │ TrustPilot Score                       │ │
│ │ Current: [4.8] Prev: 4.8  Change: 0   │ │
│ │ RAG: ● Good ○ Warning ○ Harm          │ │
│ └────────────────────────────────────────┘ │
│                                              │
│ 1.3 New Credit Applications                 │
│ [Expand to edit metrics...]                 │
│                                              │
│ [Save All Changes]                          │
└─────────────────────────────────────────────┘
```

**Features:**
- Bulk editing (update multiple metrics at once)
- Auto-calculate change (Current - Previous)
- Copy from previous month button
- RAG status helper (suggests status based on change)
- Owner can only edit their assigned measures
- Real-time preview of dashboard as they edit

#### 3.1.6 Section Types
**Available section types for flexible report composition:**

**A) Text Block**
- Rich text editor
- Single or multi-column
- Supports images, tables, lists

**B) Data Table**
- Add/remove rows and columns
- Sortable columns
- RAG status cells (colored indicators)
- Export to CSV

**C) Card Grid**
- 2×2, 3×3, or custom grid
- Each card: Icon, title, value, subtitle
- Clickable (optional)
- Examples: Stats, pillars, challenges

**D) Consumer Duty Dashboard**
- Special component (described above)
- Only one per report
- Configurable outcomes/measures/MI

**E) Chart/Visualization**
- Line chart (trends over time)
- Bar chart (comparisons)
- Donut chart (proportions)
- Connect to data table or manual entry

**F) Imported HTML Component**
- Custom-designed sections
- From Component Library

**G) Template Instance**
- Instantiate saved template
- Fill in placeholders

**H) Accordion/Collapsible**
- Expandable sections
- Useful for detailed data
- Example: "Working Well" vs "Failing Controls"

### 3.2 Publishing & Version Management

#### 3.2.1 Draft System
**All editing happens in draft mode until explicitly published**

**Draft Features:**
- Auto-save every 30 seconds
- Multiple users can work on same report (see who's online)
- Last edited by: User + timestamp
- Unsaved changes indicator
- Preview at any time
- Discard draft option

**Draft Status Indicators:**
```
Report Status:
├─ Draft (red) - Never published
├─ Published (green) - Live version exists
├─ Modified (amber) - Published but has unpublished changes
└─ Archived (grey) - Historical, read-only
```

#### 3.2.2 Publishing Workflow
**When user clicks "Publish":**

**Step 1: Pre-Publish Validation**
```
Validation Checks:
✓ All required sections present
✓ No placeholder text remaining
✓ All Consumer Duty measures have RAG status
✓ No broken links or missing images
⚠ Warning: 3 measures not updated this month
⚠ Warning: Executive Summary unchanged from last month
✓ Ready to publish
```

**Step 2: Publish Confirmation**
```
┌────────────────────────────────────┐
│ Publish February 2025 Report       │
├────────────────────────────────────┤
│                                     │
│ This will:                          │
│ • Create immutable snapshot         │
│ • Generate standalone HTML export   │
│ • Make visible to ExCo              │
│ • Send notification (optional)      │
│                                     │
│ Published by: Rob                   │
│ Date: 1 Feb 2025, 10:23            │
│                                     │
│ Add publish note (optional):        │
│ [Text field for comments...]        │
│                                     │
│        [Cancel]  [Publish Report]   │
└────────────────────────────────────┘
```

**Step 3: Post-Publish Actions**
```
Automatic:
✓ Create snapshot in database (immutable)
✓ Generate standalone HTML file
✓ Update "Latest Report" pointer
✓ Log publish event in audit trail
✓ Create new draft for next month (optional)

Optional:
□ Send email to ExCo distribution list
□ Post to Slack #leadership channel
□ Archive to Google Drive
```

#### 3.2.3 Version History & Snapshots
**Every published version is permanently preserved**

**Version List View:**
```
┌─────────────────────────────────────────────────┐
│ Published Reports                    [Export All]│
├─────────────────────────────────────────────────┤
│                                                  │
│ ● February 2025                                 │
│   Published: 1 Feb 2025, 10:23 by Rob          │
│   Status: ✓ Current (live on dashboard)         │
│   [View] [Download HTML] [Compare] [Hide]       │
│                                                  │
│ ○ January 2025                                  │
│   Published: 2 Jan 2025, 09:15 by Cath         │
│   Status: Archived                              │
│   [View] [Download HTML] [Compare]              │
│                                                  │
│ ○ December 2024                                 │
│   Published: 4 Dec 2024, 14:42 by Rob          │
│   Note: "Year-end comprehensive review"         │
│   Status: Archived                              │
│   [View] [Download HTML] [Compare]              │
│                                                  │
│ [Load More...] (showing 3 of 18)                │
└─────────────────────────────────────────────────┘

Filter: [All ▼] [2025 ▼] [Published by: All ▼]
```

**Actions:**

**View:** Opens report exactly as it was on publish date
- Read-only mode
- Header shows: "Historical Version: January 2025"
- All interactions work (Consumer Duty dashboard)
- Cannot edit (badge: "Archived - Read Only")

**Download HTML:** Exports standalone file
- Filename: `CCRO_Report_Jan_2025_v1.html`
- Complete, self-contained
- Works offline
- All data embedded
- All styling preserved
- Interactive features functional

**Compare:** See differences between versions
```
Compare: January 2025 → February 2025

Executive Summary:
  ▼ Verdict text changed
    - "Technology investment progressing well"
    + "Technology limitations impede agility"
  
  ▼ Stats updated
    Collections: "Strong" → "Record Performance"

Consumer Duty:
  ▼ Outcome: Customer Understanding
    RAG: Good → Warning
    Reason: Measure 3.2 worsened
  
  ▼ Measure 3.2: Drop-off Points
    Pre-contract Drop: 40% → 45% (+5%)
    RAG: Good → Warning

Risk Profile:
  ▼ Risk 7: Cyber Attack
    Feb RAG: Red (was Amber in Jan)
    Trend: "Worsening (Patching Behind)"

Summary:
  12 measures updated
  3 RAG status changes (2 worsening, 1 improving)
  2 new sections added
  1 section archived
```

**Hide:** Remove from main list (not deleted, recoverable)

#### 3.2.4 HTML Export System
**Generate standalone HTML files for compliance/archival**

**Export Options:**
```
Export Settings:
├─ Format: [HTML ▼] (PDF in future)
├─ Include Interactive Features: [Yes ▼]
├─ Embed Images: [Yes ▼] (vs external links)
├─ Minify Code: [No ▼] (readable for audits)
└─ Filename: [Auto ▼] or custom

Advanced:
├─ Add Watermark: "FCA Official Copy - Feb 2025"
├─ Page Breaks: Insert for printing
└─ Metadata: Embed publish info in HTML comments
```

**Generated File Properties:**
- **Size:** 500KB - 2MB (depending on content)
- **Dependencies:** None (all CSS/JS inline or embedded)
- **Compatibility:** All modern browsers, works offline
- **Longevity:** Readable in 10+ years (no external dependencies)
- **Security:** Static HTML, no server requirements

**Use Cases:**
- FCA audit response
- Board packet inclusion
- Email to external auditors
- Long-term archive (7+ years)
- Legal evidence if needed

### 3.3 Audit Trail & Compliance

#### 3.3.1 Change Logging System
**Every action is logged for regulatory compliance**

**Logged Events:**
```
User Actions:
├─ Login/logout
├─ View report (read access)
├─ Edit section (before/after values)
├─ Add section
├─ Delete section
├─ Reorder sections
├─ Update metric
├─ Change RAG status
├─ Publish report
├─ Download export
├─ Import component
├─ Create template
└─ Modify permissions

Automatic Events:
├─ System backup completed
├─ Failed login attempt
├─ Session timeout
└─ Data validation errors
```

**Log Entry Structure:**
```json
{
  "id": "log_20250201_102314_abc123",
  "timestamp": "2025-02-01T10:23:14.567Z",
  "user": "rob@updraft.com",
  "user_role": "CCRO_TEAM",
  "ip_address": "10.0.1.45",
  "action": "update_measure",
  "entity_type": "consumer_duty_mi",
  "entity_id": "measure_1.1_nps",
  "changes": {
    "field": "current_value",
    "old_value": "70",
    "new_value": "72"
  },
  "report_id": "report_feb_2025",
  "session_id": "sess_abc123",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "measure_name": "Net Promoter Score",
    "outcome": "Products & Services"
  }
}
```

**Audit Log Viewer:**
```
┌──────────────────────────────────────────────────┐
│ Audit Trail                     [Export to CSV]  │
├──────────────────────────────────────────────────┤
│ Filters:                                         │
│ User: [All ▼] Date: [Last 30 days ▼]           │
│ Action: [All ▼] Report: [Feb 2025 ▼]           │
│                                          [Apply]  │
├──────────────────────────────────────────────────┤
│                                                   │
│ 1 Feb 10:23 | Rob    | Published report         │
│ 1 Feb 10:15 | Cath   | Edited Executive Summary │
│               ↳ Changed verdict text             │
│ 31 Jan 16:45| Ash    | Updated measure 1.1      │
│               ↳ NPS: 70 → 72                     │
│ 31 Jan 14:30| Chris  | Updated measure 4.7      │
│               ↳ Broken Plans: 12% → 15%         │
│               ↳ RAG: good → warning              │
│ 30 Jan 11:20| Micha  | Added new measure        │
│               ↳ Created: 2.8 Customer Retention  │
│                                                   │
│ [Load More...] (showing 5 of 247 events)         │
└──────────────────────────────────────────────────┘
```

**Search & Filter Capabilities:**
- By user (who did what)
- By date range (activity timeline)
- By action type (only show edits, only publishes)
- By report (trace all changes to Feb report)
- By entity (history of measure 3.2)
- Full-text search (find "NPS" changes)

**Export Options:**
- CSV for analysis in Excel
- JSON for programmatic access
- PDF report for FCA submission

#### 3.3.2 FCA Compliance Features

**Threshold Conditions (COND) - People & Resources:**
> "A firm must have adequate people and resources to carry out business responsibly"

**How dashboard meets requirement:**
- ✓ Documents key person dependencies (Risk Profile section)
- ✓ Tracks people risk RAG status over time
- ✓ Audit trail shows who is responsible for each area
- ✓ Version history proves oversight consistency

**Principles for Businesses (PRIN) - Integrity & Skill:**
> "A firm must conduct its business with integrity and due skill, care and diligence"

**How dashboard meets requirement:**
- ✓ Consumer Duty compliance tracking (4 outcomes + governance)
- ✓ Regular assessment cadence (quarterly minimum, monthly capable)
- ✓ RAG status changes logged and explainable
- ✓ Management oversight documented (publishing approvals)

**PRIN 11 - Relations with regulators:**
> "A firm must deal with regulators in an open and cooperative manner"

**How dashboard meets requirement:**
- ✓ Audit trail for all compliance assessments
- ✓ Immutable historical snapshots
- ✓ Exportable evidence (HTML files)
- ✓ Change logs show due diligence

**Data Retention:**
- Legal requirement: 7 years minimum
- Dashboard: Unlimited retention by default
- Backups: Daily to external storage
- Export: Proactive archival to Google Drive

#### 3.3.3 Approval Workflow (Optional - v2)
**Future enhancement for formal sign-off process**

**Potential Workflow:**
```
1. Metric owners update measures → Status: "Pending Review"
2. CCRO team reviews changes → Status: "Approved" or "Rejected"
3. If rejected → Returns to owner with comments
4. Once all approved → CCRO can publish
5. Publish requires second approver (Cath + Rob)
```

**Note:** Not included in v1, but architecture supports adding later

### 3.4 User Management & Security

#### 3.4.1 Authentication
**Google Workspace Single Sign-On (SSO)**

**Login Flow:**
```
1. User visits: https://admin.updraft-ccro.com
2. Click "Sign in with Google"
3. Google SSO prompt (if not already logged in)
4. User authenticated via @updraft.com account
5. Dashboard checks whitelist
6. If authorized → Dashboard loads
7. If not authorized → "Access Denied" message
```

**Security Features:**
- No passwords to manage (uses Google's security)
- Two-factor authentication (via Google settings)
- Session management (30 min timeout)
- Remember device option
- Audit log of all logins

**Whitelist Management:**
```
User Management Panel (CCRO Team only):

┌─────────────────────────────────────────────────┐
│ Authorized Users                    [+ Add User]│
├─────────────────────────────────────────────────┤
│                                                  │
│ cath@updraft.com         CCRO Team    Active   │
│   Last login: 1 Feb 10:20                       │
│   [Edit Role] [Deactivate]                      │
│                                                  │
│ rob@updraft.com          CCRO Team    Active   │
│   Last login: 1 Feb 10:22                       │
│   [Edit Role] [Deactivate]                      │
│                                                  │
│ ash@updraft.com          Metric Owner Active   │
│   Assigned: 1.1, 1.3, 1.4, 3.1, 3.6, 3.7       │
│   Last login: 31 Jan 16:40                      │
│   [Edit Role] [Edit Assignments] [Deactivate]   │
│                                                  │
│ chris@updraft.com        Metric Owner Active   │
│   Assigned: 1.5, 1.8, 3.3-3.5, 4.2-4.10        │
│   Last login: 31 Jan 14:25                      │
│   [Edit Role] [Edit Assignments] [Deactivate]   │
│                                                  │
│ ceo@updraft.com          Viewer       Active   │
│   Last view: 29 Jan 09:15                       │
│   [Edit Role] [Deactivate]                      │
└─────────────────────────────────────────────────┘
```

#### 3.4.2 Authorization (Role-Based Access Control)

**Role Definitions:**

**CCRO Team:**
```
Permissions:
├─ Read: All reports (draft + published)
├─ Write: All sections, all measures
├─ Publish: Can publish reports
├─ Admin: User management, system settings
├─ Audit: Full audit log access
└─ Export: Download any version
```

**Metric Owner:**
```
Permissions:
├─ Read: Published reports, own draft sections
├─ Write: Assigned measures only
├─ Publish: Cannot publish
├─ Admin: Cannot manage users
├─ Audit: View own actions only
└─ Export: Cannot download exports
```

**Viewer (ExCo):**
```
Permissions:
├─ Read: Published reports only
├─ Write: Cannot edit
├─ Publish: Cannot publish
├─ Admin: No admin access
├─ Audit: Cannot view audit logs
└─ Export: Can download published versions
```

**Row-Level Security Example:**
```sql
-- Metric owners see only their assigned measures
SELECT * FROM consumer_duty_measures
WHERE owner = current_user_email()
  OR current_user_role() = 'CCRO_TEAM'

-- Published reports visible to all
-- Draft reports visible to CCRO Team + assigned metric owner
SELECT * FROM reports
WHERE status = 'published'
  OR current_user_role() = 'CCRO_TEAM'
  OR (status = 'draft' AND has_assigned_measures(current_user_email()))
```

#### 3.4.3 Data Security

**Encryption:**
- In-transit: HTTPS/TLS 1.3 (all connections encrypted)
- At-rest: Database-level encryption (Supabase default)
- Backups: Encrypted before upload to Google Drive

**Data Classification:**
```
Confidential (Red):
├─ Executive Summary narrative
├─ Risk assessments
├─ Sensitive commentary
└─ Access: CCRO Team + ExCo only

Internal (Amber):
├─ Consumer Duty metrics
├─ Complaints data
├─ Risk profile tables
└─ Access: CCRO Team + Metric Owners + ExCo

Public (Green):
├─ None currently
└─ Future: Staff-viewable Consumer Duty Dashboard
```

**Security Headers:**
```
HTTP Headers:
├─ Content-Security-Policy: Strict (prevent XSS)
├─ X-Frame-Options: DENY (prevent clickjacking)
├─ X-Content-Type-Options: nosniff
└─ Strict-Transport-Security: max-age=31536000
```

**Regular Security Practices:**
- Dependency updates (monthly)
- Vulnerability scanning (automated)
- Access review (quarterly - Cath reviews user list)
- Penetration testing (optional, if budget allows)

### 3.5 Data Integration (Future Capability)

#### 3.5.1 Current State (v1)
**Manual data entry only - no system integration**

All data entered directly into dashboard:
- Executive Summary: Typed by Cath/Rob
- Consumer Duty metrics: Entered by metric owners
- Risk profile: Manual updates
- Complaints data: Copy-paste from tracking system

**Rationale:**
- Fastest to implement
- No integration complexities
- Flexibility to iterate structure
- Team learns system first

#### 3.5.2 Future Enhancement (v2+)
**Potential integration points:**

**Google Sheets Import:**
```
Use Case: Metric owners prefer spreadsheets
Process: 
1. Owners update Google Sheet
2. Dashboard imports on schedule or manual trigger
3. Data populates Consumer Duty metrics
4. Owners review and approve import
```

**API Connections:**
```
Potential Sources:
├─ Complaints System → Auto-populate complaints data
├─ Zendesk/Intercom → Customer satisfaction metrics
├─ Internal Data Warehouse → Collections, NPS, etc.
├─ Risk Management System → Risk profile RAG status
└─ HR System → Staff turnover, absence metrics
```

**Scheduled Imports:**
```
Monthly Process:
1. Last day of month: Systems export data
2. Dashboard imports overnight
3. Morning: Metric owners review imported data
4. Owners adjust/override as needed
5. CCRO reviews and publishes
```

**Manual Override:**
- Always possible to edit imported data
- Audit log shows "Imported from [source]" + any manual changes
- Prevents full automation (maintains human oversight)

---

## 4. Non-Functional Requirements

### 4.1 Usability
**Goal: Non-technical users can operate independently**

**Learning Curve:**
- First-time user: 15 minutes to basic competency
- Editor proficiency: 1 hour hands-on practice
- Advanced features: 2-3 hours training

**Interface Principles:**
- Familiar patterns (similar to Google Docs, Notion)
- Clear labels and instructions
- Contextual help text
- Undo/redo everywhere
- Keyboard shortcuts for power users
- Mobile-responsive (80% of features work on tablet)

**Error Messages:**
```
Bad: "Validation error: FK constraint violated on table reports_sections"
Good: "This section needs a title. Please add one before saving."

Bad: "500 Internal Server Error"
Good: "Something went wrong saving your changes. Your work is safe - try again in a moment."
```

### 4.2 Performance
**Response time targets:**

| Action | Target | Acceptable | User Impact if Slow |
|--------|--------|------------|---------------------|
| Page load (admin) | < 2s | < 3s | Frustration on every access |
| Dashboard render (view) | < 1s | < 2s | CEO annoyed |
| Section save | < 500ms | < 1s | Interrupts writing flow |
| Publish report | < 5s | < 10s | Monthly occurrence, acceptable wait |
| HTML export | < 10s | < 20s | Rare action, acceptable wait |
| Search audit log | < 2s | < 5s | Compliance urgency |

**Scalability Assumptions:**
- Max 10 concurrent editors
- Max 20 simultaneous viewers
- Report size: ~2MB (text + embedded images)
- 12 reports per year × 5 years = 60 reports in database

### 4.3 Reliability
**Uptime:** 99% (acceptable for internal tool)
- Equivalent to ~7 hours downtime per month
- Maintenance windows: Weekends

**Data Integrity:**
- Zero data loss tolerance
- Auto-save every 30 seconds
- Local browser cache fallback
- Database transactions (atomic saves)

**Backup Strategy:**
```
Tier 1: Real-time (database)
├─ Point-in-time recovery (up to 7 days ago)
└─ Instant restoration

Tier 2: Daily (automated)
├─ Full database export
├─ Uploaded to Google Drive
└─ 90-day retention

Tier 3: Monthly (manual)
├─ Complete system snapshot
├─ Includes all published HTML exports
└─ Indefinite retention for compliance
```

**Disaster Recovery:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour (max data loss)
- Runbook for Rob to restore from backup

### 4.4 Browser Support
**Primary (full support):**
- Chrome/Edge (latest 2 versions) - 80% of users
- Safari (latest 2 versions) - 15% of users

**Secondary (best effort):**
- Firefox (latest 2 versions) - 5% of users
- Mobile Safari (iOS 16+) - Tablet viewing
- Chrome Android (latest) - Tablet viewing

**Not Supported:**
- Internet Explorer (any version)
- Browsers > 2 years old

**Feature Degradation:**
- If JavaScript disabled → Basic HTML view only
- If browser too old → Warning message + read-only mode
- If mobile phone → Responsive but some features hidden

### 4.5 Accessibility (WCAG 2.1 Level AA Compliance)
**Required for:**
- Public sector procurement (if applicable)
- Inclusive design principles
- Legal compliance

**Key Requirements:**
- Keyboard navigation (all features accessible without mouse)
- Screen reader compatible (ARIA labels)
- Color contrast (4.5:1 minimum)
- Text resize (up to 200% without breaking layout)
- Focus indicators (visible when tabbing)

**Testing:**
- Lighthouse accessibility audit (score > 90)
- Manual testing with screen reader
- Keyboard-only navigation test

---

## 5. Design Requirements

### 5.1 Brand Identity & Visual Language

**Color Palette (from existing mockup):**
```
Primary Purple Shades:
├─ updraft-deep: #311B92 (headers, primary actions)
├─ updraft-bar: #673AB7 (secondary elements)
├─ updraft-dark-purple: #4A148C (accents)
├─ updraft-bright-purple: #7B1FA2 (hover states)
├─ updraft-medium-purple: #9C27B0 (borders)
├─ updraft-light-purple: #BA68C8 (backgrounds)
└─ updraft-pale-purple: #E1BEE7 (subtle backgrounds)

Status Colors (RAG):
├─ risk-green: #10B981 (good performance)
├─ risk-amber: #F59E0B (warning, monitor)
└─ risk-red: #DC2626 (harm, critical)

Neutrals:
├─ fca-dark-gray: #374151 (body text)
├─ fca-gray: #6b7280 (secondary text)
└─ bg-light: #F3F4F6 (page background)
```

**Typography:**
```
Font Families:
├─ Inter: Body text, UI elements
│   └─ Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
│
└─ Poppins: Dashboard section only
    └─ Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold)

Type Scale:
├─ H1: 2rem (32px) / Bold / -0.02em tracking
├─ H2: 1.5rem (24px) / Bold / -0.01em tracking
├─ H3: 1.25rem (20px) / Semibold
├─ Body: 0.875rem (14px) / Regular / 1.5 line-height
└─ Small: 0.75rem (12px) / Medium / 1.4 line-height
```

### 5.2 Component Library (Design System)

**Bento Cards (Primary Container):**
```css
.bento-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden;
}

.bento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border-color: #BA68C8; /* updraft-light-purple */
}
```

**Features to Preserve:**
- Subtle hover lift animation
- Border color change on hover
- Smooth transitions
- Consistent padding and shadows

**Glassmorphism Dashboard Cards:**
```css
.outcome-card {
  background: rgba(255, 255, 255, 0.40);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.10);
  border-radius: 24px;
  padding: 24px;
}

.outcome-card:hover {
  background: rgba(255, 255, 255, 0.65);
  transform: translateY(-4px) scale(1.01);
}
```

**Ambient Shapes (SVG Decorations):**
- Random abstract shapes in section backgrounds
- Subtle opacity (10-30%)
- Blur filter for soft edges
- 5 different shape variations
- Colors match section theme

**Example:**
```html
<div style="position: absolute; top: 0; right: 0; ...">
  <svg width="100%" height="100%" viewBox="0 0 400 400">
    <circle cx="380" cy="20" r="120" 
            fill="#E1BEE7" opacity="0.5" />
  </svg>
</div>
```

### 5.3 Animation & Micro-interactions

**Timing Functions:**
- Standard: `ease-in-out` (0.2s)
- Bounce: `cubic-bezier(0.25, 0.8, 0.25, 1)` (0.4s)
- Smooth slide: `cubic-bezier(0.16, 1, 0.3, 1)` (0.6s)

**Key Animations:**

**Highlight Effect (section target):**
```css
@keyframes highlight {
  0% { background-color: #E1BEE7; }
  100% { background-color: transparent; }
}

section:target {
  animation: highlight 1.5s ease-out forwards;
}
```

**Slide-in Panel (Consumer Duty measures):**
```css
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.measure-panel {
  animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Modal Fade-in:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-backdrop.show {
  animation: fadeIn 0.3s ease forwards;
}
```

**Hover Interactions:**
- Card lift (translateY -2px to -4px)
- Shadow expansion
- Icon rotation (action icons: rotate -45deg)
- Border color pulse on focus

### 5.4 Responsive Design

**Breakpoints:**
```
Mobile:  < 640px  (1 column, stacked)
Tablet:  640px - 1024px (2 columns, adjusted)
Desktop: > 1024px (3+ columns, full layout)
```

**Consumer Duty Grid:**
```css
/* Desktop: 3 columns */
.hero-grid { 
  grid-template-columns: repeat(3, minmax(0, 1fr)); 
}

/* Tablet: 2 columns */
@media (max-width: 900px) {
  .hero-grid { 
    grid-template-columns: repeat(2, minmax(0, 1fr)); 
  }
}

/* Mobile: 1 column */
@media (max-width: 600px) {
  .hero-grid { 
    grid-template-columns: 1fr; 
  }
}
```

**Mobile Optimizations:**
- Sidebar hidden, replaced with hamburger menu
- Stats cards stack vertically
- Tables scroll horizontally
- Touch-friendly buttons (min 44×44px)
- Reduced motion option

### 5.5 Print Styles
**For PDF export / printing:**

```css
@media print {
  /* Hide navigation */
  aside, header { display: none !important; }
  
  /* Full width content */
  main { width: 100% !important; margin: 0 !important; }
  
  /* Page breaks */
  section { page-break-inside: avoid; }
  h2 { page-break-after: avoid; }
  
  /* Flatten colors */
  * { background: white !important; color: black !important; }
  
  /* Show links */
  a[href]:after { content: " (" attr(href) ")"; }
}
```

### 5.6 Dashboard vs Admin Styling

**Public Dashboard (Viewer Experience):**
- Read-only, polished presentation
- Glassmorphism effects prominent
- Animations smooth and subtle
- Focus on content, minimal UI chrome
- Full-screen immersive experience

**Admin Panel (Editor Experience):**
- Functional, productivity-focused
- Clearer visual hierarchy
- More UI controls visible
- Sidebar always present
- Panels and property inspectors
- Less decoration, more utility

---

## 6. Technical Architecture

### 6.1 Technology Stack

**Frontend:**
```
Framework: Next.js 14+ (React 18)
├─ Reason: Server-side rendering, easy deployment, great DX
│
Styling: Tailwind CSS 3.x
├─ Reason: Already used in mockup, rapid development
│
UI Components:
├─ Radix UI (headless components for accessibility)
├─ Lucide React (icons - already in mockup)
├─ React DnD Kit (drag-and-drop)
└─ Lexical or Tiptap (rich text editor)

Page Builder:
├─ GrapesJS or custom (visual editor)
└─ React DnD (section reordering)

Charts:
├─ Chart.js (already in mockup)
└─ Recharts (React-native alternative)
```

**Backend:**
```
Runtime: Node.js 18+ (serverless functions)
API: Next.js API Routes (REST + server actions)
Database: PostgreSQL 15+
ORM: Prisma (type-safe, easy migrations)
```

**Database Hosting:**
```
Primary: Supabase (PostgreSQL + Auth + Storage)
├─ Free tier: 500MB database, 1GB storage
├─ Authentication built-in (Google OAuth)
├─ Row-level security (RLS) for permissions
└─ Automatic backups

Alternative: Neon, Railway (if Supabase doesn't fit)
```

**Application Hosting:**
```
Primary: Vercel (optimized for Next.js)
├─ Free tier: Unlimited deployments, 100GB bandwidth
├─ Automatic HTTPS
├─ CDN included
├─ Zero-config deployment
└─ Generous hobby limits

Alternative: Netlify, Railway (similar offerings)
```

**File Storage:**
```
Images/Media: Supabase Storage or Cloudflare R2
HTML Exports: Database (small files) or Google Drive API
Backups: Google Drive API (automated daily)
```

**Authentication:**
```
Provider: Supabase Auth (wraps OAuth)
├─ Google Workspace SSO
├─ Email whitelist in database
└─ Role-based access (custom implementation)
```

### 6.2 Data Model

**Core Entities:**

```prisma
// Prisma schema (simplified)

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          Role     @default(VIEWER)
  assignedMeasures String[] // For metric owners
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?
}

enum Role {
  CCRO_TEAM
  METRIC_OWNER
  VIEWER
}

model Report {
  id            String   @id @default(cuid())
  title         String
  period        String   // "Feb 2025"
  status        Status   @default(DRAFT)
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  sections      Section[]
  versions      ReportVersion[]
}

enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Section {
  id            String   @id @default(cuid())
  reportId      String
  type          SectionType
  position      Int      // Order in report
  title         String?
  content       Json     // Flexible content storage
  layoutConfig  Json     // Width, height, grid position
  styleConfig   Json     // Colors, borders, spacing
  templateId    String?
  componentId   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum SectionType {
  TEXT_BLOCK
  DATA_TABLE
  CONSUMER_DUTY_DASHBOARD
  CHART
  CARD_GRID
  IMPORTED_COMPONENT
  TEMPLATE_INSTANCE
}

model ConsumerDutyOutcome {
  id            String   @id @default(cuid())
  reportId      String
  outcomeId     String   // o1, o2, o3, o4, g1
  name          String
  shortDesc     String
  ragStatus     RAGStatus
  measures      ConsumerDutyMeasure[]
}

enum RAGStatus {
  GOOD
  WARNING
  HARM
}

model ConsumerDutyMeasure {
  id            String   @id @default(cuid())
  outcomeId     String
  measureId     String   // 1.1, 1.2, etc.
  name          String
  owner         String?
  summary       String
  ragStatus     RAGStatus
  metrics       ConsumerDutyMI[]
}

model ConsumerDutyMI {
  id            String   @id @default(cuid())
  measureId     String
  metric        String   // "Net Promoter Score"
  current       String
  previous      String
  change        String
  ragStatus     RAGStatus
  updatedAt     DateTime @updatedAt
}

model ReportVersion {
  id            String   @id @default(cuid())
  reportId      String
  version       Int
  snapshotData  Json     // Complete report state at publish time
  htmlExport    String?  // Generated HTML file
  publishedBy   String
  publishedAt   DateTime
  publishNote   String?
}

model Template {
  id            String   @id @default(cuid())
  name          String
  description   String
  thumbnailUrl  String?
  layoutConfig  Json
  styleConfig   Json
  contentSchema Json     // Defines placeholders
  createdBy     String
  isGlobal      Boolean  @default(false)
  createdAt     DateTime @default(now())
}

model Component {
  id            String   @id @default(cuid())
  name          String
  description   String
  htmlContent   String   @db.Text
  cssContent    String?  @db.Text
  jsContent     String?  @db.Text
  version       String
  sanitized     Boolean  @default(false)
  createdBy     String
  createdAt     DateTime @default(now())
}

model AuditLog {
  id            String   @id @default(cuid())
  timestamp     DateTime @default(now())
  userId        String
  userRole      Role
  action        String
  entityType    String
  entityId      String?
  changes       Json?
  reportId      String?
  ipAddress     String?
  userAgent     String?
}
```

### 6.3 API Structure

**REST Endpoints (Next.js API Routes):**

```
Authentication:
POST   /api/auth/google        - OAuth callback
GET    /api/auth/session       - Current user session
POST   /api/auth/logout        - Logout

Reports:
GET    /api/reports            - List all reports (filtered by role)
POST   /api/reports            - Create new report
GET    /api/reports/[id]       - Get report details
PUT    /api/reports/[id]       - Update report
POST   /api/reports/[id]/publish - Publish report
GET    /api/reports/[id]/versions - Get version history

Sections:
POST   /api/reports/[id]/sections - Add section
PUT    /api/sections/[id]      - Update section
DELETE /api/sections/[id]      - Delete section
POST   /api/sections/[id]/reorder - Reorder sections

Consumer Duty:
GET    /api/reports/[id]/consumer-duty - Get all CD data
PUT    /api/consumer-duty/measures/[id] - Update measure
PUT    /api/consumer-duty/mi/[id] - Update MI metric

Templates:
GET    /api/templates          - List templates
POST   /api/templates          - Create template
GET    /api/templates/[id]     - Get template
PUT    /api/templates/[id]     - Update template

Components:
GET    /api/components         - List imported components
POST   /api/components         - Import new component
GET    /api/components/[id]    - Get component

Users:
GET    /api/users              - List users (CCRO only)
POST   /api/users              - Add user
PUT    /api/users/[id]         - Update user role/assignments

Audit:
GET    /api/audit              - Query audit log (with filters)
GET    /api/audit/export       - Export audit log to CSV

Export:
GET    /api/reports/[id]/export/html - Generate HTML export
GET    /api/reports/[id]/export/pdf  - Generate PDF (future)
```

**Real-time Features (Optional):**
```
WebSocket / Server-Sent Events:
- Show who else is editing (presence)
- Live cursor positions (collaborative editing)
- Auto-refresh when report published
```

### 6.4 Security Architecture

**Defense in Depth:**

**Layer 1: Network**
- HTTPS only (TLS 1.3)
- HSTS headers (force HTTPS)
- Rate limiting (API routes)
- DDoS protection (Vercel/Cloudflare)

**Layer 2: Authentication**
- Google OAuth 2.0 (delegated to Supabase)
- Email whitelist check after auth
- Session tokens (JWT)
- Refresh tokens (rotate)

**Layer 3: Authorization**
- Row-level security (Supabase RLS policies)
- Server-side permission checks
- API route middleware (verify role)
- Database constraints (FK, NOT NULL)

**Layer 4: Data Validation**
- Input sanitization (DOMPurify for HTML)
- SQL injection prevention (Prisma ORM)
- XSS prevention (React auto-escapes)
- CSRF tokens (Next.js built-in)

**Layer 5: Monitoring**
- Audit logging (all actions)
- Error tracking (Sentry or similar)
- Failed login alerts
- Anomaly detection (future)

**HTML Import Security:**
```javascript
// Sanitization pipeline for imported HTML
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'section', 
  'article', 'table', 'tr', 'td', 'th', 'svg', 'path', 'circle'
];

const ALLOWED_ATTR = [
  'class', 'style', 'data-*', 'id', 'viewBox', 'd', 'fill'
];

const FORBID_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form'
];

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    FORBID_ATTR: ['onerror', 'onload'],
    ALLOW_DATA_ATTR: true
  });
}
```

### 6.5 Deployment Architecture

**Production Environment:**
```
┌─────────────────────────────────────────────┐
│ User's Browser                               │
└──────────────┬──────────────────────────────┘
               │ HTTPS
               ↓
┌─────────────────────────────────────────────┐
│ Vercel Edge Network (CDN)                    │
│ ├─ Static assets cached                     │
│ ├─ SSL/TLS termination                      │
│ └─ DDoS protection                           │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ Next.js Application (Serverless)            │
│ ├─ SSR pages                                │
│ ├─ API routes                               │
│ └─ Authentication                            │
└───────┬──────────────────┬──────────────────┘
        │                  │
        ↓                  ↓
┌──────────────┐  ┌─────────────────────────┐
│ Supabase     │  │ Google Drive API        │
│ ├─ PostgreSQL│  │ └─ Backup storage       │
│ ├─ Auth      │  └─────────────────────────┘
│ └─ Storage   │
└──────────────┘
```

**Deployment Process:**
```bash
# Git-based deployment (automatic)
git push origin main
  ↓
Vercel detects push
  ↓
Build Next.js app
  ↓
Run database migrations (Prisma)
  ↓
Deploy to production
  ↓
Invalidate CDN cache
  ↓
Live in ~2 minutes
```

**Environment Variables:**
```env
# Stored in Vercel dashboard (encrypted)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_DRIVE_API_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://admin.updraft-ccro.com
```

### 6.6 Monitoring & Observability

**Error Tracking:**
- Sentry (free tier: 5k events/month)
- Captures frontend + backend errors
- Source maps for readable stack traces
- Alerts on Slack for critical errors

**Performance Monitoring:**
- Vercel Analytics (built-in)
- Web Vitals tracking (LCP, FID, CLS)
- API route latency
- Database query performance

**Uptime Monitoring:**
- UptimeRobot (free: 50 monitors)
- Check every 5 minutes
- Alert via email if down

**Usage Analytics (Optional):**
- Plausible or Simple Analytics (privacy-friendly)
- Track: Page views, publish events, feature usage
- No personal data collection

---

## 7. Implementation Plan

### 7.1 Development Phases

**Phase 1: Core CMS (Week 1)**
```
Days 1-2: Project Setup & Database
├─ Initialize Next.js project
├─ Setup Supabase (database + auth)
├─ Define Prisma schema
├─ Create database migrations
└─ Implement Google OAuth

Days 3-4: Basic Editing
├─ Rich text editor (Lexical/Tiptap)
├─ Section CRUD (create, read, update, delete)
├─ Simple layout (list sections, edit one at a time)
└─ Auto-save functionality

Days 5-7: Consumer Duty Dashboard
├─ Outcome/measure/MI data model
├─ Interactive card rendering
├─ Modal detail view
├─ Metric owner data entry forms
└─ RAG status indicators

Deliverable: Can create draft reports, edit content, view Consumer Duty dashboard
```

**Phase 2: Publishing & Versioning (Week 2, Days 1-3)**
```
Days 8-9: Publishing System
├─ Publish workflow (validation, confirmation)
├─ Immutable snapshot creation
├─ Version history viewer
├─ Compare versions feature
└─ HTML export generator

Day 10: Audit Trail
├─ Audit log database schema
├─ Log all user actions
├─ Audit viewer with filters
└─ CSV export

Deliverable: Can publish reports, view history, full audit trail
```

**Phase 3: Visual Editor (Week 2, Days 4-7)**
```
Days 11-12: Layout Editor
├─ Drag-and-drop section reordering
├─ Grid-based resizing
├─ Layout type selector (1-col, 2-col, etc.)
└─ Preview mode

Days 13-14: Styling Controls
├─ Color pickers (background, border)
├─ Spacing sliders (margin, padding)
├─ Border style options
├─ Image upload and positioning
└─ Properties panel UI

Deliverable: Visual editor for layout and styling
```

**Phase 4: Advanced Features (Week 3)**
```

Days 15-16: HTML Import
├─ Component upload/paste interface
├─ HTML sanitization (DOMPurify)
├─ Shadow DOM sandboxing
├─ Component library manager
└─ Insert into report

Days 17-18: Template System
├─ Save section as template
├─ Template library UI
├─ Template instantiation
├─ Placeholder/variable system
└─ Template versioning

Days 19-20: Polish & Testing
├─ User testing with Cath + one metric owner
├─ Bug fixes
├─ Performance optimization
├─ Documentation
└─ Deployment to production

Deliverable: Fully functional system ready for use
```

### 7.2 Testing Strategy

**Unit Tests:**
- Critical functions (HTML sanitization, RAG calculations)
- Database queries (Prisma models)
- API routes (permission checks)
- Target: 60% code coverage

**Integration Tests:**
- End-to-end user flows (create report → edit → publish)
- Authentication flow
- Data integrity (publish creates immutable snapshot)

**Manual Testing:**
- User acceptance testing (UAT) with Cath
- Metric owner workflow testing with Ash or Chris
- Browser compatibility testing
- Mobile/tablet testing
- Accessibility testing (keyboard nav, screen reader)

**Load Testing (Optional):**
- Simulate 10 concurrent editors
- Verify performance targets
- Stress test database

### 7.3 Training & Onboarding

**Documentation:**
```
User Guides:
├─ CCRO Team Guide (comprehensive)
│  ├─ Creating reports
│  ├─ Using visual editor
│  ├─ Importing HTML components
│  ├─ Creating templates
│  └─ Publishing workflow
│
├─ Metric Owner Guide (focused)
│  ├─ Logging in
│  ├─ Finding assigned measures
│  ├─ Updating metrics
│  └─ Understanding RAG status
│
└─ Viewer Guide (minimal)
   ├─ Accessing reports
   └─ Navigating dashboard

Video Tutorials:
├─ 2-min: Quick overview
├─ 10-min: CCRO walkthrough
└─ 5-min: Metric owner walkthrough
```

**Training Sessions:**
```
Week 1 of Deployment:
├─ Day 1: CCRO team (Cath, Rob, new member) - 2 hours
│  └─ Hands-on: Create test report together
│
├─ Day 3: Metric owners (group session) - 1 hour
│  └─ Demo: How to update your measures
│
└─ Day 5: Drop-in Q&A session - 30 mins
   └─ Answer questions, troubleshoot issues
```

**Support:**
- Slack channel: #ccro-dashboard-help
- Rob as primary support contact
- Office hours: Tuesday/Thursday 2-3pm

### 7.4 Rollout Plan

**Soft Launch (Week 1):**
```
Users: CCRO team only (Cath, Rob, new member)
Goal: Iron out bugs, refine workflow
Activities:
├─ Create Feb 2025 report in parallel with old system
├─ Compare outputs
├─ Iterate on issues
└─ Don't share with ExCo yet
```

**Metric Owner Onboarding (Week 2):**
```
Users: + Ash, Chris, Micha, Cath
Goal: Test collaborative editing
Activities:
├─ Metric owners update their measures
├─ CCRO reviews and publishes
├─ Still not shared with ExCo
└─ Gather feedback
```

**Full Launch (Week 3):**
```
Users: Everyone (CCRO + Metric Owners + ExCo)
Goal: First real published report via new system
Activities:
├─ Create March 2025 report
├─ Publish to ExCo
├─ CEO reviews (critical feedback)
└─ Retire old HTML system
```

**Post-Launch (Month 2+):**
```
├─ Monitor usage and issues
├─ Collect feature requests
├─ Prioritize enhancements
└─ Quarterly review with Cath
```

### 7.5 Success Metrics (KPIs)

**Adoption Metrics:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| CCRO team login rate | 100% (weekly) | Audit log |
| Metric owner update rate | 100% (monthly) | Completion tracking |
| ExCo view rate | 80% (monthly) | Analytics |
| Report publish frequency | Monthly | Publish count |

**Efficiency Metrics:**
| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Report creation time | 3 days | < 2 hours | Time tracking |
| Metric update time | 2 hours (via email) | < 15 mins | User survey |
| Publish time | 1 hour (manual) | < 5 mins | System timer |

**Quality Metrics:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Data loss incidents | 0 | Incident log |
| Security breaches | 0 | Security log |
| Audit trail completeness | 100% | Audit verification |
| CEO satisfaction | Maintained | Quarterly feedback |

---

## 8. Risks & Mitigation

### 8.1 Technical Risks

**Risk: Database exceeds free tier limits**
- **Likelihood:** Low (60 reports @ 2MB = 120MB < 500MB limit)
- **Impact:** Medium (need to pay for hosting)
- **Mitigation:** Monitor usage monthly, upgrade to paid tier if needed (~$5/mo)

**Risk: Vercel exceeds free tier bandwidth**
- **Likelihood:** Low (internal tool, limited users)
- **Impact:** Medium (need to pay for hosting)
- **Mitigation:** Monitor analytics, paid tier is ~$20/mo

**Risk: Performance degrades with large reports**
- **Likelihood:** Medium (complex Consumer Duty dashboard)
- **Impact:** Medium (user frustration)
- **Mitigation:** Implement pagination, lazy loading, performance testing

**Risk: HTML import security vulnerability**
- **Likelihood:** Low (proper sanitization)
- **Impact:** High (XSS attack possible)
- **Mitigation:** DOMPurify, security review, penetration testing

### 8.2 Adoption Risks

**Risk: Users find visual editor too complex**
- **Likelihood:** Medium (new paradigm)
- **Impact:** High (revert to manual HTML editing)
- **Mitigation:** Extensive training, fallback to simple mode, iterate based on feedback

**Risk: Metric owners don't update measures**
- **Likelihood:** Medium (behavior change)
- **Impact:** High (incomplete reports)
- **Mitigation:** Reminders, make it easy (bulk entry), CCRO follow-up

**Risk: CEO dislikes new interface**
- **Likelihood:** Low (interactive features preserved)
- **Impact:** Critical (project failure)
- **Mitigation:** Preview demo before launch, iterate on feedback

### 8.3 Operational Risks

**Risk: Rob leaves, no one can maintain system**
- **Likelihood:** Low (Rob committed)
- **Impact:** High (system orphaned)
- **Mitigation:** Documentation, code comments, consider external contractor backup

**Risk: FCA audit finds gaps in compliance**
- **Likelihood:** Low (built for compliance)
- **Impact:** Critical (regulatory action)
- **Mitigation:** Pre-audit review, legal consultation, external audit

**Risk: Data loss during migration**
- **Likelihood:** Low (careful testing)
- **Impact:** Critical (lose historical data)
- **Mitigation:** Backups, parallel systems, verification

### 8.4 Business Risks

**Risk: Updraft IT blocks external tools**
- **Likelihood:** Low (Google Workspace already approved)
- **Impact:** High (need on-prem solution)
- **Mitigation:** Early IT consultation, security documentation

**Risk: Costs spiral beyond free tier**
- **Likelihood:** Low (usage predictable)
- **Impact:** Medium (need budget approval)
- **Mitigation:** Set usage alerts, have fallback plan

**Risk: Regulatory requirements change**
- **Likelihood:** Medium (FCA evolves)
- **Impact:** Medium (need to adapt)
- **Mitigation:** Flexible architecture, monitor regulatory updates

---

## 9. Assumptions & Dependencies

### 9.1 Assumptions

**User Behavior:**
- Users have stable internet (no offline mode needed)
- Users have modern browsers (Chrome/Safari latest)
- Users are comfortable with web applications
- Metric owners will respond to monthly update requests
- CCRO team will provide timely review and approval

**Technical:**
- Free tier limits sufficient for first year
- Google Workspace SSO remains available
- No complex data transformations needed
- Report structure remains relatively stable
- External HTML components are safe (user-designed)

**Business:**
- Budget remains at £0 (or minimal)
- Regulatory requirements stable
- Team size remains ~10 users
- Quarterly reporting cadence acceptable (monthly aspirational)

### 9.2 Dependencies

**External Services:**
- Google Workspace (authentication)
- Vercel (hosting)
- Supabase (database, auth)
- Google Drive API (backups - optional)

**Internal:**
- IT approval for external hosting
- DNS access for custom domain (optional)
- Time commitment from Cath (testing, feedback)
- Time commitment from metric owners (data entry)

**Tools:**
- Claude Code (for development)
- Modern code editor (VS Code)
- Git (version control)
- npm (package management)

---

## 10. Out of Scope (Explicitly NOT Included)

**Not in v1:**
- ❌ Real-time collaborative editing (Google Docs-style)
- ❌ Mobile native apps (mobile web is sufficient)
- ❌ Advanced data visualization tools (Tableau-like)
- ❌ AI-powered insights or recommendations
- ❌ Automated report generation
- ❌ Integration with internal systems (manual entry only)
- ❌ Multi-language support
- ❌ Advanced workflow (approval chains with routing)
- ❌ Version control branching (Git-like)
- ❌ User activity analytics (beyond basic audit log)
- ❌ Custom domain email notifications
- ❌ Slack integration (v2)
- ❌ PDF export (HTML export only in v1)
- ❌ Advanced permissions (granular field-level)
- ❌ Bulk user import
- ❌ API for third-party integrations

**Future Consideration:**
These features may be added in v2+ based on:
- User feedback and demand
- Budget availability
- Regulatory requirements
- Technical feasibility

---

## 11. Approval & Sign-off

### 11.1 Stakeholder Review

**Primary Stakeholders:**
- **Cath (CCRO):** Business owner, primary user
- **Rob:** Technical lead, developer
- **CEO:** Consumer of reports, quality gatekeeper

**Review Process:**
1. Cath & Rob review requirements document
2. Discuss and clarify any questions
3. Present to CEO (15-min overview)
4. Gather feedback and iterate
5. Final sign-off from Cath

### 11.2 Success Criteria for Approval

**Must Have (Non-negotiable):**
- ✅ Easy editing for non-technical users
- ✅ Consumer Duty interactive dashboard preserved
- ✅ Complete audit trail for FCA compliance
- ✅ Immutable version history
- ✅ HTML export capability
- ✅ Professional appearance maintained

**Should Have (Strongly desired):**
- ✅ Visual layout editor (drag-and-drop)
- ✅ HTML component import
- ✅ Template system
- ✅ Monthly reporting capable (not just quarterly)

**Could Have (Nice to have):**
- ⚪ Real-time collaboration
- ⚪ Slack/email notifications
- ⚪ PDF export (HTML sufficient for v1)

### 11.3 Decision Points

**Before Development Starts:**
- [ ] Confirm budget: £0 acceptable (free tier tools)
- [ ] Confirm timeline: 2-3 weeks realistic
- [ ] Confirm approach: Claude Code (local development)
- [ ] Confirm scope: All features in spec or phase some to v2?

**Before Launch:**
- [ ] IT approval obtained
- [ ] Security review completed (if required)
- [ ] User training scheduled
- [ ] Backup plan defined (if something goes wrong)

### 11.4 Approval Signatures

**Requirements Approved By:**

```
_________________________________    Date: __________
Cath (CCRO)
Business Owner


_________________________________    Date: __________
Rob
Technical Lead


_________________________________    Date: __________
CEO (Optional)
Executive Sponsor
```

---

## 12. Appendices

### Appendix A: Glossary

**CCRO:** Chief Compliance and Risk Officer  
**Consumer Duty:** FCA regulation requiring firms to ensure good customer outcomes  
**RAG Status:** Red/Amber/Green risk indicator  
**MI:** Management Information (metrics and KPIs)  
**ExCo:** Executive Committee  
**FCA:** Financial Conduct Authority (UK regulator)  
**SSO:** Single Sign-On  
**RLS:** Row-Level Security  
**WCAG:** Web Content Accessibility Guidelines  

### Appendix B: Reference Materials

**Existing Mockup:** mockup_13_2.html (provided)  
**FCA Consumer Duty:** https://www.fca.org.uk/firms/consumer-duty  
**Threshold Conditions:** https://www.handbook.fca.org.uk/handbook/COND/  

### Appendix C: Contact Information

**Project Team:**
- Cath (CCRO): cath@updraft.com
- Rob (Technical Lead): rob@updraft.com

**Escalation:**
- CEO: [contact]
- IT Department: [contact]

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 13 Feb 2025 | Claude | Initial draft |
| 0.2 | 13 Feb 2025 | Claude | Added HTML import requirements |
| 0.3 | 13 Feb 2025 | Claude | Added visual editor & template system |
| 1.0 | 13 Feb 2025 | Claude | Final version for stakeholder review |

**Distribution:**
- Cath (CCRO)
- Rob (Technical Lead)
- CEO (for information)

**Status:** DRAFT - PENDING APPROVAL

---

**END OF REQUIREMENTS DOCUMENT**

Total pages: ~50 (as PDF)  
Total word count: ~15,000 words  
Reading time: ~60 minutes  

**Next Step:** Review with Cath in meeting, gather feedback, obtain approval to proceed.
