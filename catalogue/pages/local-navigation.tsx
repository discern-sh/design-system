import { CompareNavigation } from "./compare/navigation.tsx";
import { ComponentsNavigation } from "./components/navigation.tsx";
import { CompositionsNavigation } from "./compositions/navigation.tsx";
import { FoundationsNavigation } from "./foundations/navigation.tsx";
import type { LocalNavigationProps } from "./navigation-types.ts";
import { TerminalNavigation } from "./terminal/navigation.tsx";

export function LocalNavigation(props: LocalNavigationProps) {
  switch (props.route.family) {
    case "components":
      return <ComponentsNavigation {...props} />;
    case "foundations":
      return <FoundationsNavigation {...props} />;
    case "compositions":
      return <CompositionsNavigation {...props} />;
    case "terminal":
      return <TerminalNavigation {...props} />;
    case "compare":
      return <CompareNavigation {...props} />;
    case "overview":
    case "not-found":
      return null;
  }
}
