---
layout: post
title: Open Systems Are Healthy
description: AI makes open source more auditable and harder to maintain at the same time. Which force wins?
comments: false
---

Anthropic's Mythos model recently found security vulnerabilities in [OpenBSD](https://www.openbsd.org/): One of the most carefully reviewed, security-obsessed codebases on earth. Code that serious people have scrutinized for decades.

This is a pretty clear sign of a step function change in software progress, and proof that human code review has a ceiling (maybe not in capability, but in breadth). No matter how many smart people look at the code, there are categories of bugs that humans just aren't great at catching. AI seems to add a fundamentally different kind of eye - one that's good at the tedious pattern-matching humans glaze over after hour three of a code review.

Though I'm not deep in the world of open source, I've been holding two ideas about AI and open source in my head that are in conflict with one another. 

The optimist in me says AI will make all software more secure, and open source most of all, because the code is right there for anyone (or any model) to audit.

The realist in me says AI coding tools are flooding open source projects with low-quality contributions that maintainers can't keep up with. More code, more slop, more bugs, more attack surface.

Both seem to be true. That's why I'm so interested.

AI is simultaneously making open source **more auditable** and **harder to maintain**. More eyes on the code, but also more code to look at. So which force wins?

## History Rhymes

I feel very lucky to have had a CS education that let me study the history of cryptography. In the 1970s, public-key cryptography went from a classified government secret to published academic research. Diffie, Hellman, and Rivest put the algorithms out in the open. The NSA hated it. The fear was obvious: if adversaries can see the algorithm, they can break it.

In practice the opposite happened. Every proprietary cipher that went up against a publicly reviewed standard lost. This wasn't because open systems didn't get attacked. They got attacked *more*. But the fixes were shared and the exploits were temporary. When you find a flaw in a public algorithm, you tell everyone, it gets patched, and the whole ecosystem gets stronger. When you find a flaw in a proprietary system, you exploit it quietly, and nobody else can help fix it.

[Kerckhoffs's principle](https://en.wikipedia.org/wiki/Kerckhoffs%27s_principle) from 1883 said a cryptographic system should be secure even if everything except the key is public knowledge. It took over a century, but that principle won decisively. The same logic applies to open source code. Code visibility isn't a vulnerability. It's an immune system. This is a core reason why OpenBSD is such a trusted piece of software in today's world.

Cryptography didn't win just because it was open. It won because the field built new infrastructure around that openness: peer review, shared standards, public testing, responsible disclosure. The openness alone wasn't enough, the processes of being open had to change and THAT made the difference.

## Good Mechanics

I [wrote recently](/2026/04/02/move-fast-and-make-things) about how AI moves the bottleneck from writing code to knowing what to write. There is a similar shift happening in open source - the bottleneck isn't contributing code anymore. It's knowing what to accept. More PRs doesn't mean better software, just like playing guitar faster doesn't mean playing better. The projects that practice good mechanics (deliberate review, clear standards, AI-augmented triage) will get faster *and* more secure over time. The ones that just accept everything or nothing will drown in noise.

## The Transition Period

We are about to be in an awkward teenage phase of open source software, but I believe the historical record is pretty clear on where things will head from here. When a new technology makes scrutiny cheap, open systems win. The printing press looked like chaos for a generation before it looked like the Enlightenment. We're in that messy middle right now, where the downsides of AI-generated contributions are more visible than the long-term benefits of AI-powered auditing. Most of the ecosystem is adapting, not rejecting. Only [four major projects](https://blog.devgenius.io/open-source-projects-are-now-banning-ai-generated-pull-requests-8e1dd3e8d41c) have outright banned AI-generated contributions. The rest are figuring out disclosure requirements, review processes, and new norms. That's the infrastructure getting built.

Open source has a structural advantage that closed source doesn't. Open code gets audited by many independent systems with different approaches. Closed code gets audited by one team with one set of tools. The fixes to open source propagate to everyone. The bugs found in closed source only help the company that owns it (if they act on them at all).

I'm increasingly all in on open systems (years of investing in crypto gave me a front row seat to what happens when governance is transparent by design). Code visibility isn't just an immune system for individual projects. When one project finds and fixes a vulnerability, every project that depends on it gets healthier too: herd immunity for software. In a world shaped by AI, the ability to see what the code is doing and who it serves isn't just a technical or product advantage. It's also a civil one.
