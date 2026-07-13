/* ----------------------------------------------------------------
   SAVED FOR LATER — chrome.storage.local

   Data shape stored under the "deferred" key:
   [
     {
       id: "1712345678901",
       url: "https://example.com",
       title: "Example Page",
       savedAt: "2026-04-04T10:00:00.000Z",
       completed: false,
       dismissed: false
     },
     ...
   ]
   ---------------------------------------------------------------- */

async function saveTabForLater(tab) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  deferred.push({
    id:        Date.now().toString(),
    url:       tab.url,
    title:     tab.title,
    savedAt:   new Date().toISOString(),
    completed: false,
    dismissed: false,
  });
  await chrome.storage.local.set({ deferred });
}

async function getSavedTabs() {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const visible = deferred.filter(t => !t.dismissed);
  return {
    active:   visible.filter(t => !t.completed),
    archived: visible.filter(t => t.completed),
  };
}

async function checkOffSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.completed = true;
    tab.completedAt = new Date().toISOString();
    await chrome.storage.local.set({ deferred });
  }
}

async function dismissSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.dismissed = true;
    await chrome.storage.local.set({ deferred });
  }
}

/* ----------------------------------------------------------------
   QUICK LINKS — chrome.storage.local
   ---------------------------------------------------------------- */

async function getQuickLinks() {
  const { quickLinks = [] } = await chrome.storage.local.get('quickLinks');
  return quickLinks;
}

async function saveQuickLink(link) {
  const { quickLinks = [] } = await chrome.storage.local.get('quickLinks');
  quickLinks.push({
    id:      Date.now().toString(),
    title:   link.title || '',
    url:     link.url || '',
    savedAt: new Date().toISOString(),
  });
  await chrome.storage.local.set({ quickLinks });
}

async function deleteQuickLink(id) {
  const { quickLinks = [] } = await chrome.storage.local.get('quickLinks');
  const filtered = quickLinks.filter(l => l.id !== id);
  await chrome.storage.local.set({ quickLinks: filtered });
}

async function updateQuickLink(id, updates) {
  const { quickLinks = [] } = await chrome.storage.local.get('quickLinks');
  const updated = quickLinks.map(l => l.id === id ? { ...l, ...updates } : l);
  await chrome.storage.local.set({ quickLinks: updated });
}

/* ----------------------------------------------------------------
   TODO LIST — chrome.storage.local
   ---------------------------------------------------------------- */

async function getTodos() {
  const { todos = [] } = await chrome.storage.local.get('todos');
  return todos;
}

async function saveTodo(text) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  todos.push({
    id:        Date.now().toString(),
    text:      text,
    completed: false,
    savedAt:   new Date().toISOString(),
  });
  await chrome.storage.local.set({ todos });
}

async function deleteTodo(id) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const filtered = todos.filter(t => t.id !== id);
  await chrome.storage.local.set({ todos: filtered });
}

async function toggleTodo(id) {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;
    await chrome.storage.local.set({ todos });
  }
}