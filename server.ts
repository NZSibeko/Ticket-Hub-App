// Compatibility entrypoint for repository-root ts-node execution.
// This allows `npx ts-node server.ts` from Ticket-Hub-App root to load
// the actual backend entry located at `backend/server.ts`.
import "./backend/server";
