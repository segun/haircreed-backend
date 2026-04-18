import { TextDecoder, TextEncoder } from 'util';

const globalAny = global as any;

class TestEvent {
  type: string;

  constructor(type: string) {
    this.type = type;
  }
}

class TestEventTarget {
  private listeners: Record<string, Set<(event: any) => void>> = {};

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set();
    }
    this.listeners[type].add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners[type]?.delete(listener);
  }

  dispatchEvent(event: any): boolean {
    const handlers = this.listeners[event?.type] ?? new Set();
    handlers.forEach((handler) => handler(event));
    return true;
  }
}

if (!globalAny.TextEncoder) {
  globalAny.TextEncoder = TextEncoder;
}

if (!globalAny.TextDecoder) {
  globalAny.TextDecoder = TextDecoder;
}

if (!globalAny.Event) {
  globalAny.Event = TestEvent;
}

if (!globalAny.EventTarget) {
  globalAny.EventTarget = TestEventTarget;
}
