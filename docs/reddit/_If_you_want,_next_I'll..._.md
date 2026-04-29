#"If you want, next I'll..." [Visit](https://www.reddit.com/r/codex/comments/1pcl3zf/if_you_want_next_ill/)
### **Subreddit:** [r/codex](https://www.reddit.com/r/codex)
### **Author:** [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/)
### **Vote:** 40
---
Just DO the thing. Don't stop every 3 minutes ASKING me if I want you to do what's obviously the next part of the task. UGH.
I can't figure out a good one-liner to put in [AGENTS.md](http://AGENTS.md) either to prevent this. Quite annoying.
---
## Comments 35

- by [AllCowsAreBurgers](https://www.reddit.com/user/AllCowsAreBurgers/) **&#x21C5; 12**
  <br/> continue enterthen⬆️enter⬆️enter⬆️enter⬆️enter⬆️enter

- by [Automatic_Camera_925](https://www.reddit.com/user/Automatic_Camera_925/) **&#x21C5; 4**
  <br/> Dope😂 … am so concern about this

- by [adhamidris](https://www.reddit.com/user/adhamidris/) **&#x21C5; 2**
  <br/> But not too much because it turns into a gpt 3.5 when it goes below 50% 😂 maybe we could try dumping a /compact between those enters

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 1**
  <br/> Unfortunately I don't think there's a way to send a "/compact" is there? When I try it says it can't be done in the middle of a task.

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 2**
  <br/> Just wanted to chime in and say thank you for this post. It didn't really work on Codex models, but works amazingly on 5.2 xhigh. It does things overnight.

The prompt I'm using (may be modified depending on specifics) is

"You are working on [project here]. Please follow TODO.md to the best of your ability, working your way through it one-by-one. If you get truly stuck, you can rewrite that part of the TODO while making sure the overall project goal remains the same. Please work autonomously. Do not acknowledge this message".

And then enter spamming it.

- by [ii-___-ii](https://www.reddit.com/user/ii-___-ii/) **&#x21C5; 10**
  <br/> Of course. Which part would you like me to work on first?

- by [CandidFault9602](https://www.reddit.com/user/CandidFault9602/) **&#x21C5; 4**
  <br/> “Yes”.

- by [lordpuddingcup](https://www.reddit.com/user/lordpuddingcup/) **&#x21C5; 7**
  <br/> Honest I feel lik Claude and Codex and all of these systems are trained to always return shit like this and to ignore demands not to or maybe a hidden system prompt being injected

My favorite with Claude models is when they tell me they don’t have the time or the requested change is too big and I have to tell it 30 times to do the damn thing

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 4**
  <br/> YES. I got this one from Codex several times today: "Hey I ran out of time on this request, but we can try in a later session". Bruh, you worked for 1m 22s, don't be a drama queen.

- by [TKB21](https://www.reddit.com/user/TKB21/) **&#x21C5; 1**
  <br/> I’m glad you mentioned both. We’re getting fucked by a poor foundation of training by two companies trying to be first to market at every step.

- by [FootbaII](https://www.reddit.com/user/FootbaII/) **&#x21C5; 4**
  <br/> I think this is intentional on Codex/Claude Code part. They don't want to be wasting tokens. These kinda "artificial breaks" force the user to respond and/or provide feedback and be generally available .. which puts a natural limit on how much token consumption the agents will do.

- by [Keep-Darwin-Going](https://www.reddit.com/user/Keep-Darwin-Going/) **&#x21C5; 1**
  <br/> Yes it is the guardrail plus high instruction following rate that cause this. But there is a way around it with prompt. You cannot eliminate it but only soften it. So basically the prompt need to say start with small batch of the todos, build to confirm everything is compiling correctly before proceeding to next batch. Once you get more confident increase the batch size until failure occur. Somehow with this they will continue for longer.

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 1**
  <br/> Which is dumb b/c I'm paying $200/mo and will either spam "continue" on repeat, or it can just DO the thing to begin with. And the first one is even worse for token consumption b/c it increases the rate of errors + it pollutes the context with my inane "yes, please continue"'s. But I agree that this is the likely cause.

- by [MegaDork2000](https://www.reddit.com/user/MegaDork2000/) **&#x21C5; 4**
  <br/> "Never ask me if I want to do the obvious next thing!!!"

"OK. Cherry picking my_broken_branch to master, commit no edit, force push.  Deleting repos.  Formatting system drive..."

- by [lucianw](https://www.reddit.com/user/lucianw/) **&#x21C5; 3**
  <br/> I *NEVER* want it to do the thing! The only pain point I have with Codex is that it's too proactive. In fact, my AGENTS.md has just a single instruction about agent interaction guidelines and it's specifically not to do what you want :)

IMPORTANT. You MUST give advice only (NEVER code edits) in response to user
questions. Example: "what's wrong" or "what's the correct way" or "how could
we fix" are brainstorming questions and should only result in advice.
On the other hand, "please fix it" or "please implement" or "go ahead"
are explicit user asks and should result in code edits.I think it might be a personality / communication difference too.

  - I ask my wife, "Do you know where the ketchup is?"
  - I'm expecting a zero-effort yes/no answer for whether she knows where the ketchup is
  - I'd also be happy with "yes it's in the pantry top shelf" or "no I don't know"
  - But she interprets it as a request by me for her to figure out where it is, go look for it, go fetch it
  - and then it feels unfair as if I'm always asking her to do even the simplest things!!

For what it's worth, the CodexCLI system prompt specifically tells it to suggest next steps:

- Offer logical next steps (tests, commits, build) briefly;
  add verify steps if you couldn't do something.  It's hard to judge what you could put in your prompt or AGENTS.md file. Maybe show what prompt you're giving it, and we can advise?

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 2**
  <br/> "Do you know where the ketchup is?"



      Say "yes"



      refuse to elaborate


    lmao what. can we trade your wife for my codex? how good is she at Python?


      Maybe show what prompt you're giving it, and we can advise?


    in this case, it was a freaking OCR request. Like, come on, I get that it's something that's complex (otherwise I would've asked regular GPT to do it), but it's 22 lines of numbers & symbols. and the dang thing's like

"ok, I did line 1, would you like me to do the rest?" "ok, I did the next few lines, would you like me to do the rest?" YES YOU FREAKING ROBOT *and then it screws up completely on the remaining lines because it uses a different OCR method instead of the one it was using before aggggggh*

anyways this is more of a vent-post than anything.

brb grabbing some ketchup

- by [Calm-Statement2558](https://www.reddit.com/user/Calm-Statement2558/) **&#x21C5; 3**
  <br/> it's sooooooo annoying when I get a bunch of tasks in the list and expect it to auto run through it.

right now, my own solution is running a claude code as the planner/orchestrator and runs the codex as its subagent.

- by [TheOriginalSuperTaz](https://www.reddit.com/user/TheOriginalSuperTaz/) **&#x21C5; 3**
  <br/> You don’t need a one-liner in AGENTS.md, what you need is better prompting. First, read the guide on how to prompt 5.1 properly (it is different than 5.0, which is different than other revisions). Second, make sure you are truly giving it what it wants: specific, internally consistent, non-contradictory, terse instructions with clear success conditions and clear directives about what conditions should trigger iteration, and clear instructions on what guidelines to follow and where its references to those guidelines are. Third, audit all of your AGENTS.md files and make absolutely sure they also follow the above - and don’t cause contradictions!

Having fixed your prompting structure, now you can tell it to autonomously iterate until <condition(s)>, it will do so. You can additionally tell it you are going to sleep and want it done when you wake up.

I’ve found that having an orchestration layer that delegates to codex running as an MCP works especially well, too, but, again, it is given specific, terse instructions that are internally consistent and non-contradictory.

- by [Crinkez](https://www.reddit.com/user/Crinkez/) **&#x21C5; 2**
  <br/> No, even worse, it keeps suggesting stretch goals that are nice to haves or things only vaguely related to the task.

Like, I have a roadmap of 100 items for it to work on still. After almost every request I have to tell it just do the next task, stop offering to do stretch goals. No I do not need yet another slider "for testing purposes". Just offer to begin work on the next task as soon as you're done with the last.

I've included in agents.md to stop offering stretch goals. Stop offering to add ui controls unless they're very important. It remembers for a while, then context window fills a bit and it's back to suggestive inane extra tasks.

- by [mikedarling](https://www.reddit.com/user/mikedarling/) **&#x21C5; 2**
  <br/> Agreed.  There's a fork of Codex CLI at [https://github.com/just-every/code](https://github.com/just-every/code) which includes an "/auto" command, for Auto Drive.  It runs a model conversation as a coordinator and uses subagents, and has it iterate until it feels it's done.  Totally avoids your frustration.

- by [Vudoa](https://www.reddit.com/user/Vudoa/) **&#x21C5; 2**
  <br/> [https://tenor.com/view/catfix-funny-automation-gif-5213389500576965188](https://tenor.com/view/catfix-funny-automation-gif-5213389500576965188)

- by [bobbyrickys](https://www.reddit.com/user/bobbyrickys/) **&#x21C5; 2**
  <br/> This is so that companies can claim that the tool is good for x number of commands per 5 hr credit on plan y. Well when 100 of them are spent on continue you know why

- by [CandidFault9602](https://www.reddit.com/user/CandidFault9602/) **&#x21C5; 2**
  <br/> One time I asked for an audit of a commit against the specs, and literally stopped on the fourth step of his 5-step plan, which *was* the audit/comparison part itself! So I said “?”, and it proceeded to finish the job haha

- by [Electronic-Site8038](https://www.reddit.com/user/Electronic-Site8038/) **&#x21C5; 2**
  <br/> this has been the case since the loss of awareness after 5.1 update, using gpt5.1 instead of any of the codex models was "usable" but has these issues, chats, over-asking stuff, not doing any plan from 0->end. |anyone has a better model today? or sugestion to use it diferently? no, its not the agents.md

- by [evilRainbow](https://www.reddit.com/user/evilRainbow/) **&#x21C5; 2**
  <br/> You THINK you want it to just do it.

- by [Dayowe](https://www.reddit.com/user/Dayowe/) **&#x21C5; 2**
  <br/> This!

I actually appreciate Codex checking in with me before implementing the next thing. Sometimes you just wanna plan the implementation and talking about it without touching code .. I don’t want codex to code before I give the go ahead

- by [dave8271](https://www.reddit.com/user/dave8271/) **&#x21C5; 1**
  <br/> The same person, a few minutes later: *OMFG WHY did you just run rm -rf without ASKING ME FIRST, you unbelievable #!!#* pile of #**!#* useless *!#!# garbage?*

- by [MatchaGaucho](https://www.reddit.com/user/MatchaGaucho/) **&#x21C5; 1**
  <br/> It's the /modelCrank it up

- by [Polymorphin](https://www.reddit.com/user/Polymorphin/) **&#x21C5; 1**
  <br/> Never used an agents.md file yet and I'm using codex since may

- by [No_Mood4637](https://www.reddit.com/user/No_Mood4637/) **&#x21C5; 1**
  <br/> I went back to codex 5, anyone else?

- by [bicentennialman_](https://www.reddit.com/user/bicentennialman_/) **&#x21C5; 0**
  <br/> Just let someone else handle it. Maybe it's time to retire. If you have to bitch and moan without having to write a single line of code yourself..

- by [Electronic-Site8038](https://www.reddit.com/user/Electronic-Site8038/) **&#x21C5; 2**
  <br/> i think you might be projecting but

- by [changing_who_i_am](https://www.reddit.com/user/changing_who_i_am/) **&#x21C5; 3**
  <br/> "Hey, can you OCR this document?""Sure, here's the first few lines, would you like me to continue?"

"Hey, can you find the values of these three math formulas?""Sure, here's the first one, would you like me to tell you the other two?"

And it sucks because it increases the chance of an error on the 2nd/3rd/etc attempts, because of that extra step.
