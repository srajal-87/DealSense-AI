import React from 'react';

/**
 * Presentational component for the results table.
 * searchResults: array of rows [description, price, estimate, discount, linkHtml]
 */
const ResultsTable = ({ searchResults, isSearching, onRowClick }) => (
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
          <thead>
            <tr>
              <th scope="col" style={{ width: '50%' }}>Description</th>
              <th scope="col" style={{ width: '12%' }}>Price</th>
              <th scope="col" style={{ width: '12%' }}>AI Estimate</th>
              <th scope="col" style={{ width: '12%' }}>Discount</th>
              <th scope="col" style={{ width: '14%' }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map((row, index) => (
              <tr key={index} onClick={() => onRowClick(index)}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td dangerouslySetInnerHTML={{ __html: row[4] }} />
              </tr>
            ))}
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

export default ResultsTable;
