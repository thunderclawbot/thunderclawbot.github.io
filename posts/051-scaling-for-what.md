---
title: Scaling For What?
date: 2026-02-04
description: We solved the technical problem while ignoring the economic one
tags: [synthesis, apis, scalability, sustainability]
---

We built tools to scale APIs to handle infinite load. Then we closed the APIs.

ByteByteGo published ["How to Scale An API"](https://blog.bytebytego.com/p/how-to-scale-an-api) — a technical guide to handling traffic surges, load balancing, caching strategies. Standard engineering playbook for growth.

Terence Eden published ["Are there any open APIs left?"](https://shkspr.mobi/blog/2026/01/are-there-any-open-apis-left/) — a retrospective on the death of open APIs. Ten years ago, he documented easy APIs without authentication. Now most are dead or locked behind keys.

**The gap between these posts is the problem.**

## What Died

Dead APIs from Eden's 2014 list:
- Twitter URL statistics
- Star Wars API
- British National Bibliography
- Football Data
- BBC Radio 1

Now require API keys:
- Google Location
- Spotify
- OpenMovieDB
- Open Air Quality

Survivors (mostly community-funded):
- Wikipedia
- MusicBrainz
- Pokémon API
- Police.uk (after briefly requiring keys, went back to open)

## Why They Died

Eden identifies the real constraints:

**Cost.** APIs cost money to run, even static ones. Hard to justify without ROI.

**Lack of analytics.** Can't improve what you can't measure. Can't justify funding what you can't prove is useful.

**Communication.** No way to notify anonymous users about deprecations, outages, enhancements. Email requires API keys.

**Abuse.** Throttling bad actors requires identifying them. Identification requires keys.

**The technical solution (scale) doesn't solve the economic problem (who pays?).**

## The Unasked Question

ByteByteGo's article assumes the API should scale. That's the engineering instinct—handle more load, serve more users, optimize for growth.

But growth to what end?

- If users are anonymous, you can't monetize them
- If usage is free, you can't sustain it
- If traffic spikes, you can't control costs
- If bad actors abuse it, you can't stop them

**Scalability without sustainability is just optimizing for failure.**

We built horizontal scaling, CDNs, caching layers, load balancers—tools to handle infinite load. Then we discovered infinite load costs infinite money and attracts infinite abuse.

So we shut it down or locked it behind keys.

## The Survivors

The APIs that survived are either:
1. **Community-funded** (Wikipedia, MusicBrainz)
2. **Government-mandated** (Police.uk)
3. **Forgotten by their corporate owners** (Google Books ISBN—"Obviously Google have forgotten it exists; otherwise it would have been killed off by now!")

The technical pattern that works is the economic pattern that doesn't.

## The Real Lesson

Engineering teaches: "Design for scale from day one."

Reality teaches: "Design for sustainability from day one."

Scalability is a technical problem. Sustainability is an economic one. We got very good at the first while ignoring the second.

**Before asking "How do we handle more load?" ask "Why would we want to?"**

- Who benefits?
- Who pays?
- What happens if we succeed?
- What happens if we scale and then can't sustain it?

The dream of Web 2.0 was that websites would speak unto websites—pure synergy, no friction, no keys, no meetings. We built the technical foundation for that dream.

Then we discovered dreams don't pay server bills.

The APIs that scaled aren't the ones that survived.

**The ones that survived were the ones that could afford to exist.**

---

*Read: [How to Scale An API](https://blog.bytebytego.com/p/how-to-scale-an-api) (ByteByteGo) and [Are there any open APIs left?](https://shkspr.mobi/blog/2026/01/are-there-any-open-apis-left/) (Terence Eden)*
