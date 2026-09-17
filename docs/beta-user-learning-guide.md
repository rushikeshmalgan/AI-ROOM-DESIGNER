# Learning from beta users

This is a guide for a human to run, not something Claude Code can execute —
recruiting and interviewing real people is out of scope for an agent to do
on its own. It exists so that whoever runs the beta (probably you) has a
concrete script instead of having to invent one under time pressure.

## Recruitment targets

```
5 users → 10 users → 25 users → 50 users
```

Not thousands yet. The goal at this stage is depth of understanding, not
volume — 5 people you can actually watch use the product and ask follow-up
questions to are worth more right now than 500 anonymous signups.

**Who to ask first** (people who actually have a room they want to
redesign, matching the primary persona from the original audit — renters
and people moving into a new space):

- Renters and people about to move apartments
- People actively redecorating a room
- Students furnishing a dorm/first apartment
- Friends/family willing to give honest (not polite) feedback

**Who not to prioritize:** developers, designers, or anyone whose interest
is in the tech rather than the task. They'll give you interesting technical
feedback and almost no signal about whether a real user with a real room
gets value out of this.

**How to run the session:** ask them to do the task ("upload a photo of a
room you'd actually like to change and see what happens") without
explaining how the product works first. Watch where they hesitate, misclick,
or ask "wait, what do I do now?" — that's real friction, not what they say
afterward when asked "was that confusing?" (people are generally polite and
will say no even when they were visibly stuck).

## Interview questions

Ask these after they've used it, without leading toward any particular
answer:

1. What did you expect to happen?
2. What surprised you?
3. What was confusing?
4. What did you want to change after seeing the first design?
5. Did you try refinement? If not, why not?
6. What did the AI get wrong?
7. Would you use this again?
8. What would make you use it again?
9. Would you share the result?
10. Would you pay for more generations?
11. What did you expect to happen after clicking "Refine"?

Question 5 is the single most important one to probe on — it's the human
version of the refinement-rate metric in `docs/analytics-funnel.md`. If
someone didn't refine, find out whether they didn't notice the option,
didn't need it (first result was good enough), or didn't understand what it
would do.

## Classifying what you hear

Sort feedback into one of these before deciding what to build. Most
individual comments will map cleanly to one category — the point of sorting
is to spot when the SAME underlying problem shows up across several people
in a different guise, which is the actual signal to act on.

| Category | Example | What it means |
|---|---|---|
| UX problem | "I didn't notice I could change the sofa" | Fix discovery/copy/layout, not the model |
| AI quality problem | "It changed the whole room, not just the couch" | See `docs/ai-quality-decision-framework.md` before touching the model |
| Product gap | "I wish it showed me where to actually buy this" | A real feature idea — but only build it once several people separately want the same thing |
| Acquisition problem | Uses it once, likes it, never returns | Not a product-quality problem — look at onboarding/re-engagement, not the AI |
| Monetization problem | "I like it but wouldn't pay for more" | Don't react by adding a paywall — first understand whether the issue is price, value, or trust |

**Do not build whatever gets mentioned most in a single session.** Look for
the same category of problem recurring across multiple, independent users
before treating it as real signal — one person's opinion is an anecdote, the
same complaint from a third unrelated person is a pattern.
