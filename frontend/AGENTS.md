<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## InteractiveLab frontend rules

### Protocol visualization

- The backend calculates and persists simulations immediately. Frontend playback is a presentation layer and must never delay the API request, database write, or backend response.
- Treat the immutable `SimulationRun` result and its `input_parameters` snapshot as the source of truth.
- Playback speed changes only the wall-clock presentation. It must never alter protocol values, packet data, simulated timestamps, total simulated time, or persisted results.
- Keep playback state and timing logic reusable. Do not create independent timer implementations in the simulator, scenario manager, and history components.
- Cancel stale timers and animation frames when a component unmounts, a new result arrives, playback restarts, or the active trace changes.
- Prevent overlapping playback sessions and stale callbacks.
- Preserve useful static content when JavaScript animation is stopped or reduced.

### Playback modes

- Real-time mode maps simulated protocol timing to wall-clock timing.
- Demo mode uses a readable presentation duration independent of the configured network latency.
- Clearly distinguish simulated protocol time from playback duration in the interface.
- Respect `prefers-reduced-motion`. The protocol steps and explanations must remain understandable without continuous movement.

### Endpoint presentation

- Protocol endpoints and packet illustrations should use code-native HTML, CSS, or inline SVG.
- Do not add remote images, raster assets, animation libraries, or icon packages unless the task explicitly requires them.
- Device selection is presentation-only unless an explicit backend contract later supports persistence.
- Keep endpoint illustrations responsive and consistent with the existing Protocol Lab visual language.

### Accessibility

- Playback controls must be keyboard accessible and have explicit labels.
- Current playback status and current protocol step must be exposed through an appropriate `aria-live` region.
- Do not communicate packet direction, state, or completion using color alone.
- Visible focus styles must remain available.