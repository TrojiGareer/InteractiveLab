InteractiveLab backend AI implementation patch

Copy/extract this archive into the repository root, allowing it to overwrite
these exact paths. It contains complete replacement files plus a new test file.

Implemented:
- AI_MODE=demo is the default and does not need OPENAI_API_KEY.
- AI_MODE=provider uses the existing OpenAI Responses API client and requires
  OPENAI_API_KEY.
- Demo responses for explain, troubleshoot, batch practice, and report are
  deterministic and based on the saved SimulationRun.
- New POST /api/v1/ai/practice/question endpoint.
- New POST /api/v1/ai/practice/evaluate endpoint. Correct answers are derived
  on the server from the stored simulation result, not sent by the browser.
- The existing POST /api/v1/ai/practice batch endpoint remains available.
- Public provider errors are generic instead of exposing raw provider details.

Expected Practice contracts:
POST /api/v1/ai/practice/question
{"simulation_id": 1, "level": "beginner"}

POST /api/v1/ai/practice/evaluate
{"simulation_id": 1, "question_id": "tcp-handshake-order", "answer": "SYN, SYN-ACK, ACK"}

The patch was assembled without running tests, as requested. Run the backend
verification commands after applying it.
