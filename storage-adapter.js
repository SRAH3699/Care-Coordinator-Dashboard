/**
 * Storage adapter — swaps window.storage from Claude's built-in artifact
 * storage over to the Google Apps Script backend, so the dashboard's
 * existing code (get / set / list / delete calls) keeps working
 * completely unchanged once this file loads before it.
 *
 * SETUP:
 *   1. Deploy Code.gs as a web app (see SETUP.md).
 *   2. Paste the /exec URL below.
 *   3. If you set SHARED_SECRET in Code.gs, put the same value here.
 *   4. Add <script src="storage-adapter.js"></script> to the dashboard
 *      HTML, right before its own <script> block, so window.storage is
 *      already pointed at the real backend before the dashboard's code
 *      runs its first load.
 */

(function () {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbww-dDV0HVd7kMzFyJJU-JCObUODH59iOTCRI_5xz8qMCRoazkv-3Cv7E6edJIjnxBe/exec';
  const SHARED_SECRET = ''; // must match Code.gs if you set one there

  async function callBackend(payload) {
    if (SHARED_SECRET) payload.secret = SHARED_SECRET;
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight request, which Apps Script
      // web apps don't handle — this is the standard trick for calling
      // Apps Script from a page hosted somewhere else (like GitHub Pages).
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Storage backend error: HTTP ' + res.status);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  window.storage = {
    async get(key, shared) {
      const result = await callBackend({ action: 'get', key });
      // Match the original storage contract: a missing key throws,
      // it doesn't resolve to null — the dashboard's own try/catch
      // blocks already expect and handle this.
      if (result === null) throw new Error('Storage get failed: key not found');
      return result;
    },
    async set(key, value, shared) {
      return await callBackend({ action: 'set', key, value });
    },
    async list(prefix, shared) {
      return await callBackend({ action: 'list', prefix: prefix || '' });
    },
    async delete(key, shared) {
      return await callBackend({ action: 'delete', key });
    }
  };
})();
