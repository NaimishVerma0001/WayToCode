import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

/*
 * jsdom implements neither matchMedia nor the observer APIs that chart and
 * layout components rely on, so they are stubbed once here rather than in
 * every suite that happens to render one.
 */
if (!window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
    });
}

class MockObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver || MockObserver;
globalThis.IntersectionObserver = globalThis.IntersectionObserver || MockObserver;
