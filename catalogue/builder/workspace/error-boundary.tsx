import { Component } from "react";
import type { ReactNode } from "react";

interface BoundaryProps {
  readonly fallback: (message: string) => ReactNode;
  readonly children: ReactNode;
}

interface BoundaryState {
  readonly message: string | null;
}

/** Contains one feature subtree's render crash; a keyed parent resets it. */
export class BuilderBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    return this.state.message === null
      ? this.props.children
      : this.props.fallback(this.state.message);
  }
}

/** Last-resort workspace boundary: recovery guidance replaces a blank page. */
export class BuilderAppBoundary extends Component<
  Readonly<{ children: ReactNode }>,
  BoundaryState
> {
  override state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="discern-builder-crash" data-discern-root>
        <h1>The builder hit an unexpected error</h1>
        <p>{this.state.message}</p>
        <p>Your composition autosaves on every change — reload to continue.</p>
      </div>
    );
  }
}
