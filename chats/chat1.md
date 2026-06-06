# Disaster Drone Wizard

_Started 2026-05-16 09:06 UTC_

---

## User

i want to mock up a step by step wizard like process, in a mobile first responsive web app, for guiding users through a process of completing steps (configurably) of collecting data to allow a tethered drone, that contains communications equipment e.g. 4g cell or wifi router, etc. for deployment in an area where communications have been temporarily cut off, e.g. in a disaster - the process should take the user through to completion before integrating to a drone control system that will launch the drone - some steps will be already completed beforehand, but just need to be reviewed - and the steps will be location specific, so the first step will be determining the location - for the design we just need a wizard interface paradigm, the questions don't really matter, but they could be all different kinds of data capture, including to take a picture, sign a document with a finger on the screen, pick a location from dot on a map, using a slider to set the height of the drone (for example), etc. and other user friendly ways of building up a wealth of information about the safety and regulatory situation of performing this technical task in tricky situations - the fields and screens should have a helpful and informative structure, and be able to play back information, for example, where this has already been completed before-hand.

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- device_target: Phone + tablet responsive
- theme: Light (clean, daylight ops)
- steps_to_show: Location pin on map, Photo capture of launch site, Finger signature (operator sign-off), Regulatory checklist (pre-filled, review), Weather check (auto-populated), Airspace clearance (auto + manual), Hazard radio buttons (people / power lines), Emergency contact form, Crew composition multi-select, Risk acceptance / acknowledge
- wizard_chrome: Decide for me
- navigation: Sticky Back / Next buttons at bottom
- review_pattern: slightly more technical than 'looks good' - e.g. 'agree and continue' CTA
- completion_state: can we also add some aspect of monitoring and control notification, e.g. flight logs and data being stored
- interactions_polish: Mostly interactive, but some inputs are visual-only
- tweaks: Theme (light/dark), Number of steps in flow, Pre-filled vs fresh state
- anything_else: this is a technical activity - consider the interface functionality, e.g. usability, clarity, compatibility and accuracy over the flowy visual aspects of interface design

## Assistant

_[tool: update_todos]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: copy_files]_

_[tool: copy_starter_component]_

Excellent — I have everything I need. Let me set up assets and build the wizard.

_[tool: write_file]_

Now let me lay out the architecture. I'll split into focused JSX files for editability.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now the CSS and HTML shell.

_[tool: write_file]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Built a mobile-first responsive wizard for Sky-Fi drone deployment. Highlights:

**11 step types** with the technical/field bias you asked for:
- **Location** — tappable map with no-fly overlay, GPS, live coordinate readout
- **Weather** (auto) — full telemetry grid + 6h forecast bars with operational limit line
- **Airspace** (auto + manual) — automated lookups + NOTAM list + 4 mandatory manual ack checkboxes
- **Compliance** (pre-filled) — 8 items with expandable detail, source authority, verification path
- **Site photos** — 3-frame grid with embedded metadata (timestamp, heading, GPS imprint)
- **Hazards** — radio sets with explicit high-risk options that block launch
- **Crew** — multi-select roster + separate PiC selection with certificate IDs
- **Emergency contact** — form + "what will trigger a callout" list
- **Parameters** — sliders for altitude / tether / window with coverage estimation
- **Sign-off** — live finger signature canvas + sealed-payload preview
- **Risk** — composite score on a thresholded bar + final combined acknowledgment
- **Launch handoff** — sealing animation → telemetry stream + live flight log

**Technical-leaning details** throughout: every field has a reference code (LOC-001, REG-04…), values are monospaced with units, sources are cited, status pills use abstract states (PRE-FILLED / READY / COMPLETE / PENDING), pre-filled steps surface "Agree & continue" while empty ones say "Continue".

**Responsive:**
- Phone: top progress strip, hamburger drawer for step list, sticky bottom Back/Next
- Tablet+: persistent left rail with status glyphs + package metadata + auto-save indicator

**Tweaks panel** controls: theme (light/dark), number of steps (6–11), pre-filled mode (mixed / all / fresh).

Caveats / next steps you might want:
- The map and photo step are simplified — happy to wire in a real tile provider or working camera capture if useful.
- Crew, hazard catalogues, NOTAMs etc. are realistic-but-sample data — easy to template these from a real dispatch payload.
- No back-end persistence; the sealing/hash on the launch screen is mocked.

## User

Save as standalone HTML: Sky-Fi Virtual Mast Wizard.html

## User

Save this design as a PDF: Sky-Fi Virtual Mast Wizard.html

## User

Save this design as a PDF: Sky-Fi Virtual Mast Wizard.html

## Assistant

_[tool: write_file]_

_[tool: write_file]_

## Assistant

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: show_html]_

I'll create a print version that renders every wizard step (and the handoff) as separate pages, with realistic pre-filled data so the design is fully visible.

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: open_for_print]_

Clean. Opening for print.The print dialog should have opened in a new tab — if not, [open the print file here](https://019e3009-d96c-7dad-b861-c97cdfe1e707.claudeusercontent.com/v1/design/projects/019e3009-d96c-7dad-b861-c97cdfe1e707/serve/Sky-Fi%20Virtual%20Mast%20Wizard-print.html?t=f0a26259aec73817bb6da6668663ae0ce2dff72b1879ae5b401bace6837db85c.06e21c5d-8501-413a-bc9f-77c11fef2aa2.7eabe724-2585-40bc-afad-b5c626c87d4d.1779196467&direct=1) and press Cmd/Ctrl-P → Save as PDF. It's paginated to A4 portrait with a cover page, one page per wizard step (all pre-filled with realistic data), and a final launch-handoff page.

