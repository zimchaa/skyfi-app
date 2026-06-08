# Sky-Fi Virtual Mast Wizard — Real-World Deployment Architecture

_Design plan for taking the prototype to a field-deployable, offline-first, safety-critical tool running on a low-power device (Raspberry Pi class)._

---

## 1. Deployment context & hard constraints

The wizard's purpose defines its architecture. It guides an operator through launching a **tethered comms drone** (4G/WiFi payload) into an area **where communications have been cut off** — a disaster zone. That single fact drives everything:

| Constraint | Why it matters | Consequence |
|---|---|---|
| **Disconnected by definition** | The whole reason the drone exists is that there's no network. The wizard runs *before* the drone is up, so there is no uplink during the wizard. | Must be **fully functional offline**. Any data the wizard "looks up" (weather, NOTAMs, regulatory) must be pre-staged on the device or fetched opportunistically. |
| **Low-power field device** | Runs on battery/solar at the launch site, possibly for days. | The current stack (React dev build + in-browser Babel transpile on every load) is a non-starter. Need a built static bundle + a near-idle server. |
| **Safety- & regulatory-critical** | This is an aviation sign-off with cryptographic sealing and (per the brief) 7-year log retention. | Data integrity, crash recovery, real signing, tamper-evidence, audit trail are first-class — not afterthoughts. |
| **Operated on a phone/tablet** | The brief is explicit: mobile-first, phone + tablet. | The compute device (Pi) and the display device (operator's phone) are **separate**. The Pi serves; the phone renders. |
| **Untrusted environment** | Devices can be lost, captured, or damaged in a disaster zone. | Disk encryption, key custody, secure boot, remote revocation matter. |

The good news: because the **phone does the rendering**, the Pi's job is to serve static assets and run a small API. The frontend imposes almost no CPU cost on the Pi. That reshapes where we spend effort — frontend stays cheap; the value is in the offline data plane, persistence, crypto, and integration.

---

## 2. Field topology

```
        ┌─────────────────────────────────────────────┐
        │  LAUNCH SITE (offline)                       │
        │                                              │
        │   operator's phone/tablet                    │
        │        │  (WiFi to the Pi's own SSID)        │
        │        ▼                                     │
        │   ┌──────────────────────────────┐          │
        │   │  Raspberry Pi (Ground Station)│          │
        │   │  • WiFi AP (hostapd)          │          │
        │   │  • captive portal → wizard    │          │
        │   │  • static SPA + local API     │          │
        │   │  • SQLite (sessions, packages)│          │
        │   │  • crypto sealing / signing   │          │
        │   │  • offline map tiles (PMTiles)│          │
        │   └───────┬───────────────┬───────┘          │
        │           │ tether data   │ when a bearer    │
        │           ▼  line         │ appears          │
        │   ┌───────────────┐       ▼                  │
        │   │ Drone autopilot│   Starlink / Iridium /  │
        │   │ (PX4/ArduPilot)│   the drone's own 4G    │
        │   └───────────────┘   once airborne          │
        └─────────────────────────────────────────────┘
                                │ opportunistic sync
                                ▼
                    ┌──────────────────────┐
                    │  Ops Centre (cloud)   │  ← briefing bundles out,
                    │  • briefing generator │    sealed packages + logs in,
                    │  • 7-yr audit store   │    fleet mgmt, ruleset updates
                    │  • fleet dashboard    │
                    └──────────────────────┘
```

Key idea: the **Pi is the ground control station and a self-contained WiFi access point**. The operator joins the Pi's network and opens the wizard in a browser — no internet required. The Pi talks "up" to the drone autopilot over the tether's data line, and "out" to the ops centre only when a bearer is opportunistically available.

---

## 3. Productionising the frontend (off the prototype)

Keep the React design — the investment is in the UX and it costs the Pi nothing to serve. But replace the prototype delivery:

| Prototype (now) | Production |
|---|---|
| CDN React + ReactDOM (dev builds) | Bundled, pinned, vendored locally (no CDN — there's no internet) |
| `@babel/standalone` transpiling JSX in the browser on every load | **Vite + TypeScript**, compiled once at build time to a static bundle |
| In-memory state, lost on refresh | **IndexedDB autosave per field** (the rail already shows "Auto-save 00:14 ago" — make it real) |
| Single HTML file | **PWA**: service worker, offline cache, installable, app-shell |
| Synthetic SVG map | **MapLibre GL JS + offline tiles** (see §4) |
| Mocked signature → `signed: true` | Real signature capture → canvas → PNG/SVG vector → hashed into the package |

Recommended specifics:
- **Vite + React + TypeScript**, output a static `dist/` the Pi serves directly.
- **Preact/compat** as a drop-in swap is worth measuring — it trims the runtime to a few KB, which helps first-load on older phones and a Pi serving over WiFi. Low risk given the app uses plain React primitives.
- **TypeScript everywhere** — for a safety-critical form engine, the step validators (`STEP_VALIDATORS`) and the sealed-package schema should be typed and shared with the backend (see §6).
- Make the **step definitions data-driven** (they already are, in `ALL_STEPS`). This is the seam that lets the ops centre configure which steps appear per mission via the briefing bundle — matching the brief's "configurably" requirement.

---

## 4. Offline data plane (the hard part)

Several steps display data that is online in the prototype — weather (`met.skyfi.cloud`), airspace/NOTAMs (ICAO/EUROCONTROL/DGCA), regulatory items "pre-filled by dispatch." In the field there is no network to fetch these. The resolution is the **Briefing Bundle**.

### 4.1 Briefing bundles
A **signed, versioned data package** generated by the ops centre *while the device still has connectivity* (staging, depot, or over a satellite bearer), then carried into the field. This is exactly the prototype's own framing — "package #P-2026-051611 · sealed 08:14Z, pre-filled by dispatch." Make that real.

A bundle contains, for a specific Area of Operations and time window:
- Forecast weather for the window (with a **max-age / staleness** marker — the UI already overrides forecast with on-site readings, which is the correct safety pattern).
- NOTAMs, airspace classes, active waivers in radius.
- Regulatory checklist state + source references + signatures.
- Crew manifest, emergency contacts.
- **Offline map tiles** for the AO.
- The step configuration for this mission (which steps, thresholds, blocking rules).

The bundle is **signed by the ops centre**; the device verifies the signature before trusting any "pre-filled / verified" status. This closes a real safety hole — the prototype currently *asserts* "VERIFIED" with no provenance.

### 4.2 Map tiles
- **PMTiles** (single-file, HTTP-range-friendly, served as a static file) + **MapLibre GL JS** on the client. This is the cleanest offline fit: one file in the bundle, no tile server process, near-zero Pi cost.
- Alternative: **MBTiles + a tile server** (tileserver-gl / martin) if you need dynamic styling — heavier, only if justified.
- Replaces the synthetic SVG map in the Location step with real terrain, while keeping the no-fly overlay and pin-drop interaction.

### 4.3 Opportunistic sync
When *any* bearer appears (Starlink/Iridium terminal, intermittent cell, or the drone's own 4G once airborne):
- **Push**: sealed flight packages + flight logs to the ops centre (durable, for the 7-year store).
- **Pull**: refreshed briefing data, regulatory ruleset updates, app/OTA updates.
- Implement as a **durable outbound queue** in SQLite drained by a background worker — never block the wizard on connectivity.
- **Litestream** streaming the SQLite WAL to object storage is a low-effort way to get continuous off-device backup whenever a link exists.

---

## 5. Backend service & language / web-server options

This is the part you specifically asked to weigh. The device-side service must: serve the static SPA, expose a small API (sessions, sealing, packages, logs, bundle install), run the crypto, talk to the autopilot, and drain the sync queue — all on a low-power ARM board, ideally as **one static binary with no runtime dependencies** (fewer moving parts in the field = fewer field failures).

### 5.1 Language comparison (device-side)

| Option | Deploy footprint | RAM idle | Power | Dev velocity | Safety/crypto fit | Verdict for the Pi |
|---|---|---|---|---|---|---|
| **Go** | Single static binary, `embed.FS` bundles the SPA; trivial `GOARCH=arm64` cross-compile | ~15–30 MB | Low | High | Solid stdlib crypto (Ed25519, x509), easy mTLS, great concurrency for sync/telemetry | **Recommended primary.** Best balance of efficiency, single-binary simplicity, and team velocity. |
| **Rust** (axum/actix) | Single binary, smallest & fastest | ~5–15 MB | Lowest | Lower (steeper) | Memory-safe — attractive for the safety-critical **sealing core**; mature crypto crates | **Recommended for the sealing/crypto module**, or the whole service if the team is Rust-fluent. |
| **Node.js** (Fastify) | Needs runtime; shares language with the frontend (could SSR) | ~80–150 MB | Higher | Highest | Works but heavier; crypto via libs | Only if velocity dominates and the Pi has ≥4 GB. Not ideal for low-power. |
| **Python** (FastAPI/uvicorn) | Needs runtime; richest geo/aviation/data libs | ~60–120 MB | Highest | High | GIL limits concurrency; heaviest on-device | **Use in the cloud** for briefing-bundle generation and data ingestion — *not* on the field device. |

**Recommendation:** a **Go single-binary** on the device (serves embedded static assets + API + sync), with the **cryptographic sealing implemented as a small, audited Rust component** if the safety case demands a memory-safe core. Keep **Python in the cloud** for the data-heavy briefing-bundle pipeline where its aviation/geo ecosystem shines and power is irrelevant.

### 5.2 Web-server / serving tooling
- **Simplest & lowest-power:** serve everything from the Go binary's own `net/http` — embedded static SPA + JSON API on `localhost`/the AP interface. No separate web server process.
- **If you want config-driven serving + automatic TLS/mTLS:** **Caddy** (single Go binary, tiny, great defaults). Good for terminating mTLS to the ops centre.
- **Avoid nginx** here unless existing ops familiarity demands it — it's another moving part and process to manage on a constrained device for little gain at this scale.
- **Captive portal**: a DNS + redirect shim (dnsmasq + a catch-all route) so when the operator joins the Pi's SSID, the wizard opens automatically.

### 5.3 Why not server-side render?
Tempting (Node could SSR the React), but it buys little: the phone is perfectly capable of rendering a small SPA, and SSR adds a heavier runtime + complexity to the constrained device. Ship a static SPA; keep the device server thin.

---

## 6. Persistence & data integrity

- **SQLite in WAL mode** on the Pi — embedded, ACID, single file, crash-safe, near-zero overhead. Ideal for a field device.
- **Autosave every field mutation** to SQLite so a power loss at *any* step loses nothing; on restart, **resume the in-progress wizard** at the last step. (The UI already implies this with the auto-save indicator — wire it to real storage.)
- **Append-only audit log** table for the regulatory trail; entries are content-addressed (hashed) and chained, so tampering is detectable.
- **Shared schema**: define the sealed-package and step-data schema once (e.g. JSON Schema / TypeScript types generated from a single source) and validate on both the client and the Go/Rust backend. Safety-critical forms should never trust client-only validation.

---

## 7. Security & cryptographic sealing

The prototype mocks this (`hash: 'sha256:7e3b…'`, `signed: true`). For real deployment:

- **Operator identity**: PiC signs with a key unlocked by PIN/biometric, or a **smartcard/YubiKey** over USB. The signature binds the operator to the package (matching the "Signing as: Aydın Demir, VFF-PiC-2024-118" screen).
- **Device key**: hardware-backed where possible — a **secure element (ATECC608B)** or **TPM 2.0** on the carrier board. Device counter-signs the package.
- **Sealing**: canonicalise the wizard data (deterministic JSON), hash (SHA-256), sign with **Ed25519** (operator + device). The "seal" is the real signature set, not a display string.
- **Transport**: **mTLS** for Pi↔ops-centre and Pi↔drone-control; device and ops centre hold each other's certs.
- **At rest**: full-disk encryption (LUKS) on the data partition; keys protected by the secure element. So a captured device doesn't leak the audit trail or keys.
- **Revocation**: ops centre can revoke a lost device's cert; bundles and packages carry expiry.
- **Secure/verified boot** to prevent tampered firmware on a device that lives in the field.

---

## 8. Drone control integration

The prototype ends with a mocked "hand off to flight control." Real options:

- **MAVLink** (PX4 / ArduPilot) is the de-facto autopilot interface. The wizard's outputs map cleanly:
  - Pin + tether radius + altitude ceiling → a **cylindrical geofence**.
  - Flight window → mission time limit.
  - Hazard-derived max altitude / standoff → geofence + parameter clamps.
- The **sealed flight package** (signed JSON) is the contract: POST it to the drone control system's API, or write it to a watched location the controller ingests after verifying the signature.
- The **handoff/monitoring screen** (currently animated mock telemetry) becomes a real **MAVLink telemetry subscriber** — tether tension, GPS lock, link quality, battery — streamed from the autopilot over the tether line. Flight logs persist to SQLite and sync to the ops centre.

Define this as a **documented, versioned interface** early — it's the integration most likely to depend on Vodafone's specific drone platform, so it deserves a clear contract and a simulator (SITL — ArduPilot/PX4 software-in-the-loop) for testing without hardware.

---

## 9. Hardware, OS image & resilience

- **Board**: Raspberry Pi 4/CM4 (lower power) or Pi 5 (more headroom). **CM4 on a rugged carrier** is the natural choice for an integrated ground station — gives you the secure element, proper power input, and environmental sealing.
- **Power budget**: a static-serving Go binary keeps the SoC near idle (~3–7 W). Run from the drone's ground power or a battery + solar; size accordingly.
- **OS image**: minimal (Pi OS Lite / Yocto/Buildroot for a locked-down image). **Read-only root filesystem (overlayfs)** + a separate **encrypted writable data partition** — survives power loss and resists corruption.
- **Process supervision**: `systemd` with a **hardware watchdog**; auto-restart the service; resume the wizard session on boot.
- **OTA updates**: **RAUC** or **Mender** for signed **A/B partition** updates — push new app versions *and* regulatory rulesets as signed content packs without bricking field devices. Critical, because regulations and waivers change.

---

## 10. Phased roadmap

**Phase 0 — Harden the prototype (frontend only, still runs as static on a Pi).**
Vite + TS build, vendor React locally, PWA + service worker, IndexedDB autosave + session resume, real signature capture, shared typed schema + real validation. _Quick win; immediately Pi-servable._

**Phase 1 — Local device service.**
Go single-binary: serve embedded SPA + API, SQLite (WAL) persistence, **real crypto sealing**, captive portal + WiFi AP, offline map tiles (PMTiles + MapLibre). The wizard is now fully functional offline end-to-end.

**Phase 2 — Data plane & sync.**
Cloud briefing-bundle generator (Python); device verifies and installs signed bundles; durable outbound queue for sealed packages + logs; Litestream backup; staleness/expiry enforcement.

**Phase 3 — Drone integration & trust hardening.**
MAVLink geofence/handoff + live telemetry monitor (replace the mock), secure element / hardware keys, mTLS, LUKS, verified boot.

**Phase 4 — Fleet & lifecycle.**
Ops-centre dashboard, 7-year audit store, RAUC/Mender OTA, regulatory rulesets as signed content packs, per-mission step configuration delivered via bundles.

---

## 11. Key risks & open decisions

1. **Source & staleness of weather/airspace data offline** — what's the authoritative feed, max acceptable age, and the on-ground override policy? (The UI's "on-site readings override forecast" is the right instinct; formalise it.)
2. **Operator key custody** — PIN-unlocked device key vs. smartcard/YubiKey. Affects UX and the legal weight of the sign-off.
3. **Drone control interface** — exact contract depends on Vodafone's platform; biggest integration unknown. Stand up SITL early.
4. **Regulatory acceptance** — who certifies the cryptographic seal as a legally valid operator sign-off (EASA / national CAA)? This shapes the crypto and audit requirements.
5. **Hardware selection & ruggedisation** — Pi model, secure element, enclosure, power source — set by environmental spec and the drone's power system.

---

_Bottom line: keep the React design (it's free for the Pi to serve), and invest the engineering in the offline data plane, durable persistence, real cryptographic sealing, and the drone-control integration. A **Go single-binary** device service (with an optional **Rust** sealing core) serving a **built PWA**, fed by **signed briefing bundles** and **offline map tiles**, on a **read-only-rootfs Pi/CM4 with a secure element**, is the sweet spot for a low-power, disconnected, safety-critical field tool._
