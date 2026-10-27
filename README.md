# Reynan Estobo — Portfolio

Separated React frontend and Express/PostgreSQL API for Reynan Estobo's developer portfolio.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and add the Supabase Postgres URL and Resend key.
2. Run `supabase/migrations/001_initial.sql` in the Supabase SQL editor.
3. Run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Production

- **Supabase:** run the migration and add `DATABASE_URL` to Render.
- **Render:** create a Node web service rooted at `backend`, with build command `npm install` and start command `npm start`. Set `FRONTEND_ORIGIN` to the Vercel URL.
- **Vercel:** import `frontend`, set build command `npm run build`, output `dist`, and set `VITE_API_URL` to the Render API URL (without a trailing slash).
- **Resend:** verify a sending domain, then set `RESEND_API_KEY` and optionally `EMAIL_FROM` in Render. Contact messages are always stored even when email delivery fails.

Never expose `DATABASE_URL` or `RESEND_API_KEY` to the frontend.

## Pixel companion

The companion is a small, fictional pixel figure that floats over the portfolio, wanders, rests, checks its phone, stretches, enjoys a sinigang break, and occasionally shares a thought. There is no reserved floor, "Reynan's corner," action menu, chat input, or reply panel. The page uses normal document scrolling.

The figure is drawn on a 112-by-152-pixel canvas. Dark hair, sunglasses, a navy shirt with white stripes, skin shading, trousers, and shoes share one palette and drawing system across poses. It runs entirely in the frontend; no AI key, model download, audio permission, or additional image asset is required.

### Structure

| File | Responsibility |
| --- | --- |
| `frontend/src/companion/engine.js` | DOM-free state machine, simulated energy/curiosity, weighted autonomous decisions, action cooldowns, fixed 1/120-second physics steps, capped drag release velocity, jump and landing recovery. |
| `frontend/src/companion/sprite.js` | Crisp canvas drawing and state-specific poses. Animation offsets stay separate from the engine's collision position; walking cadence follows distance travelled. |
| `frontend/src/companion/gait.js` | Ground-contact foot trajectories, alternating swing clearance, settling steps, arm counter-swing, and acceleration-aware body lean. |
| `frontend/src/companion/dialogue.js` | State-matched ambient thoughts, verified personal facts, greeting and physical reactions, cooldowns, and recent-line avoidance. The reusable `answer()` API remains in this module but has no current user-facing input. |
| `frontend/src/PixelWalker.jsx` | Pointer/keyboard input, visible-section awareness, thought timing and reveal, viewport positioning, pause/hide preferences, and animation-loop cleanup. |
| `frontend/src/walker.css` | The floating figure, readable bubbles, small adjacent safety controls, focus indicators, and mobile safe-area styling. |

Walking takes place near the viewport's bottom edge, without adding visible ground or changing the page's height. Dragging can lift the character into the viewport; release applies gravity, capped velocity, and a damped landing. Cards, forms, and headings are not physical climbing platforms. The figure is an overlay and can temporarily cover content; move or hide it when needed.

Walks favor nearby and medium-distance destinations, with occasional longer trips. The figure commits to a route, shifts weight before starting, accelerates gradually, and brakes into the destination without backtracking. A direction change finishes braking and settles the feet before pivoting. Ground travel drives alternating planted feet and lifted swing steps; knees bend, arms counter-swing, and the head looks toward the route. Dragging and falls do not advance the walking cycle. Starts and stops blend into the resting pose.

The first autonomous activity starts within 1–3 seconds. Between activities, the figure takes short 2–6-second pauses, with longer rests when sitting. He wanders to varied destinations across the viewport, waves, does small hops, talks with gestures, stretches, checks his phone, and takes snack or sitting breaks. Recent activities and destinations are avoided to prevent obvious loops.

Autonomous thoughts are scheduled every 14–24 seconds of active simulation time. An activity such as waving, talking, or snacking can prompt a thought earlier, but never less than 14 seconds after the previous line. Dragging, airborne movement, and recent interaction can delay it. Lines match the current activity and may include Reynan's supplied facts, such as his love of cooking and favorite food, sinigang. Recent lines are avoided. The simulation and thought timer stop when the tab is hidden or the companion is paused, hidden, or obscured by a project quick view. Talking means text bubbles and animated gestures; no audio plays.

### Controls

- Click/tap the character, or press **Enter/Space** while it is focused, to receive a wave and a short greeting.
- Drag the character with a mouse or touch. A stationary hold drops gently; a recent moving release produces a capped throw and a damped landing.
- With the character focused, **Left/Right** requests movement, **Up** requests a small jump, and **Down** requests a rest. **P** toggles pause; **Escape** hides the figure.
- Small **Pause/Resume** and **Hide** icons appear beside the figure when hovered, tapped/focused, or reached by keyboard focus. They are safety controls, not an action menu.
- When hidden, a small restore icon appears near the lower-left edge. Use it to show the figure again.
- Click/tap the thought itself to reveal its full text immediately. The close icon dismisses it. Thoughts otherwise expire after enough reading time; there is no reply interaction.

The device's reduced-motion preference suppresses autonomous movement, spontaneous thoughts, positional jumps, and gradual text reveal. Tapping still gives a greeting and a static pose. Pause freezes movement and thought timing; hide removes the figure and bubble without changing the page layout.

### Memory and privacy

Only `paused` and `hidden` are persisted in this browser under `reynan-companion-v2`, when browser storage is available. There is no visit tracking, return greeting, chat log, or cross-device memory. A `reynan-companion-visit` value from an older version is no longer read or updated. Clearing this site's browser storage resets saved preferences.

Recent generated thoughts, activity history, and simulated personality state exist only in the running page's memory. No companion AI requests are sent, and the current UI accepts no typed questions. Blocking browser storage does not prevent the figure from working. These details apply to the companion; the separate contact form still submits messages to the portfolio API.

The personality, mood, and energy are simulated. Thoughts use local rules, playful pixel-character musings, and facts supplied by Reynan; they do not come from a live AI model or actual feelings. Keep the verified facts in `dialogue.js` up to date when the portfolio content changes.

### Verification and limitations

Run from the repository root:

```powershell
node --test frontend/src/companion/*.test.js
npm run build
```

The companion tests cover simulated walking/jumping at 30, 60, and 144 Hz; drag cancellation and velocity limits; collision settling; resizing; state priorities; reduced-motion behavior; deterministic sprite rendering; and contextual thought variation, facts, and cooldowns. Tests also preserve the reusable engine and dialogue APIs that are not exposed in the current UI. `npm test` runs both the existing backend tests and the companion tests. Passing these checks does not replace browser, touch-device, visual, or screen-reader verification.

Manual QA checklist:

- [ ] Compare the idle, left/right walk, wave, sitting, snack, and airborne poses with the supplied portrait. Check crisp pixels and consistent sunglasses, hairstyle, and shirt stripes.
- [ ] Try desktop mouse and physical touch dragging, a stationary release, a quick throw, and pointer cancellation. Confirm the character settles inside the viewport.
- [ ] Scroll normally between sections, resize the viewport, rotate a phone, and open a project quick view. Confirm no floor, dock, reserved page space, or interaction panel appears and that the figure and bubble fit the viewport.
- [ ] Navigate with Tab, Enter/Space, arrows, **P**, and **Escape**. Confirm visible focus, usable adjacent pause/hide controls, and a keyboard-accessible restore icon after hiding.
- [ ] Let the figure run for several minutes. Check varied autonomous activities, state-matched thoughts, factual personal lines, and gaps between comments. Reveal and dismiss a thought without opening any conversation UI.
- [ ] Check pause/resume, hide/show, reduced motion, background-tab suspension, and companion suspension during project quick views. Reload with pause or hide enabled and verify that only those preferences persist.
- [ ] Check phone portrait/landscape layouts, touch scrolling outside the figure, contact fields, safe areas, and browser console output for overlap or new errors.

This checklist describes checks to perform for the simplified floating version; it is not a claim that every browser/device case has been verified.

Latest local verification (2026-10-27): all 60 tests passed (59 frontend companion tests and one backend test), and the production build passed. Walking regressions cover exact arrivals without overshoot, stationary direction changes, route commitment, and planted-foot world positions during acceleration and braking at 30, 60, and 144 Hz. Existing seeded simulations cover varied activities, destinations, and speech timing. The updated walk was inspected in the local Chrome portfolio, including successive walking frames and keyboard movement; no console warnings or errors were reported. The floating layout had also been checked at desktop and narrow mobile sizes. Physical-phone touch and assistive-technology checks remain manual follow-up items.

The character is a stylized 2D interpretation, not a photorealistic likeness or a 3D model. Sunglasses deliberately conceal eye details that the reference does not reveal. There is no action menu, chat interface, speech audio, generative AI service, arbitrary DOM climbing, or cross-device memory in this version.
