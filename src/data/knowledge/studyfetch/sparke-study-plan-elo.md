# Sparke: Study Plan Progression & ELO Mastery

Sparke was the mobile tutoring app at Study Fetch: LiveKit talking avatar, material-level RAG, Twilio telephony, Kafka-driven ELO feedback for study-plan progression.

---

## Real-time path

**Topic payload → LiveKit agent.** LiveKit connected to the StudyFetch backend via a **service authentication header** . The client sent the current topic and studyset id in the metadata to the **token server on GCP**. The LiveKit agent received it at session start or on topic change. That gave the agent exact position in the generated study plan and which materials to pull from for RAG, so it could tailor the conversation and generate tutoring content from the right content.

**Study plan progression → LiveKit data channel.** ELO/mastery drove when to change topic. When the system decided to advance (e.g. based on updated scores), the **topic change was communicated to the frontend over a LiveKit data channel** (client ↔ agent). The frontend and agent stayed in sync; this path did not go over Kafka.

---

## Kafka ELO loop

**1. Outcome events → Kafka.** The agent and/or client emitted events to Kafka on ratable actions: user answered (correct/incorrect, first attempt vs after hint), asked for hint, segment completed, session ended. Payload: `user_id`, `topic_id`/`concept_id`, `session_id`, `correct`, `latency_ms`, `attempt_count`, `timestamp`; optionally `item_difficulty`, `hint_used`.

**2. Consumer → ELO/mastery.** A consumer read those events and applied an ELO-style update: each interaction is a “game” between the user’s current mastery (per-topic rating) and the item/concept difficulty. Win = correct, loss = incorrect; optionally scale by margin. Updated per-user per-topic ratings were written to a store (DB/cache). Formula: new_rating = old + K × (actual − expected); actual 1/0, expected from user rating vs difficulty.

**3. Scores → topic change → data channel.** ELO/mastery decided when to change topic and what to show next (e.g. weak topics first, spaced review). That **topic change was communicated to the frontend over the LiveKit data channel**. The same state was used for the next topic payload (metadata to token server) so the agent had the updated context.

**Split:** ELO drove topic change. The LiveKit data channel carried that topic change to the frontend in real time. Kafka was the async loop that computed ELO/mastery and fed the study plan.

---

## Summary

| Piece | Role |
|-------|------|
| Topic payload | Current (and next) topic/context for the LiveKit agent. |
| LiveKit data channel | Carries ELO-driven topic change to the frontend in real time (client ↔ agent). |
| Kafka | Event stream for session outcomes. |
| ELO consumer | Updates per-user per-topic mastery from events; writes to store. |
| Study plan | ELO/mastery decides next topic; topic change is sent to frontend via data channel and to agent via topic payload. |

Real-time: **topic payload (metadata to token server) + data channel (ELO-driven topic change to frontend).** Async: **Kafka → ELO consumer → store → study plan → topic change → data channel + topic payload.**
