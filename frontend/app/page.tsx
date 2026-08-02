"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type TcpEvent = {
  step: number;
  source: "client" | "server";
  destination: "client" | "server";
  flags: string[];
  sequence_number: number;
  acknowledgment_number: number | null;
  client_state: string;
  server_state: string;
  description: string;
};

type Simulation = {
  id: number;
  result: {
    events: TcpEvent[];
    final_state: { client: string; server: string };
    total_duration_ms: number;
  };
};

type Parameters = { latency: string; clientSequence: string; serverSequence: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const defaults: Parameters = { latency: "100", clientSequence: "1000", serverSequence: "5000" };

export default function Home() {
  const [parameters, setParameters] = useState<Parameters>(defaults);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [selectedStep, setSelectedStep] = useState(0);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = simulation?.result;
  const event = result?.events[selectedStep];

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/health`)
      .then((response) => active && setApiOnline(response.ok))
      .catch(() => active && setApiOnline(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isPlaying || !result) return;
    timerRef.current = setTimeout(() => {
      if (selectedStep >= result.events.length - 1) {
        setIsPlaying(false);
      } else {
        setSelectedStep((step) => step + 1);
      }
    }, 850);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, result, selectedStep]);

  function updateParameter(name: keyof Parameters, value: string) {
    setParameters((current) => ({ ...current, [name]: value }));
  }

  async function runSimulation(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsPlaying(false);
    const input_parameters = {
      latency_ms: Number(parameters.latency),
      client_initial_sequence: Number(parameters.clientSequence),
      server_initial_sequence: Number(parameters.serverSequence),
    };

    if (Object.values(input_parameters).some((value) => !Number.isInteger(value))) {
      setError("Use whole numbers for all simulation parameters.");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: "tcp", input_parameters }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail ?? "The simulator could not complete this request.");

      setSimulation(payload as Simulation);
      setSelectedStep(0);
      setApiOnline(true);
    } catch (requestError) {
      setApiOnline(false);
      setError(requestError instanceof Error ? requestError.message : "Could not reach the API.");
    } finally {
      setIsRunning(false);
    }
  }

  function selectStep(step: number) {
    setSelectedStep(step);
    setIsPlaying(false);
  }

  function playTrace() {
    if (!result) return;
    setSelectedStep(0);
    setIsPlaying(true);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <header className="topbar">
          <a className="brand" href="#simulator" aria-label="Protocol Lab home"><b>P</b> protocol<span>lab</span></a>
          <div className="topbar-actions">
            <span className={`api-status ${apiOnline === null ? "checking" : apiOnline ? "online" : "offline"}`}>
              <i /> {apiOnline === null ? "Checking API" : apiOnline ? "API connected" : "API unavailable"}
            </span>
            <a href="#learn">How it works</a>
          </div>
        </header>

        <div className="hero-content">
          <p className="eyebrow"><span /> Interactive networking lab</p>
          <h1>See the connection<br /><em>before</em> it happens.</h1>
          <p>Experiment with the TCP three-way handshake, tune its inputs, and trace every packet that creates a reliable connection.</p>
          <a className="hero-action" href="#simulator">Open simulator <span>↓</span></a>
        </div>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orb orb-one" aria-hidden="true" />
        <div className="hero-orb orb-two" aria-hidden="true" />
      </section>

      <section className="workspace" id="simulator">
        <div className="section-heading">
          <div><p className="eyebrow dark"><span /> Protocol simulator</p><h2>TCP three-way handshake</h2></div>
          <p>Each run is calculated and saved by the FastAPI + PostgreSQL backend.</p>
        </div>

        <div className="simulator-grid">
          <form className="control-panel" onSubmit={runSimulation}>
            <div className="panel-heading"><b>⌘</b><div><strong>Configure run</strong><small>Adjust the starting conditions</small></div></div>
            <NumberInput label="One-way latency" hint="The time one packet takes to reach the other host." unit="MS" value={parameters.latency} onChange={(value) => updateParameter("latency", value)} min="0" max="5000" />
            <NumberInput label="Client initial sequence" unit="SEQ" value={parameters.clientSequence} onChange={(value) => updateParameter("clientSequence", value)} min="0" max="4294967295" />
            <NumberInput label="Server initial sequence" unit="SEQ" value={parameters.serverSequence} onChange={(value) => updateParameter("serverSequence", value)} min="0" max="4294967295" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
              <button className="run-button" type="submit" disabled={isRunning}>{isRunning ? "Running simulation…" : "Run simulation"} <span>→</span></button>
              <button className="reset-button" type="button" onClick={() => { setParameters(defaults); setError(null); }}>Reset</button>
            </div>
          </form>

          <div className={`visual-panel ${result ? "has-result" : ""}`}>
            <div className="visual-topline"><span className="live-label"><i /> {result ? "Run complete" : "Ready to simulate"}</span><span>{result ? `Run #${simulation?.id}` : "TCP / IPv4"}</span></div>
            <div className="network-stage">
              <Node name="Client" state={event?.client_state ?? "CLOSED"} icon="↗" />
              <div className="packet-lane" aria-live="polite">
                {result ? result.events.map((packet, index) => <Packet key={packet.step} event={packet} active={index === selectedStep} onClick={() => selectStep(index)} />) : <p className="empty-stage">Set your values, then send the first SYN packet.</p>}
              </div>
              <Node name="Server" state={event?.server_state ?? "LISTEN"} icon="◆" server />
            </div>
            <div className="packet-details">
              <div className="detail-number">{event ? `0${event.step}` : "?"}</div>
              <div><p>{event ? `${event.source} → ${event.destination}` : "Awaiting first run"}</p><strong>{event?.description ?? "Your packet-by-packet explanation will appear here."}</strong></div>
              {event && <button type="button" className="play-button" onClick={playTrace} disabled={isPlaying}>{isPlaying ? "Playing…" : "Play trace"} <span>▶</span></button>}
            </div>
            <div className="run-stats">
              <Stat label="Total time" value={result ? `${result.total_duration_ms} ms` : "—"} />
              <Stat label="Packets" value={result ? String(result.events.length) : "—"} />
              <Stat label="Final state" value={result?.final_state.client ?? "—"} />
            </div>
          </div>
        </div>
      </section>

      <section className="learn" id="learn">
        <div><p className="eyebrow dark"><span /> Why three packets?</p><h2>Both sides agree<br />before data flows.</h2></div>
        <div className="learn-steps">
          <article><span>01</span><h3>SYN</h3><p>The client announces that it wants to begin, with its initial sequence number.</p></article>
          <article><span>02</span><h3>SYN + ACK</h3><p>The server confirms the request and supplies its own starting sequence number.</p></article>
          <article><span>03</span><h3>ACK</h3><p>The client confirms the server’s sequence number. The connection is established.</p></article>
        </div>
      </section>

      <footer><b>protocol<span>lab</span></b><span>Learn it by sending it.</span><span>TCP handshake · v0.1</span></footer>
    </main>
  );
}

function NumberInput({ label, unit, hint, value, onChange, min, max }: { label: string; unit: string; hint?: string; value: string; onChange: (value: string) => void; min: string; max: string }) {
  return <label className="number-input"><span>{label}<b>{unit}</b></span><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} required />{hint && <small>{hint}</small>}</label>;
}

function Node({ name, state, icon, server = false }: { name: string; state: string; icon: string; server?: boolean }) {
  return <div className={`node ${server ? "node-server" : "node-client"}`}><span className="node-icon">{icon}</span><strong>{name}</strong><small>{state}</small></div>;
}

function Packet({ event, active, onClick }: { event: TcpEvent; active: boolean; onClick: () => void }) {
  const fromClient = event.source === "client";
  return <button type="button" className={`packet ${fromClient ? "packet-right" : "packet-left"} ${active ? "packet-active" : ""}`} onClick={onClick} aria-pressed={active}>
    <span className="packet-step">0{event.step}</span><span className="packet-body"><strong>{event.flags.join(" + ")}</strong><small>seq {event.sequence_number}{event.acknowledgment_number !== null && ` · ack ${event.acknowledgment_number}`}</small></span><span className="packet-arrow">{fromClient ? "→" : "←"}</span>
  </button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
