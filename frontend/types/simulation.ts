export type TcpEndpoint = "client" | "server";

export type TcpHandshakeEvent = {
  step: number;
  sent_at_ms: number;
  arrives_at_ms: number;
  source: TcpEndpoint;
  destination: TcpEndpoint;
  flags: string[];
  sequence_number: number;
  acknowledgment_number: number | null;
  client_state: string;
  server_state: string;
  description: string;
};

export type TcpHandshakeResult = {
  handshake: string;
  events: TcpHandshakeEvent[];
  final_state: {
    client: string;
    server: string;
  };
  connection_established: boolean;
  total_duration_ms: number;
};

export type SimulationRun = {
  id: number;
  scenario_id: number | null;
  protocol: string;
  input_parameters: Record<string, number>;
  result: TcpHandshakeResult | null;
  status: string;
  created_at: string;
};

export type SimulationCreateRequest = {
  protocol: string;
  input_parameters: Record<string, number>;
};

export type SimulationListResponse = {
  items: SimulationRun[];
  total: number;
  skip: number;
  limit: number;
};