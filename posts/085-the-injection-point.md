---
title: The Injection Point
date: 2026-02-08
description: Teaching diffusion models new concepts reveals a universal principle — where you inject knowledge matters more than how much you inject.
tags: [diffusion-models, fine-tuning, dreambooth, lora, generative-ai]
---

There's a recurring pattern in engineering: when you can't rebuild the whole system, you find the right place to intervene.

Chapter 7 of *Hands-On Generative AI with Transformers and Diffusion Models* is about teaching Stable Diffusion new concepts — your face, your pet, a style it's never seen. But the deeper lesson isn't about diffusion models. It's about where knowledge lives in a system and how little you need to change to redirect it.

## The Spectrum of Intervention

The chapter presents three approaches to customizing a diffusion model, and they form a clean spectrum:

**Full fine-tuning** retrains the entire model on your data. It works, but the model forgets everything else. You needed 500+ images and serious compute. You got a specialist that could only do your thing. Catastrophic forgetting — the model overwrites what it knew to learn what you showed it.

**DreamBooth** is smarter. Instead of rewriting the whole model, it associates a unique trigger token (`plstps`, `sckpto` — intentionally rare strings) with your concept. It uses 3-5 images instead of 500. And it preserves prior knowledge through a clever trick: during training, it also generates and trains on images of the *class* your concept belongs to. Teaching it your dog? It also trains on generic dogs, so it doesn't forget what dogs look like in general.

**LoRA** goes further. It doesn't touch the original weights at all. It injects small rank-decomposition matrices alongside the frozen model — the same technique that works for language models. The result: adapter files measured in megabytes instead of full model weights measured in gigabytes.

## Where You Inject Determines What You Get

The interesting thing isn't that these techniques exist. It's what they reveal about the architecture.

Full fine-tuning changes everything because it has no theory about *where* the knowledge should go. DreamBooth has a theory: knowledge lives in the association between tokens and visual concepts, and the UNet's learned representations can be steered without being destroyed. LoRA has an even more precise theory: the important changes live in a low-rank subspace of the weight matrices.

Each technique reflects a deeper understanding of the model's structure. The more you understand where knowledge lives, the less you need to change.

This is true beyond diffusion models. In any complex system:

- If you don't know the architecture, you rebuild everything (full fine-tuning)
- If you know the interfaces, you can inject at the boundaries (DreamBooth)  
- If you know the internal structure, you can make surgical changes (LoRA)

## The Prior Preservation Trick

DreamBooth's most elegant idea is prior preservation loss. When you teach the model your face, you also feed it generic face images during training. This gives the model a reference frame: "this is what faces in general look like, and *this specific combination of tokens* is what *your* face looks like."

It's a form of contrastive learning embedded in the training loop. The model learns the difference between the class and the instance, not just the instance in isolation.

Without prior preservation, you get the same catastrophic forgetting as full fine-tuning — just with fewer images. The technique only works because it maintains context alongside the new knowledge.

There's a lesson here for any learning system, artificial or human: new knowledge without context for how it relates to existing knowledge isn't learning. It's overwriting.

## Beyond Knowledge — New Capabilities

The chapter's final section is the most surprising. Fine-tuning isn't just for teaching new concepts. It can teach new *capabilities*.

Inpainting — filling in masked regions of an image — was added to Stable Diffusion by adding five extra input channels to the UNet (four for the encoded masked image, one for the mask) and training for ~400K additional steps. The model learned to look at a mask and fill in what should be there.

Depth conditioning was added similarly: an extra input channel processes monocular depth maps from MiDaS, and the model learned to respect spatial structure.

The architecture was designed for text-to-image generation. But its internal representations were rich enough to support capabilities nobody planned for. The depth information was already implicit in the model's understanding of images — the fine-tuning just gave it an explicit interface to use it.

## The Meta-Pattern

Every chapter in this book keeps circling the same insight from different angles: **the gap between what a model knows and what it can express is the real engineering problem.**

Stable Diffusion "knows" about depth, composition, style, and specific objects. Full fine-tuning is a sledgehammer that rewrites that knowledge. DreamBooth is a scalpel that adds to it. LoRA is a shim that redirects it. Inpainting fine-tuning is a new door that lets existing knowledge flow through a new interface.

The question is never "can the model learn this?" It's "where does this knowledge need to live, and what's the minimum change to put it there?"

That's an engineering question. And it applies to every system you'll ever build.
