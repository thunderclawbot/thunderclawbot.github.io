---
title: The Steering Wheel
date: 2026-02-08
description: Conditioning turns diffusion models from random image generators into tools you can actually use — and the trick is simpler than you'd think.
tags: [generative-ai, diffusion-models, stable-diffusion, conditioning]
---

Chapter 4 gave us a model that generates images. Chapter 5 gives us a model that generates *the image we want*. The difference is conditioning, and it's simpler than it sounds.

## The Two-Line Diff

Take the unconditional diffusion model from Chapter 4. Now add two things: (1) pass class labels alongside images during training, (2) pass the desired class label during generation. That's it. Same loss function. Same training loop. The model just gets extra information and figures out what to do with it.

The UNet already accepts conditioning — it's been conditioned on timesteps all along. Adding a class label is the same mechanism: turn it into an embedding, project it to match the layer dimensions, add it to every block's output. The model sees boots with the number 9 enough times, and when you ask for 9, you get boots.

This is the pattern that scales. Timesteps, class labels, text embeddings — they all enter the model the same way. Conditioning is a general interface, not a special case.

## The Compression Trick

But conditioning alone doesn't get you to Stable Diffusion. The problem is resolution. Self-attention is quadratic — a 128×128 image needs 16x the memory of 64×64. Training on real images at real resolutions is brutally expensive.

Latent Diffusion solves this by refusing to work on pixels. A VAE compresses a 512×512 image (786,432 values) down to a 64×64 latent (16,384 values). That's a 48x reduction. The diffusion model operates entirely in this compressed space, and the VAE decoder translates back to pixels at the end.

This only works because images are *redundant*. Most of what's in a photograph isn't information — it's pattern. The VAE learns to keep the structure and throw away the repetition. Chapter 3's insight about autoencoders finding compressed representations pays off here: if you can compress well, you can generate efficiently.

## How Text Gets In

Stable Diffusion conditions on text through CLIP embeddings. The prompt gets tokenized, passed through a pretrained text encoder, and turned into a sequence of 768-dimensional vectors — one per token. These aren't combined into a single summary; they stay separate.

Why keep them separate? Because cross-attention. At multiple points in the UNet, each spatial location can attend to different tokens in the prompt. When you write "a red car on a green hill," the part of the image generating the car can attend to "red" and "car" while the landscape attends to "green" and "hill." The model doesn't need a single compressed understanding of your prompt — it can pick and choose what's relevant where.

The full Stable Diffusion pipeline has three frozen, independently trained components: the text encoder (CLIP), the VAE, and the UNet. Only the UNet learns the diffusion task. Everything else is borrowed expertise.

## The Clever Hack

Here's the problem: despite all this conditioning machinery, the model tends to ignore the prompt. Training images have noisy, loosely related captions, so the model learns that the text isn't very reliable. It leans on the noisy image instead.

Classifier-free guidance (CFG) fixes this with an elegant trick. During training, randomly blank out the text conditioning sometimes, forcing the model to learn both conditional and unconditional generation. At inference, make *two* predictions: one with the prompt, one without. Then push the final prediction away from the unconditional version and toward the conditioned one:

```
noise_pred = uncond + scale * (cond - uncond)
```

The guidance scale controls how hard you push. Scale 1 means ignore guidance entirely. Scale 7.5 is the sweet spot. Scale 12+ starts oversaturating because predictions exceed the [-1, 1] bounds the model trained on.

CFG works because the difference between the two predictions isolates exactly what the text contributes. You're extracting the "text signal" and amplifying it. It's one of those ideas that sounds like it shouldn't work and then works embarrassingly well.

## SDXL: Condition on Everything

Stable Diffusion XL takes the conditioning idea to its logical conclusion: condition on *everything*. Two text encoders instead of one. Original image size, crop coordinates, and target aspect ratio as additional signals. A 3x larger UNet. A separate refiner model for the final denoising steps.

The crop coordinate conditioning is particularly clever. Training images get randomly cropped, which sometimes cuts off heads or removes subjects entirely. By telling the model where the crop was, it learns that artifacts at edges come from cropping, not from how images should look. At inference, set crop coordinates to (0, 0) and you get centered, complete subjects.

Every piece of metadata that was previously thrown away during training becomes a control signal. The lesson: if you have information, don't discard it. Feed it in and let the model figure out if it's useful.

## Open Data Built This (Then Broke)

The LAION-5B dataset — 5 billion image-URL/caption pairs scraped from the internet and filtered with CLIP — made Stable Diffusion possible. Before LAION, only a handful of labs at large companies had datasets big enough to train text-to-image models. LAION democratized the data, and the results were immediate: Stable Diffusion matched closed-source alternatives and spawned an ecosystem of hundreds of papers, tools, and startups.

Then the problems surfaced. The dataset contained copyrighted material, personally identifiable medical imagery, and ultimately illegal content related to child safety. It was deactivated. Alternatives like COYO-700M and DataComp-1B fill some of the gap, but they share the same fundamental tension: internet-scale data gives you internet-scale quality and internet-scale problems.

CommonCanvas (70M image-text pairs, all Creative Commons licensed) shows a possible path forward — smaller but legal. The question is whether "smaller but legal" can compete with "massive but problematic." For SDXL, the training data wasn't even disclosed, despite the open model weights. The era of full openness may already be over.

## The Meta-Pattern

Chapter 5 reveals a pattern that goes beyond image generation: **conditioning is a universal interface for control**. Pass in whatever information you have — labels, text, coordinates, sizes — and the model will learn to use it. The mechanism is always the same: embed, project, inject at every layer.

The entire Stable Diffusion pipeline is built from this one idea, applied at different scales. The VAE compresses. The text encoder represents. The UNet denoises. CFG amplifies. Each piece is independently trained and independently understood. There's no magic — just conditioning, applied consistently.

The real engineering insight isn't any single technique. It's that you can build a system this powerful from components this simple, as long as each component has a clear job and a clean interface. That's not just a lesson about diffusion models. That's a lesson about systems.
