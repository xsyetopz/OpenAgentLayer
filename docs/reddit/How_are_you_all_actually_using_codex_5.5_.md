#How are you all actually using codex 5.5? [Visit](https://www.reddit.com/r/codex/comments/1sw7qel/how_are_you_all_actually_using_codex_55/)
### **Subreddit:** [r/codex](https://www.reddit.com/r/codex)
### **Author:** [30RITUALS](https://www.reddit.com/user/30RITUALS/)
### **Vote:** 15
---
I might be doing something wrong but I'm on the $100 pro plan and basically 5.5 burns through credits/tokens INSANELY fast sometimes for what seems to be the most basic tasks. This makes it almost impossible to effectively use it since I constantly need to open new chats, then feed it the full context of my project again (which takes up 30% of the tokens) and before you know it, it's become unusable again.
---
## Comments 47

- by [Spiritual-Market-741](https://www.reddit.com/user/Spiritual-Market-741/) **&#x21C5; 23**
  <br/> It could be how your codebase is organised and what your agents.md says

Try pasting this article into codex and ask it to update your repo to follow harness engineering best practices

[https://openai.com/index/harness-engineering/](https://openai.com/index/harness-engineering/)

- by [MightyBig-Dev](https://www.reddit.com/user/MightyBig-Dev/) **&#x21C5; 2**
  <br/> This is interesting and hadn't come across this article, thanks for sharing.

- by [lukenamop](https://www.reddit.com/user/lukenamop/) **&#x21C5; 2**
  <br/> Huh, I hadn’t seen that, but I’m already doing something somewhat similar - I have Codex keeping up with `AGENTS.md` as core working rules (118 lines), `PRODUCT-SPEC.md` as more detailed feature breakdown & targeted development guidance (“for x feature, work on these files,” “for x feature, explicitly do not work on anything that touches a, b, or c,” 1478 lines), and `README.md` as a human-readable description of existing features and how to use/test them (736 lines). I open a new session for every new feature/topic and ask it to read all three documents before getting started, and point it at a specific feature inside `PRODUCT-SPEC.md`. Codex is instructed to keep all three up to date as it works. After every few sessions, I also spend a few minutes asking it to read and review those three files and instruct Codex to eliminate duplicate information, ensure all three are accurate and up to date, and attempt to make them as token efficient as possible.

So far it’s working really well, I’m running 5.5 on xhigh and haven’t hit more than 50% of my 5-hour usage limit. I don’t usually run sessions in parallel, I’m working on a single project linearly, but it’s consistently cranking through features and spending 10-20 minutes per session on incredibly thorough work.

Based on that article I might try to break my project documentation down even further to get even more targeted efficiency. Good food for thought!

- by [masky0077](https://www.reddit.com/user/masky0077/) **&#x21C5; 1**
  <br/> I suppose this would also work well in vs code (for different models)?

- by [Calrose_rice](https://www.reddit.com/user/Calrose_rice/) **&#x21C5; 8**
  <br/> I’m having a hard time burning credits. Maybe I need to use fast mode. Cause I’m doing a bunch of things. And I’m still over 50% weekly left with 2 days to go.

- by [RussKy_GoKu](https://www.reddit.com/user/RussKy_GoKu/) **&#x21C5; 2**
  <br/> which plan are you on

- by [Calrose_rice](https://www.reddit.com/user/Calrose_rice/) **&#x21C5; 2**
  <br/> Pro. If I was using Plus, then yeah it’ll eat it up.

- by [Denizzje](https://www.reddit.com/user/Denizzje/) **&#x21C5; 2**
  <br/> If you are using high or lower reasoning, cranking it up to xhigh starts draining your usage fast.

- by [Calrose_rice](https://www.reddit.com/user/Calrose_rice/) **&#x21C5; 1**
  <br/> I feel like I’m getting so much clean work done with 5.5 medium, sometimes even low, that I don’t need the extra high or even high. Not that I need to burn through credits just for burning. I mostly just run through a bunch of my audits that take up time. I never use fast cause I don’t need it but maybe just for trying it out and see what it feels like.

- by [e-scape](https://www.reddit.com/user/e-scape/) **&#x21C5; 2**
  <br/> Me too and I am only on plus

- by [ChangeGlittering1800](https://www.reddit.com/user/ChangeGlittering1800/) **&#x21C5; 4**
  <br/> You need to purge ur codebase of old, deprecated docs, scripts, overused .claude, .agents, etc. keep it minimal with strong guardrails, hooks, and AGENTS.md + DESIGN.md if needed.

0. Have a solid AGENTS.md with project goal, specifications, core dependencies, LOC file size limits, general info and rules for the project.

  1. Purge old deprecated crap.
  2. Setup Notion  for task tracking and project general knowledge. Have agent review recent updates before every task and add updates after every task. This will fix your having to feed full context to codex 5.5 again.
  3. Have agent conduct build of project and fix any errors issues or warnings. This reduces your technical debt.
  4. Implement change log that agent updates EVERYTIME any codebase changes are made.
  5. Tell agent to review dependencies

Do this stuff above and it’ll fix a lot of your problem.

- by [30RITUALS](https://www.reddit.com/user/30RITUALS/) **&#x21C5; 1**
  <br/> Thanks good advice I'll initiate these steps

- by [OwlMajestic2306](https://www.reddit.com/user/OwlMajestic2306/) **&#x21C5; 3**
  <br/> If you burned tokens too fast, it is time to take a break. 😊

- by [Jerseyman201](https://www.reddit.com/user/Jerseyman201/) **&#x21C5; 3**
  <br/> I did comparisons between 5.4 token use and 5.5. the use of 5.5 was better. It was only 10-15% difference in my tests at least. The roadmap it created however was better for a major change to my large app, and probably saved me hours of time, massive amounts of tokens, etc far beyond the 10-15% saved at the time of creating (the roadmap/MD file).

In VS Code I had gpt5.5 write up a detailed roadmap, and gpt5.4 do it also via same exact prompt/same env/same repo. Then, I uploaded both docs to Gpt5.5 Heavy thinking and Gpt5.4 heavy thinking in the actual gpt windows app. Both 5.4 and 5.5 said the 5.5 roadmap was heavily favored as the one to lead to less errors overall.

It wasn't a total wash, one or two things from 5.4 roadmap weren't called out in 5.5 but overall 5.5 was significantly better according to both 5.4 heavy and 5.5 heavy lol

- by [TheGambit](https://www.reddit.com/user/TheGambit/) **&#x21C5; 3**
  <br/> To do the dishes

- by [m1ndsix](https://www.reddit.com/user/m1ndsix/) **&#x21C5; 2**
  <br/> Could you explain what you do and how many prompts you can process before you reach the limit?

- by [30RITUALS](https://www.reddit.com/user/30RITUALS/) **&#x21C5; 0**
  <br/> I usually start out a new chat something like this:

  1. Start new chats with:“Read [AGENTS.MD](http://AGENTS.MD) and docs/current-state.md first, then continue from there.”
  2. Keep [current-state.md](http://current-state.md) updated when something important changes.Not every tiny edit, just real architecture or pipeline progress.
  3. Do not create a giant [PRODUCT-SPEC.md](http://PRODUCT-SPEC.md) unless you actually need it.You already have enough architecture docs. The main issue was lack of a good entrypoint.

This then eats up 20% of my chat tokens on model 5.5 with medium intelligence and standard speed.

Seems a bit silly doesn't it?

- by [rubiohiguey](https://www.reddit.com/user/rubiohiguey/) **&#x21C5; 2**
  <br/> try placing .codexignore with paths, extensions (filetypes) and directories to ignore when scanning. I also had cases where my 5 hour usage (plus) dropped 10% just by scanning the codebase. Using .codexignore the drain no longer happens.

- by [wgaca2](https://www.reddit.com/user/wgaca2/) **&#x21C5; 1**
  <br/> I guess i am lucky because i have been using 5.5 high since it got out and i can't even hit my 5h limit

- by [lukenamop](https://www.reddit.com/user/lukenamop/) **&#x21C5; 2**
  <br/> I’ve been using 5.5 xhigh and haven’t gotten below 50% of my 5-hour usage limit.

- by [Similar-Put1476](https://www.reddit.com/user/Similar-Put1476/) **&#x21C5; 1**
  <br/> Hi everyone.

I used to see my Codex usage limits in VS Code, including the weekly limit and the 5-hour limit. Recently, the usage counter disappeared from the Codex panel.

Codex still works, but I can’t find the usage/token counter anymore. I already tried reloading VS Code.

Did OpenAI move this display somewhere else, or is this a bug?

- by [Any-Conversation28](https://www.reddit.com/user/Any-Conversation28/) **&#x21C5; 2**
  <br/> I’ve noticed the same bug too. I just use the codex app now

- by [Similar-Put1476](https://www.reddit.com/user/Similar-Put1476/) **&#x21C5; 1**
  <br/> wait codex app for linux :(

- by [ianhooi](https://www.reddit.com/user/ianhooi/) **&#x21C5; 1**
  <br/> I'm not a pro user, only plus. But high and xhigh effort burn a ton of quota.

Medium gives quota burn comparable to/slightly better than 5.4 xhigh, but imo the results are a bit worse, I don't know if it's because of my codebase. But red team audits can find bugs 3 times in a row fix after fix

- by [El_Scorcher](https://www.reddit.com/user/El_Scorcher/) **&#x21C5; 1**
  <br/> I can't even hit my 5 hour limit.

- by [Kombatsaurus](https://www.reddit.com/user/Kombatsaurus/) **&#x21C5; 1**
  <br/> I threw a problem that I couldn't get the previous models to solve at it, and it fixed it first try. Other than that I've just been busy and haven't had time to mess with it much.

- by [Ok_Yak808](https://www.reddit.com/user/Ok_Yak808/) **&#x21C5; 1**
  <br/> Could be settings or md files. Im on plus and go pretty hard with 5.5 extra high and im not seeing any increase over 5.4. im getting 1.8% quota usage per hefty turn.

- by [e-scape](https://www.reddit.com/user/e-scape/) **&#x21C5; 1**
  <br/> "I constantly need to open new chats, then feed it the full context of my project again."Why would you feed it the full context? You need to prompt it one step at a time.

- by [30RITUALS](https://www.reddit.com/user/30RITUALS/) **&#x21C5; 1**
  <br/> Because it's a pretty complex project and I need it to understand the entire context thoroughly otherwise it becomes a potentially huge risk.

- by [Ok-Pace-8772](https://www.reddit.com/user/Ok-Pace-8772/) **&#x21C5; 3**
  <br/> Sounds like badly structured spaghetti

- by [magnifica](https://www.reddit.com/user/magnifica/) **&#x21C5; 3**
  <br/> It’s highly likely this ‘feeding the whole context’ is the key issue to your token burn.  You don’t need to feed the whole context every chat - a well thought out agents.md suffices.

Also consider implementing just one feature per chat.  Use the reasoning effort appropriate to complexity of that feature.

What’s the ‘huge risk’ you’re talking about?

- by [e-scape](https://www.reddit.com/user/e-scape/) **&#x21C5; 2**
  <br/> Paste your colossal prompt in a new thread,ask Codex to divide your prompt into stages, thenpaste the stage 1 prompt it gives you in a new thread.Repeat this with all stages

- by [iamwastingtimeyo](https://www.reddit.com/user/iamwastingtimeyo/) **&#x21C5; 1**
  <br/> I create a req md file then tell it to make a tasks md file and start doing the tasks.

- by [Corv9tte](https://www.reddit.com/user/Corv9tte/) **&#x21C5; 2**
  <br/> Don't listen to the naysayers, for some projects you unfortunately do need to provide a lot of context. But, what you can do to mitigate that is slow down. Stop and engineer that context better for the model, do documentation work, explaining things clearly and how the moving parts work, the typical bug classes, and identify where the actual fragility lives. Don't just copy paste context. Make it a carefully tidy-ed up garden with simple tracks for your gardener.

I guess it's the sharpen your axe seven times thing. It does apply here and will save you so much time. Promise.

- by [30RITUALS](https://www.reddit.com/user/30RITUALS/) **&#x21C5; 1**
  <br/> Thanks I'll be even more diligent with this moving forward.

- by [Corv9tte](https://www.reddit.com/user/Corv9tte/) **&#x21C5; 1**
  <br/> You're welcome!!

- by [Beautiful_Web_5771](https://www.reddit.com/user/Beautiful_Web_5771/) **&#x21C5; 1**
  <br/> Since when there is a $100 codex plan?

- by [dimonchoo](https://www.reddit.com/user/dimonchoo/) **&#x21C5; 1**
  <br/> Month

- by [rubiohiguey](https://www.reddit.com/user/rubiohiguey/) **&#x21C5; 1**
  <br/> since a few weeks ago

- by [rubiohiguey](https://www.reddit.com/user/rubiohiguey/) **&#x21C5; 1**
  <br/> Maybe try the caveman skill

- by [Wonder_Known](https://www.reddit.com/user/Wonder_Known/) **&#x21C5; 1**
  <br/> Only use when it is necessary chatgp 5.4 basically resolve all diary task

- by [atl_beardy](https://www.reddit.com/user/atl_beardy/) **&#x21C5; 1**
  <br/> With codex I'm on Plus. I've noticed that I can probably get through one or two implementation slices for a major rewrite in one 5-hour session. So I just use it for little things in codex and primarily I use it over in copilot.

- by [Orbiter75](https://www.reddit.com/user/Orbiter75/) **&#x21C5; 1**
  <br/> I am on the $100 Pro using 5.5 and it was burning through tokens fast. It turned out 'fast mode' was enabled for some reason. I've since switched it off and it's all good again. What's odd is that I never switched to fast mode.

- by [Peeyotch](https://www.reddit.com/user/Peeyotch/) **&#x21C5; 1**
  <br/> I’m a Claude Max refugee with a $100 plan. I use 5.5 on medium for two separate projects backed by spec-kit simultaneously, and they’re doing quite well. I’ve not yet come close to hitting my 5 hour limit. I suspect the structure imposed by spec-kit is helping a lot. I wouldn’t try to vibe on medium.

- by [Kitchen_Towel_5750](https://www.reddit.com/user/Kitchen_Towel_5750/) **&#x21C5; 1**
  <br/> Making an AI website and I use it just like a Lego set. Build the small basic things and build it up to something much better and more impressive otherwise the smaller bricks that support will fall down.

[https://www.voxaiengine.com](https://www.voxaiengine.com)

- by [ouatimh](https://www.reddit.com/user/ouatimh/) **&#x21C5; 1**
  <br/> double check to make sure you're not defaulting to the 'fast' setting with 5.5using 5.5 high on 'normal' speed is the best way to extend weekly usage

- by [30RITUALS](https://www.reddit.com/user/30RITUALS/) **&#x21C5; 2**
  <br/> Thanks for the tip. I just checked, it's not set to 'fast' but normal. It almost feels like I'm using it wrong still, but I don't think so. I'm a bit at a loss right now.
