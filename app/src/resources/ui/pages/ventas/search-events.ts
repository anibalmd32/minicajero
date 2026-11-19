import { elements } from "./elements";
import { hasFinePointer } from "./environment";
import { onResultClick, onSearchKeyDown } from "./search-enter";
import { currentQuery, runSearch, scheduleSearch } from "./search-request";

export function bindSearchEvents(): void {
  const { searchForm, searchInput, resultsList, resultsRetry } = elements;
  searchForm.addEventListener("submit", (event) => event.preventDefault());
  searchInput.addEventListener("input", scheduleSearch);
  searchInput.addEventListener("keydown", onSearchKeyDown);
  resultsList.addEventListener("click", onResultClick);
  resultsList.addEventListener("mousedown", (event) => {
    if (hasFinePointer()) event.preventDefault();
  });
  resultsRetry.addEventListener("click", () => void runSearch(currentQuery()));
}
