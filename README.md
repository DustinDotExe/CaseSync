# CaseSync

CaseSync is a React + Firebase case-planning app for court case managers. It helps teams manage participant records, track progress through configurable milestone phases, draft and refine goals, generate court-ready reports, and securely share plan snapshots for participant signatures.

The app is currently geared toward testing with Johnson County Problem Solving Courts.

## Current Features

- Authentication with Firebase Auth:
  - Google sign-in
  - Email/password sign-in and account creation
  - Password reset flow
- Per-user participant records stored in Firestore.
- Participant search, creation, profile editing, sorting, and deletion.
- Milestone phase tracking with customizable phase labels in user settings.
- IRAS target domain selection for case plans.
- Case manager observations with browser speech-to-text support when available.
- Gemini-assisted SMART goal generation and note/goal refinement via server endpoints.
- Built-in + user-customizable goal template categories.
- Active goal editing, deletion, completion tracking, due/review dates, and drag-and-drop ordering.
- Caseload dashboard view for quick participant progress summaries.
- Share & Sign workflow:
  - Generate/revoke secure share links per participant
  - Participant portal view with read-only case-plan snapshot
  - Signature capture and signature history
- Printable case plan reports with participant details, target domains, goals, observations, milestones, and signatures.
- Printable audit/history view with filters for goals, milestones, observations, and profile changes.
- User settings for display name, job title, theme mode, color palette, goal templates, and milestone phases.
- Terms of Service and Privacy Policy views available in-app.

## Tech Stack

- React 19
- Vite 6
- TypeScript
- Firebase Auth
- Firestore
- Express server for production + Gemini proxy endpoints
- Google Gemini via `@google/genai`
- Tailwind CSS 4
- Local UI component set (shadcn/Base UI style)

## Data Model

Firestore currently uses these primary collections:

- `users`: profile, role, display title, theme/template/preferences, and milestone phase configuration.
- `participants`: participant profile, case number, phase state, milestones, goals, completed goals, notes, IRAS domains, and sharing metadata.
- `auditLog`: per-participant activity entries for profile updates, phase changes, goals, observations, signatures, and target-domain changes.
- `participantPortals`: share-token keyed portal snapshots used for participant-facing secure plan review/signature.

Firestore rules restrict participant, portal, and audit data to authenticated ownership flows. User roles are initialized as `case_manager`; admin-level role changes are intended to happen outside the client (for example via backend/Admin SDK workflows).

## Environment

Create `.env.local` for local development:

```sh
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"

VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_FIRESTORE_DATABASE_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
```

Keep `GEMINI_API_KEY` server-side only.

## Run Locally

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

The dev server runs on `http://localhost:3000`.

For Gemini-backed refine/generation endpoints, run the server process as well:

```sh
npm run server
```

This serves:

- `POST /api/refine-goal`
- `POST /api/refine-notes`

Both endpoints stream Gemini responses as server-sent events.

## Production

Build the frontend:

```sh
npm run build
```

Start the production server:

```sh
npm start
```

In production, `server.ts` serves the compiled `dist` assets and exposes the same Gemini streaming endpoints. The server uses `PORT` when provided and falls back to `3001`.

## Useful Scripts

- `npm run dev`: start Vite on port 3000.
- `npm run server`: start the Express/Gemini server directly.
- `npm run build`: create the production frontend bundle.
- `npm start`: run the production server.
- `npm run preview`: preview the built Vite app.
- `npm run lint`: run TypeScript checks with `tsc --noEmit`.
- `npm run clean`: remove `dist`.

## Firebase

The repository includes:

- `firestore.rules`: ownership-based Firestore rules.
- `firestore.indexes.json`: Firestore index configuration.
- `firebase.json`: Firestore database/rules configuration.

If Google sign-in fails with an unauthorized-domain error, add the local or deployed domain to Firebase Authentication's authorized domains.
