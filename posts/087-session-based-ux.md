---
title: "Why Task Queues Beat Catalogs"
date: 2026-02-10
description: When your app shows a list of things to pick from vs. telling you exactly what to do next — and why the second one usually wins.
category: lab
tags: [ux, architecture, design]
slug: why-task-queues-beat-catalogs
---

There are two ways to show someone what to do in an app.

A **catalog** says: here are all your options, pick one. A **task queue** says: here's what's next, do it.

The catalog feels empowering. The task queue feels constraining. But for repetitive, structured workflows, the task queue wins every time.

## The Catalog Problem

Imagine a rehabilitation app. The user has 5 exercises to do, 4 times a day. A catalog approach shows all 5 exercises as cards on a homepage. The user taps one, does it, goes back to the homepage. Taps another. Goes back. Repeat.

Every return to the homepage is a decision point. Which one did I do? Which is next? Have I done all of them? How many sessions today? The app doesn't know and doesn't help. The user is managing their own state in their head.

This is fine for a music library or a restaurant menu. It's terrible for a structured workflow where the sequence matters and completion needs tracking.

## The Task Queue Alternative

Same app, different model. User opens the app. It says: "Session 2 of 4 — 5 exercises, ~12 minutes. Start."

One button. No decisions. Tap start, exercises flow one after another. Auto-advance between them. Done? "All done. Next session at 3pm — we'll remind you."

The user's mental load dropped from "browse, choose, track, remember" to "start, do, done." The app holds the state. The user just shows up.

## When Catalogs Win

Catalogs work when:
- The user has genuine preference (music, food, shopping)
- There's no correct sequence
- Exploration is the point
- The user knows what they want

## When Task Queues Win

Task queues work when:
- The sequence is known or prescribed
- Completion matters more than choice
- The user is doing the same things repeatedly
- Cognitive load should be minimal
- The app knows more about what's needed than the user does

Rehabilitation exercises. Onboarding flows. Daily standup checklists. Study plans. Workout routines. Medication schedules.

If the user is going to do all the items anyway, in roughly the same order, making them pick from a list is adding friction disguised as flexibility.

## The Design Trap

The catalog feels like better UX because it offers control. Product people love it — "the user can do whatever they want!" Designers love it — more screens to design, more interactions to craft.

But control isn't always what the user wants. Sometimes they want to be told what to do. Especially when they're tired, in pain, distracted, or just not in the mood to think about it.

The best interface for a repetitive structured task isn't a menu. It's a button that says "next."

## Implementation Insight

The shift from catalog to queue isn't just a UI change — it requires a data model change. A catalog needs a list of items. A queue needs a **session model**: what's the current session, which items are in it, what's been completed, when's the next one.

That session model is the hard part. Once you have it, the UI is trivially simple. Without it, the UI compensates for the missing model by pushing decisions to the user.

If your UI has too many choices, your data model might be missing a concept.
