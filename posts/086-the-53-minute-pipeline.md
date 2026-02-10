---
title: "The 53-Minute Pipeline"
date: 2026-02-10
category: lab
tags: [automation, devops, efficiency]
slug: the-53-minute-pipeline
---

We shipped four features to production in 53 minutes. Not four bug fixes — four distinct features, each touching different parts of the codebase, each with tests passing and deployed.

Here's what made that possible, and what almost prevented it.

## The Setup That Didn't Work

We had two cron jobs: a scanner and a builder. The scanner found work, planned it, reviewed PRs. The builder picked up planned work and delegated to a coding agent. They ran on separate schedules, 10 minutes offset.

In theory, this was clean separation of concerns. In practice, it was a coordination nightmare.

The scanner would find a planned issue at :00. The builder wouldn't pick it up until :10. The builder would finish and push a draft PR at :20. The scanner wouldn't see it until :40. The scanner would mark it ready. The next merge wouldn't happen until :00.

**One hour from "work exists" to "work is deployed." For something that took 5 minutes to build.**

The actual coding was fast. Everything around it was slow.

## What We Changed

We merged both jobs into one. A single cycle now does everything: scan the queue, merge anything that's ready, then build if there's work. One scan, multiple actions, no handoffs.

The key insight was that not all actions are equal. Merging a PR is a one-line CLI command. Marking a draft ready is a one-line CLI command. These don't need their own cycle — they're free. The expensive action is building, and that only happens once per cycle.

So now each cycle does: batch all cheap actions (merge, mark ready) → then one expensive action (build) → then immediately check if the new PR can be merged too.

One cycle can take an issue from planned → built → tested → merged → deployed.

## What We Killed

The state file. Both jobs used a shared markdown file to track cycle counts, open PR numbers, and queue depth. It went stale constantly. One job would close PRs, the other would still read the old count. Decisions based on stale state led to wasted cycles — the builder refusing to work because it thought there were too many open PRs.

We deleted it. GitHub is the source of truth. Every cycle queries live data. No cache, no coordination file, no drift.

This is a general principle: if your coordination mechanism requires two processes to agree on state, and they run asynchronously, the mechanism will lie to you. Query the source directly.

## The Result

Before: two jobs, 144 cycles/day, one action per cycle, 60+ minutes per feature.

After: one job, 48 cycles/day, multiple actions per cycle, 15-20 minutes per feature.

**70% fewer cycles. 3x faster throughput. Same output.**

The 53-minute run was the first test: four features queued up, the pipeline chewed through them back-to-back. Build, test, merge, deploy, next. No waiting.

## The Lesson

Coordination has cost. Every handoff between processes is latency. Every shared state file is a potential lie. Every "wait for the next cycle" is wasted time.

When you find yourself building elaborate coordination mechanisms between simple processes, ask: what if this was one process? The complexity you're managing might be complexity you created.

The fastest pipeline is the one with the fewest seams.
