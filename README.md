# Flexity

Flexity is a microservices-based task management platform with authenticated user flows, AI-assisted collaboration, and live updates across chat, proposals, and task assignment events.

## What It Includes

- JWT authentication and role-based access control
- Task creation, assignment, and status tracking
- Collaboration chat with conversation threads
- AI-generated task proposals from project prompts
- Admin approval and rejection of proposals
- Real-time Socket.IO updates for messages, conversation creation, and task assignment notifications
- Dockerized services for local development and deployment

## Services

| Service | Purpose | Local Port |
| --- | --- | --- |
| frontend | React + Vite UI | 5173 |
| api-gateway | HTTP entrypoint and auth-protected orchestration layer | 3000 |
| user-service | Users, auth, and profile data | 3001 |
| task-service | Task persistence and task lifecycle | 3002 |
| recruitment-service | Recruitment and job-offer workflows | 3004 |
| conversation-service | Collaboration conversations, messages, and AI proposals | 3006 |
| mongo | Shared MongoDB instance | 27017 |
| postgres | Shared PostgreSQL instance | 5432 |

## Collaboration Flow

- Admin creates a collaboration conversation and describes the project.
- The conversation service generates AI task proposals.
- Participants receive the new conversation in realtime.
- Messages are broadcast to the conversation room in realtime.
- Admin can approve or reject proposals.
- Approved proposals are converted into tasks and recipients receive a realtime task-assigned notification.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ for local non-containerized work
- npm

## Start The Project

Run the full stack from the repository root:

```bash
docker compose up -d --build
```

Recommended startup order is handled by Compose:

1. Databases
2. Backend services
3. API gateway
4. Frontend

## Open The App

- Frontend: http://localhost:5173
- API gateway: http://localhost:3000
- User service: http://localhost:3001
- Task service: http://localhost:3002
- Recruitment service: http://localhost:3004
- Conversation service: http://localhost:3006

## Environment Variables

The compose file accepts these common values:

- `JWT_SECRET`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `CONVERSATION_SERVICE_HOST`
- `CONVERSATION_SERVICE_PORT`

You can keep the defaults for local development unless you need to customize credentials or service routing.

## Local Development

If you prefer to run pieces individually, start the backend services first, then the gateway, then the frontend.

```bash
# user-service
cd user-service
npm install
npm run start:dev

# task-service
cd task-service
npm install
npm run start:dev

# recruitment-service
cd recruitment-service
npm install
npm run start:dev

# conversation-service
cd conversation-service
npm install
npm run start:dev

# api-gateway
cd api-gateway
npm install
npm run start:dev

# frontend
cd frontend
npm install
npm run dev
```

## Testing

Run tests from each service directory:

```bash
npm run test
npm run test:e2e
```

Frontend checks can be run with:

```bash
cd frontend
npm run test
```

## Collaboration Notes

- Admin-only actions include creating conversations, generating proposals, and approving or rejecting proposals.
- Employees can join conversations, read messages, and receive task-assigned notifications in realtime.
- The collaboration client uses a Socket.IO namespace at `/collaboration`.
- If a non-admin user cannot load the user directory, the collaboration page still loads conversations and messages.

## Troubleshooting

- If the UI loads slowly or appears empty, confirm the backend services are up before refreshing the frontend.
- If realtime updates do not appear, log out and log back in so the socket reconnects with a fresh token.
- If Docker containers were already running before a code change, rebuild with `docker compose up -d --build`.
