export function shouldSubmitChatShortcut(event) {
  return event?.key === 'Enter' && !event.shiftKey && !event.isComposing;
}
