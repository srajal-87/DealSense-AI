import React from 'react';

/**
 * Presentational component for category selection.
 * Receives categories, selection state, and callback; no API or state logic.
 */
const CategorySection = ({ categories, selectedCategories, isSearching, onCategoryChange }) => (
  <section
    className="category-section"
    aria-labelledby="categories-heading"
  >
    <h2 id="categories-heading" className="section-title">
      🎯 Select up to 3 Deal Categories
    </h2>
    <div
      className="checkbox-group"
      role="group"
      aria-label="Deal categories (select up to 3)"
    >
      {categories.map((category) => (
        <div key={category.name} className="checkbox-item">
          <input
            type="checkbox"
            id={category.name}
            checked={selectedCategories.includes(category.name)}
            onChange={(e) => onCategoryChange(category.name, e.target.checked)}
            disabled={isSearching}
          />
          <label htmlFor={category.name}>{category.display_name}</label>
        </div>
      ))}
    </div>
  </section>
);

export default CategorySection;
