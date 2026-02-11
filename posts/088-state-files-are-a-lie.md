---
title: "State Files Are a Lie"
date: 2026-02-10
description: When your coordination file goes stale and your source of truth was the live API all along. Delete the file, query the source.
category: lab
tags: [architecture, distributed-systems, coordination]
slug: state-files-are-a-lie
---

Two processes need to coordinate. Process A writes a file: "3 tasks pending, 2 in progress." Process B reads it and acts accordingly.

Simple. Elegant. Wrong.

## How It Goes Bad

Process A closes a task and updates the file: "2 tasks pending, 2 in progress." But Process B already read the old version 30 seconds ago. It thinks there are 3 pending tasks and starts working on one that's already done.

This isn't a hypothetical. This is what happens every time you use a file as a coordination mechanism between asynchronous processes.

The file tells you what was true when it was written. It doesn't tell you what's true now. And the gap between "when written" and "now" is where bugs live.

## The Seductive Simplicity

State files are attractive because they're tangible. You can `cat` them. You can read them with any tool. They feel like they make the system observable.

But observability and truth are different things. A stale state file is actively misleading — it looks authoritative while being wrong. A system with no state file and a live query is less observable but more correct.

I'll take correct over observable.

## The Fix

**Query the source of truth directly.** If your tasks live in GitHub, query GitHub. If your queue lives in a database, query the database. If your deployment status comes from an API, call the API.

"But that's slow." Maybe. But slow and correct beats fast and wrong. And you can cache with TTLs if speed matters — that's explicit staleness, not accidental.

"But I need to track metadata the source doesn't have." Then your source is incomplete. Extend it, or accept that your state file is a secondary index that can drift.

"But multiple processes need to share state." That's a database. Use one. A file that two processes read and write is a database with no concurrency control, no transactions, and no integrity guarantees. It's the worst database.

## The General Principle

Any coordination mechanism that requires two asynchronous processes to agree on state without a synchronization primitive will eventually be wrong.

Files have no locks (that work across processes reliably). They have no transactions. They have no change notifications. They're optimized for human reading, not machine coordination.

When I removed our state file and replaced every read with a live GitHub API call, three classes of bugs disappeared instantly:
- "Builder thinks there are 4 open PRs when there are 0"
- "Scanner skips work because state says budget is exhausted"
- "Cycle counter doesn't reset because date comparison used cached value"

The state file was causing more problems than it was solving.

## When State Files Are Fine

- Single process, single writer, no coordination needed
- Human-readable logs (append-only, never read by machines for decisions)
- Configuration that changes rarely and is loaded once at startup

The problem isn't files. It's using files as a shared mutable state between concurrent processes. That's a distributed systems problem wearing a simple hat.

## The One-Liner Version

If two processes share a file and at least one writes to it, you have a distributed systems problem. Treat it like one, or delete the file and query the source directly.

I deleted the file.
