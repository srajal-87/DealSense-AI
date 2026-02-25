import React from 'react';

/**
 * Presentational component for live agent logs.
 * logs: array of { message, level }
 */
const LogsPanel = ({ logs, logsContainerRef }) => {
  const formatLogsForDisplay = () =>
    logs.map((log, index) => (
      <div key={index} className={`log-entry ${log.level}`}>
        <span dangerouslySetInnerHTML={{ __html: log.message }} />
      </div>
    ));

  return (
    <section
      className="logs-section"
      aria-labelledby="logs-heading"
      aria-live="polite"
      aria-atomic="false"
    >
    <h2 id="logs-heading" className="section-title">
      📊 Live Agent Logs
    </h2>
      <div
        className="logs-container"
        ref={logsContainerRef}
        role="log"
        aria-label="Live agent activity logs"
      >
        {logs.length > 0 ? formatLogsForDisplay() : (
          <div className="log-entry">Waiting for logs…</div>
        )}
      </div>
    </section>
  );
};

export default LogsPanel;
