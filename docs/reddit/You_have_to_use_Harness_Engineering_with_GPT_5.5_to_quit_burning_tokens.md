#You have to use Harness Engineering with GPT 5.5 to quit burning tokens [Visit](https://www.reddit.com/r/codex/comments/1sx5q94/you_have_to_use_harness_engineering_with_gpt_55/)
### **Subreddit:** [r/codex](https://www.reddit.com/r/codex)
### **Author:** [isuckatpiano](https://www.reddit.com/user/isuckatpiano/)
### **Vote:** 46
---
It’s a good read but just paste this into your chat and have it realign your project.  So much faster on bigger code bases with it.
Basically you’re giving a set of maps not just instructions.  Have your subagents keep it up to date by rule.
[https://openai.com/index/harness-engineering/](https://openai.com/index/harness-engineering/)
---
## Comments 17

- by [OutrageousTrue](https://www.reddit.com/user/OutrageousTrue/) **&#x21C5; 5**
  <br/> I find it very difficult to save tokens.

But good governance with lanes, instructions, routing, etc. is the best way to make the AI more accurate.

I am currently on the seventh version of my governance and it contains all kinds of instructions and approaches, including routing so as not to drown the context.

This greatly improved the quality of the code.

- by [seal8998](https://www.reddit.com/user/seal8998/) **&#x21C5; 1**
  <br/> use 5.5-low/medium. It is more efficient/lower token burn than 5.4 in my usage.

- by [OutrageousTrue](https://www.reddit.com/user/OutrageousTrue/) **&#x21C5; 2**
  <br/> In my case, only high gives a consistent result. Although I measured and used other models, what worked with consistent and stable results was the 5.3 codex high.

- by [Pyros-SD-Models](https://www.reddit.com/user/Pyros-SD-Models/) **&#x21C5; 13**
  <br/> I wonder how long it will take until people realize that this is how you should orchestrate your skills as well, and that your agent will perform way better and more accurately if you structure them in a "main skill -> sub skill" map instead of a flat list of 12389719283 skills.

Seeing that about 90% of AGENTS.md files on GitHub are proper sht, I’d say at least a year.

It’s honestly funny. Every time we do a workshop at a client, their devs are like, "AI is so stupid. It doesn’t work. We’re doing everything correctly" and then you look at their AGENTS.md and it’s 20k lines of irrelevant nonsense. But yeah, somehow it’s the bot’s fault.

- by [michigannfa90](https://www.reddit.com/user/michigannfa90/) **&#x21C5; 5**
  <br/> Absolutely agree… I also love the posts where people are like “I ran out of my limits with just 2 prompts!!”… I write 10,000+ lines of code per day with codex some days and never hit my limits… because everything is organized and not all one big file

- by [nicky_factz](https://www.reddit.com/user/nicky_factz/) **&#x21C5; 1**
  <br/> This is a good point, I don't chew through my limits as fast now that I have a proper repo tailored harness for my projects. It may consume more in the planning phase than it does if you just YOLO'ed it, but it saves on the iterative messaging back and forth and test/re-test cycle you get into when something didn't work your first prompt. Having clear structured project boundries and ownership of services before you start creating helps prevent those massive thousand+ line scripts that become monolithic cross boundary responsibliities, those 2k line files are a lot of context to chew through when the problem was ultimately with a small segment of it, that would be the only thing codex would need to read if it was properly routed to the problem in the first place.

- by [doiveo](https://www.reddit.com/user/doiveo/) **&#x21C5; 2**
  <br/> I'm kind of shocked that people are still doing that, frankly. It seems painfully obvious that things should be modular, contextual.

- by [Chupa-Skrull](https://www.reddit.com/user/Chupa-Skrull/) **&#x21C5; 1**
  <br/> You're giving the game away and I need you to stop so I don't have to put in extra effort to compete

- by [seal8998](https://www.reddit.com/user/seal8998/) **&#x21C5; 2**
  <br/> use 5.5-low/medium. It is more efficient/lower token burn than 5.4 in my experience.

- by [Manfluencer10kultra](https://www.reddit.com/user/Manfluencer10kultra/) **&#x21C5; 2**
  <br/> I swear a lot and use capslock, it works.

- by [spencer_kw](https://www.reddit.com/user/spencer_kw/) **&#x21C5; 1**
  <br/> the main→sub skill map is exactly right. same principle applies to model selection. route the planning skill to high reasoning, route the implementation skills to medium or low. don't burn xhigh tokens on file edits.

- by [nicky_factz](https://www.reddit.com/user/nicky_factz/) **&#x21C5; 1**
  <br/> this is exactly where my logical interpretation of the setup led too myself. The key is agentic vision into all the areas that can give it a hard time, forcing proper TDD, not polluting the system context with a massive [AGENTS.md](http://AGENTS.md) using it as a router to your project guideline documentation, that you first specced out with chatgpt or something so you cover as many boundries and golden rules of the repo etc.

it has worked very well for me, i tweaked the superpowers plugin with codex as well to mold to my idea of the agent team beyond just workers/explorers, customized their feedback outputs etc. as i work in a repo everytime I noticed a drift in design ideology i try to tighten the gates down, so that codex can't take that poor path forward anymore, or at least minimize the ai slop, and i've yet to see it fail on a massive level, the QA/Auditor catches doc drift and CodeReviewer targets bad contract design, using typed languages helps alot too.

overall, the key is to railroad the model everytime it finds a path of least resistance you do not like, and give it the ability to view its own work however that is achieved in your project, playwright for browser automation, excellent logging, etc.

as in any good software design, the key is the planning and prep before you start coding, jumping in and telling it "i want this make it, no mistakes" is going to lead to a 'working poc' that doesn't stand up to the test of time as you pile in the 'next idea'

- by [cointoss3](https://www.reddit.com/user/cointoss3/) **&#x21C5; 1**
  <br/> Sounds like you’d want to use Pi with your Codex subscription if you want actual harness engineering

- by [davibusanello](https://www.reddit.com/user/davibusanello/) **&#x21C5; 1**
  <br/> I also noticed that it tends to over generalize instructions and prompts. Even if I already have a good set of instructions and guardrails that allowed me to run for hours without interaction with 5.4. I noticed it on Codex and ChatGPT

- by [hackercat2](https://www.reddit.com/user/hackercat2/) **&#x21C5; 1**
  <br/> I’ve been doing this since they released the doc. Unbelievable the difference it makes.

- by [apdgjoabsp](https://www.reddit.com/user/apdgjoabsp/) **&#x21C5; -3**
  <br/> You can use codexmaximum.com if you dont use voice mode and video gen etc on ur GPT sub, it's 50% cheaper since you only pay for codex
