# SYNC Verification Checklist

- [ ] Signed out: app works normally, no sync errors, compact auth UI only.
- [ ] Supabase not configured (placeholders): auth/sync UI hides cleanly, no console errors.
- [ ] Signed in: account chip shows email + dropdown menu.
- [ ] Local change (save settings/material/product): auto-sync runs after 3s idle.
- [ ] Frequent edits: sync is throttled (not more than once per 30s).
- [ ] Page hide/close: best-effort flush is attempted.
- [ ] Restore from cloud: confirmation appears before overwrite.
- [ ] Restore completes and app reloads with restored local data.
- [ ] Sign out: Supabase session clears, local data remains unchanged.
- [ ] Safari + Chrome: dropdown open/close and auth controls behave consistently.
- [ ] Slow network/offline: status becomes Pending/Error, retries on next change/manual sync.
