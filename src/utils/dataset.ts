// Convert a list of filter object into a filter string for URL
function filterListToString(
  filters?: {
    column: string;
    value: string;
    operator: string;
    active?: boolean;
  }[],
  onlyActive = false
) {
  if (!filters || !Array.isArray(filters)) return "";

  return filters
    .map((filter) => {
      // If onlyActive is true, only include filters that have active property true, or without active property (different creation source)
      if (
        onlyActive &&
        (filter.hasOwnProperty("active") ? !filter.active : false)
      )
        return "";
      return `${filter.column}.${filter.operator}.${filter.value}`;
    })
    .join(",");
}

export { filterListToString };
