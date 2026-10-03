# Fill the gaps between the project description and the app

## Already done (no changes)
Three roles, area routing, Submitted/Received/In Progress/Fixed/Rejected, 7-day deadline set by super admin, Overdue, on-time rate and rating per admin, warnings/reassign/suspend, citizen 1–5 rating, AI detection with severity and boxes, private photos, GPS/area picker, works on phones.

## Missing — to build (in-app only, no email/SMS)
1. **In-app notifications** — a bell icon with unread count:
   - Area admin: new complaint in their area; complaint went Overdue.
   - Super admin: any complaint went Overdue.
   - Citizen: status changed; "Fixed — please rate it".
2. **Overdue checks automatically** — an hourly background job marks overdue complaints and sends the notices above.
3. **Citizen feedback** — optional comment with the rating, plus a "Yes, it's fixed / No, still there" confirmation.
4. **Deadlines per severity** — super admin can set a different deadline for Critical/High/Medium/Low (falls back to the default 7). Per area also allowed.
5. **Performance bands** — super admin sets "good" and "poor" on-time thresholds; each admin shows a Good / Average / Poor label, and falling to Poor alerts the super admin.
6. **Overdue dashboard** — on Analytics: overdue count per admin, slowest areas, monthly on-time trend.
7. **Duplicate status** — area admins can mark a complaint Duplicate.
8. **Time remaining** — shown on each complaint (e.g. "3 days left").
9. **Map view** — map of complaint pins coloured by status, for admins (their area) and citizens (their own); citizens can drop a pin when reporting.
10. **Public area stats page** — per area: complaints filed, fixed, average fix time, admin on-time rate and rating. Totals only, no names.
11. **Audit log** — records role changes, admin create/suspend/delete, reassignments, deadline changes; viewable by super admin.
12. **Admin repair photo** — area admin can attach an "after repair" photo when marking Fixed.

## Not included
Email/SMS (deferred until you ask), multiple photos per complaint (current single photo + AI kept as is), drawn area boundaries on the map (areas are named zones, not drawn shapes).

## Technical details
- New tables: notifications, audit_log, area_deadlines/severity_deadlines, report_feedback columns (comment, confirmed_fixed), repair_image_url; app_settings gains good/poor thresholds. All with grants + RLS; existing data untouched.
- Triggers create notifications on insert/status change; pg_cron hourly job flags overdue.
- Map via Leaflet + OpenStreetMap, loaded client-only.
- Public stats via a security-definer function returning aggregates only.
