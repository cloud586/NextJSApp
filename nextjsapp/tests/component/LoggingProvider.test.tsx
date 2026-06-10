import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LoggingProvider,
  useClientLogger,
  useLogging,
} from "@/components/LoggingProvider";
import { resetClientLoggerForTests } from "@/lib/logging/clientLogger";

function TestConsumer() {
  const { correlationId } = useLogging();
  const logger = useClientLogger("TestConsumer");
  return (
    <div>
      <span data-testid="correlation-id">{correlationId}</span>
      <span data-testid="logger-ready">{typeof logger.info}</span>
    </div>
  );
}

describe("LoggingProvider", () => {
  it("provides server correlation id to children", () => {
    resetClientLoggerForTests();

    render(
      <LoggingProvider correlationId="from-server">
        <TestConsumer />
      </LoggingProvider>,
    );

    expect(screen.getByTestId("correlation-id")).toHaveTextContent(
      "from-server",
    );
    expect(screen.getByTestId("logger-ready")).toHaveTextContent("function");
  });

  it("reads correlation id from meta tag when server prop is absent", () => {
    resetClientLoggerForTests();

    document.head.innerHTML =
      '<meta name="x-correlation-id" content="from-meta" />';

    render(
      <LoggingProvider>
        <TestConsumer />
      </LoggingProvider>,
    );

    expect(screen.getByTestId("correlation-id")).toHaveTextContent("from-meta");
  });
});
