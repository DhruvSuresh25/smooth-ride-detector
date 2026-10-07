# DriveSafe Vision — QA report fixes (45 findings)

## Done
- [x] GPS-based area routing (areas now have center + radius; new GPS reports auto-route; existing GPS reports backfilled)
- [x] Unassigned-area reports notify super admins in-app
- [x] IST timestamps everywhere; minute-level overdue labels
- [x] Status timeline shows real history incl. Reopened (RPT-0002 contradiction explained)
- [x] Notifications: no auto mark-read on close; per-item read + mark all
- [x] Maps show clear empty-state messages
- [x] New report form auto-selects area from GPS/map pin
- [x] Report detail pages: loading skeletons, area label, mini-map, clearer no-access message
- [x] Admin reports list: URL-backed filters, workflow sort, area/unassigned filter, role-aware counts
- [x] Self-suspend/self-delete blocked (server + UI)
- [x] Audit log: actor recorded for admin actions, per-field status/area/admin/deadline entries
- [x] Area admin creation requires a name; removal confirmed via dialog
- [x] Admin login page: invitation/password-setup explanation (no developer README text)
- [x] Settings: role-policy copy fixed, README reference removed
- [x] Users page: super admin labeled, area admins shown with role, self-actions guarded
- [x] Citizen reports list: workflow status sort, inclusive date filter, "Showing X of Y"
- [x] Area stats page uses the signed-in layout when logged in
- [x] Analytics: period filter (7/30/90 days/all) + severity chart legend with counts
- [x] Real Privacy, Terms and Contact pages; footer links point to them
- [x] Profile: role badge, admin areas + on-time rate/rating, staff-aware stats
- [x] 404 page title fixed; password placeholder clarified
- [x] Typecheck clean

## Not fixed / out of scope
- RPT-0006 blank photos: storage files exist and code handles them — believed stale live build; re-check after next publish
- "0" flash (#27): no source found in code; likely transient render artifact, monitor
- RPT-0009 test data left in place (user asked not to delete data)
- Publishing: not done (user must publish for live site to get these fixes)
