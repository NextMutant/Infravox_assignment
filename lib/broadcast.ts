import { BroadcastMessage } from "@/types";

const CHANNEL_NAME = "kanban-board";

let channel: BroadcastChannel | null = null;

export const getBroadcastChannel = () => {
  if (typeof window === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
};

export const broadcastMessage = (message: BroadcastMessage) => {
  const bc = getBroadcastChannel();
  if (bc) {
    bc.postMessage(message);
  }
};
