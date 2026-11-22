# Events

Events are stored in `public.events`; only published events are visible to members. Registration is performed through `register_for_event(uuid)`, which locks the event row, validates publication/deadline/capacity and prevents duplicate active registrations. Cancellation uses `cancel_event_registration(uuid)` and is allowed only before the event starts. Registration notifications are inserted by a database trigger.

Event managers are admins/super admins or board members granted `events.manage`. The static member UI reads published events, shows date/time/venue/description/capacity, and supports registration and cancellation. Apply the Phase 2 migration before use.
