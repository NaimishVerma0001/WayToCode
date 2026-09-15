import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "./ErrorBoundary";

const Boom = ({ shouldThrow }) => {
    if (shouldThrow) throw new Error("component exploded");

    return <p>Recovered content</p>;
};

describe("ErrorBoundary", () => {
    let consoleSpy;

    beforeEach(() => {
        // React logs caught render errors; silence it so the output stays readable.
        consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => consoleSpy.mockRestore());

    it("renders its children while nothing has failed", () => {
        render(
            <ErrorBoundary>
                <p>All good</p>
            </ErrorBoundary>
        );

        expect(screen.getByText("All good")).toBeInTheDocument();
    });

    it("shows a recoverable message instead of unmounting the app", () => {
        render(
            <ErrorBoundary>
                <Boom shouldThrow />
            </ErrorBoundary>
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("lets the reader retry", async () => {
        const user = userEvent.setup();

        const { rerender } = render(
            <ErrorBoundary>
                <Boom shouldThrow />
            </ErrorBoundary>
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();

        // Swap in a child that no longer throws, then retry. Retrying first
        // would simply re-render the failing child and trip the boundary again.
        rerender(
            <ErrorBoundary>
                <Boom shouldThrow={false} />
            </ErrorBoundary>
        );

        await user.click(screen.getByRole("button", { name: /try again/i }));

        expect(screen.getByText("Recovered content")).toBeInTheDocument();
    });

    it("reports the failure so it is not swallowed silently", () => {
        render(
            <ErrorBoundary>
                <Boom shouldThrow />
            </ErrorBoundary>
        );

        expect(consoleSpy).toHaveBeenCalled();
    });
});
