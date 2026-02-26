import React, { useState, useCallback, useEffect } from 'react';

/**
 * Presentational component for the results table.
 * searchResults: array of rows [description, price, estimate, discount, linkHtml]
 */
const ResultsTable = ({ searchResults, isSearching, onRowClick }) => {
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  useEffect(() => {
    setExpandedRows(new Set());
  }, [searchResults.length]);

  const toggleExpand = useCallback((index, e) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <section
      className="results-section"
      aria-labelledby="results-heading"
      aria-busy={isSearching}
    >
      <h2 id="results-heading" className="section-title">
        📋 Best Deals Found
      </h2>
      {searchResults.length > 0 ? (
        <div className="results-table-wrapper">
          <table className="results-table" role="table">
            <colgroup>
              <col className="col-desc" />
              <col className="col-num" />
              <col className="col-num" />
              <col className="col-num" />
              <col className="col-link" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="col-desc">Description</th>
                <th scope="col" className="col-num">Price</th>
                <th scope="col" className="col-num">AI Estimate</th>
                <th scope="col" className="col-num">Discount</th>
                <th scope="col" className="col-link">Link</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((row, index) => {
                const desc = row[0] || '';
                const isExpanded = expandedRows.has(index);
                const needsToggle = desc.length > 120;
                return (
                  <tr key={index} onClick={() => onRowClick(index)}>
                    <td className="col-desc">
                      <div
                        className={`deal-description ${isExpanded ? 'expanded' : ''}`}
                        title={isExpanded ? undefined : desc}
                      >
                        {desc}
                      </div>
                      {needsToggle && (
                        <button
                          type="button"
                          className="read-more-btn"
                          onClick={(e) => toggleExpand(index, e)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </td>
                    <td className="col-num">{row[1]}</td>
                    <td className="col-num">{row[2]}</td>
                    <td className="col-num">{row[3]}</td>
                    <td className="col-link" dangerouslySetInnerHTML={{ __html: row[4] }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-results">
          {isSearching ? (
            <div className="loading" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <span>Searching for deals…</span>
            </div>
          ) : (
            <p>No deals found yet. Click &quot;Find Deals&quot; to start.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default ResultsTable;
