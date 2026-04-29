# strava_analyser
Web service for analysing a user's strava data

## Strava webhook bootstrap (one-time per environment)

The backend exposes `GET/POST /webhooks/strava` for Strava push notifications
(activity create/update/delete + athlete deauthorisation). Strava needs to
know the callback URL — register it once per environment.

1. Set `STRAVA_WEBHOOK_VERIFY_TOKEN` in the backend env to any random string.
2. Register the subscription:

   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id="$CLIENT_ID" \
     -F client_secret="$CLIENT_SECRET" \
     -F callback_url="https://<your-backend-host>/webhooks/strava" \
     -F verify_token="$STRAVA_WEBHOOK_VERIFY_TOKEN"
   ```

   Strava hits `GET /webhooks/strava` for handshake; backend echoes the
   challenge if the verify token matches. On success Strava returns the
   subscription `id`.

3. List active subscriptions:
   `curl "https://www.strava.com/api/v3/push_subscriptions?client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"`
4. Delete one:
   `curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/<id>?client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET"`

Only one subscription per app is allowed.

- Segment challenges, extra points for best time on a segment before a deadline
- historic leaderboard view, see previous winners
- Group invite should show name of group and member count, not invite code
- Group icons, add your own logo if you have one
- Don't show total group points, its not relevant
- How else can we encourage interaction, and people to visit the site and share it?
  - email summaries to group members, weekly digests, end of month summaries?
  - social media integration, share achievements and challenges + wins/leaderboard placements
  - gamification, add badges to user profiles for winning/placing in challenges/leaderboards
  - sync with Stava activities, add points earned to activity descriptions on Strava + link to join site
  - are we tracking runs/walks/swims etc? maybe we should? make a group level option, for what activity types to track?
  - group level option to configure points rewadrs, i.e. how many km to ride for 100pts + how many points for different events
- Full UI overhaul, make it look sporty, modern, dynamic, techy, visually interesting, bring in Strava cues (but don't make it look like a clone, just use as inspiration)
- Backend overhaul, optimize queries, functions, use extractors, general review + cleanup - does the design make sense? encapsulation boundaries and code organization
- audit, are we following strava guidelines? https://www.strava.com/legal/api https://developers.strava.com/guidelines/
- Are we handling rate limits?
- At end of leaderboard, last 5 days, add extra design cues to make it clear that the end is close
- Better logo
- 