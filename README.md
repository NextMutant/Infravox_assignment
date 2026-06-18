# Collaborative Kanban Board

A fast, local-first Kanban board with real-time multi-tab synchronization. Built with Next.js 14, Zustand, and Tailwind CSS v4.

## Features

- **Local-First Persistence**: State is saved to `localStorage` with a 250ms debounce to ensure data survives refreshes.
- **Real-Time Sync**: Live multi-tab collaboration using the `BroadcastChannel` API. Changes in one tab appear instantly in all others without a backend.
- **Drag and Drop**: Smooth card reordering and cross-column movement using `@dnd-kit`.
- **Inline Editing**: Rename columns and the board title directly on the page.
- **Rich Card Details**: Edit descriptions, priority, due dates, assignees, and add comments.
- **Search & Filter**: Instant search across card content and priority filtering.
- **Activity Log**: Audit trail of the last 20 actions, correctly attributing changes to the originating browser tab.
- **Tab Counter**: Live count of active browser tabs connected to the board.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand (Normalized store)
- **Styling**: Tailwind CSS v4 (@theme tokens)
- **Drag and Drop**: @dnd-kit
- **Persistence**: localStorage
- **Sync**: BroadcastChannel API

## Synchronization Model & BroadcastChannel Architecture

The app uses a **Single Source of Truth** pattern with an **Event-Driven Broadcast** model via the browser-native `BroadcastChannel` API (channel name: `kanban-board`). This enables efficient multi-tab state synchronization without any backend or server overhead.

### Architecture Workflow
1. **State Update**: When a user performs an action (e.g., moves a card), the local Zustand store is updated immediately.
2. **Persistence**: The full board state is serialized and saved to `localStorage` (debounced by 250ms).
3. **Broadcast**: A typed message containing the `originTabId` and necessary payload is sent over a `BroadcastChannel`.
4. **Reception**: Sibling tabs listening on the same channel receive the message, validate its origin, and apply the update directly to their local Zustand store.

### Echo Prevention & Self-Filtering
Although the native browser `BroadcastChannel` API does not deliver broadcasted events back to the context that sent them, the application employs a strict multi-layer **Origin Validation Guard** for robust echo prevention, duplicate mutation protection, and state integrity:
- **Client-Side Identity Initialization**: Every active tab dynamically initializes a unique `tabId` and random human-readable `tabAlias` at mount time.
- **Payload Verification**: Every event message includes either an `originTabId` or a `tabId` property tracking the originating tab.
- **Ingestion Filters**: Upon message ingestion inside the `useSync` hook, the incoming packet is filtered immediately:
  ```typescript
  if ("originTabId" in message && message.originTabId === tabId) return;
  if ("tabId" in message && message.tabId === tabId) return;
  ```
  This guarantees that no tab can accidentally process or re-evaluate its own actions, preventing feedback loops and redundant state computations.
- **Heartbeat Coordination**: Because native `BroadcastChannel` suppresses message echoes back to the sender, tabs cannot rely on a shared registration echo to remain visible. Instead, each tab independently fires an internal heartbeat interval loop to maintain its active status in the presence tracking roster, safely avoiding self-pruning decay.

### Advanced Multi-Tab Scaling Performance
To safely scale beyond standard bounds (tested and verified smoothly with 10+ concurrent active browser tabs), several high-density coordination mechanisms are built in:
- **Broadcast Storm Protection (Handshake Jitter)**: When a new tab mounts and queries existing sessions, active sibling tabs stagger their handshake reply frames using a randomized delay (`0-150ms jitter`). This spreads the message volume across multiple event loop ticks, preventing browser socket throttling and frame drops.
- **$O(N)$ Targeted Messaging Routing**: Registration handshakes utilize a discrete `targetTabId` constraint boundary. Sibling tabs drop response packets at the intake layer if they are not the intended recipient, dropping concurrent network re-renders from an exponential $O(N^2)$ explosion down to linear $O(N)$ efficiency.

## One-Command Setup

Get the application up and running instantly with a single command:

```bash
npm install && npm run dev
```

After running the command, open [http://localhost:3000](http://localhost:3000) in multiple browser tabs to see the live multi-tab synchronization in action.

## Known Limitations

- **Local & Profile-Bound Isolation**: Because synchronization relies entirely on `localStorage` and `BroadcastChannel`, state replication is strictly bound to the same browser profile on the same physical device. It will not synchronize across different machines or distinct browser engines (e.g., syncing between Google Chrome and Mozilla Firefox).
- **Last-Write-Wins Conflict Resolution**: In the absence of a centralized server-side coordinator or an operational transformation/CRDT engine, concurrent updates to the exact same card field at the exact same millisecond from two separate tabs follow a standard "last-write-wins" behavior.
- **Storage Boundaries**: State persistence is constrained by standard browser `localStorage` capacity limits (typically ~5MB). While more than enough for thousands of tasks and history logs, it acts as a hard upper boundary.

## Architectural Decisions

- **Normalization**: The store uses flat maps for cards and columns to ensure O(1) lookups and efficient reordering.
- **SSR Handling**: Time-sensitive components (like the Activity Log with relative timestamps) are loaded using `next/dynamic` with `ssr: false` to prevent hydration mismatches.
- **Silent Dragging**: To avoid flooding the activity log and localStorage during drag operations, reordering is "silent" until the user lets go of the card.
