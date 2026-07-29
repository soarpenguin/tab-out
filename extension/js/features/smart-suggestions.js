/* ----------------------------------------------------------------
   SMART SUGGESTIONS — Score tabs and recommend which ones to close
   Pure logic module: no DOM, no chrome API calls.
   Depends on global getTabAgeInfo() from tab-age.js
   ---------------------------------------------------------------- */

const MAX_SUGGESTIONS = 10;

function getSuggestionReason(tab) {
  const ageInfo = getTabAgeInfo(tab.lastAccessed || Date.now());
  if (tab.discarded) {
    return `Discarded · ${ageInfo.text} inactive`;
  }
  return `${ageInfo.text} inactive`;
}

function scoreTabsForSuggestions(openTabs) {
  if (!openTabs || openTabs.length === 0) return [];

  const candidates = openTabs.filter(tab => {
    if (tab.pinned) return false;
    if (tab.active) return false;
    if (tab.audible === true) return false;
    if (tab.isTabOut) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  const scored = candidates.map(tab => {
    const ageInfo = getTabAgeInfo(tab.lastAccessed || Date.now());
    return {
      tab,
      reason: getSuggestionReason(tab),
      score: ageInfo.diffMs,
      isDiscarded: tab.discarded === true,
    };
  });

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.isDiscarded !== b.isDiscarded) return a.isDiscarded ? -1 : 1;
    return 0;
  });

  return scored.slice(0, MAX_SUGGESTIONS);
}