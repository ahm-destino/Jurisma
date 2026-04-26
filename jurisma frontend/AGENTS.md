# Social API Guidelines

Base URL: `/api/social`
Always send `Authorization: Bearer <token>` for authenticated actions (`/profile/me`, follow/unfollow). Public endpoints still accept the token to compute relationship fields.
Use the API's relationship and count fields as the source of truth. Do not infer mutuals from lists unless you must.

## Endpoints To Use
- `GET /api/social/profile/me`: returns your own profile, including `followers_count`, `following_count`.
- `GET /api/social/users/{user_id}`: returns target profile + relationship fields: `relationship`, `is_following`, `follows_viewer`, `is_connected`.
- `POST /api/social/users/{user_id}/follow`: creates a follow. Response includes `data.is_following` and `data.followers_count` (for the target).
- `DELETE /api/social/users/{user_id}/follow`: removes your follow. Response includes `data.is_following` and `data.followers_count` (for the target).
- `GET /api/social/users/{user_id}/followers`: returns all followers (including mutuals).
- `GET /api/social/users/{user_id}/following`: returns only one-way follows (outgoing not reciprocated).

## UI State Rules (Exact To Your Model)
- `followers_count` includes mutuals.
- `following_count` excludes mutuals (only pending/outgoing).
Relationship states:
- `none`: show "Connect" button.
- `following`: show "Disconnect" (or "Pending").
- `follower`: show "Follow Back".
- `connected`: show "Disconnect".

After `POST /follow`:
1. If previous relationship was `none`, set to `following`.
2. If previous relationship was `follower`, set to `connected`.
3. Refresh `GET /api/social/profile/me` to get accurate counts for the viewer.

After `DELETE /follow`:
1. If previous relationship was `following`, set to `none`.
2. If previous relationship was `connected`, set to `follower` (because the other still follows you).
3. Refresh `GET /api/social/profile/me` to get accurate counts for the viewer.

## Prompt You Can Paste To A Frontend Dev / AI
```text
Implement frontend follow/connection UI for the Jurisma backend.

Rules:
- followers_count includes mutuals.
- following_count excludes mutuals (only outgoing not reciprocated).
- Relationship values from API: none, following, follower, connected.

Use endpoints:
- GET /api/social/profile/me for viewer counts
- GET /api/social/users/{id} for target profile + relationship
- POST /api/social/users/{id}/follow to connect/follow
- DELETE /api/social/users/{id}/follow to disconnect
- GET /api/social/users/{id}/followers returns all followers (include mutuals)
- GET /api/social/users/{id}/following returns only one-way outgoing

UI behavior:
- none -> show Connect
- follower -> show Follow Back
- following -> show Disconnect/Pending
- connected -> show Disconnect

After follow/unfollow, refresh /profile/
```
