---
name: desloppify
description: Detect and remove AI-generated linguistic slop from code, comments, documentation, READMEs, changelogs, commit messages, and any text artifacts. Use whenever the user mentions "AI slop", "desloppify", "remove AI-isms", "sounds like AI", "too AI", "clean up AI writing", "make it sound human", or asks to review text for AI patterns. Also trigger when reviewing any AI-generated documentation, comments, or prose -- even if the user doesn't explicitly mention AI slop -- if the content exhibits hallmark AI writing patterns like filler adjectives, hedge phrases, or obvious code comments. Trigger for any request to "clean up", "tighten", or "edit" AI-generated text, and when auditing codebases for comment quality.
user-invocable: true
---

# Desloppify

Strip AI-generated linguistic patterns from code comments, documentation, READMEs, changelogs, commit messages, PR descriptions, and prose. AI slop erodes trust and makes professional work look auto-generated.

## The Core Principle

**Say what things do. Not what they are. Not how great they are.**

A function processes payments. It doesn't "seamlessly facilitate comprehensive transaction orchestration." A library parses JSON. It doesn't "empower developers to unlock the full potential of data interchange."

If you can delete a sentence and lose no information, delete it. If you can replace three adjectives with one fact, do it. If a comment restates the code, the comment is the bug.

## Detection Tiers

### Tier 0 -- Unicode Forensics (auto-fix)

Flag characters that standard keyboards cannot produce. AI models inject these from training data. Replace unconditionally in code, comments, and documentation.

| Char | Codepoint | Name | Action |
| ---- | --------- | ---- | ------ |
| `---` | U+2014 | Em dash | Replace with ` -- ` or ` - ` |
| `--` | U+2013 | En dash | Replace with `-` |
| `...` | U+2026 | Horizontal ellipsis | Replace with `...` |
| `"` `"` | U+201C/D | Curly double quotes | Replace with `"` |
| `'` `'` | U+2018/9 | Curly single quotes | Replace with `'` |
| `->` | U+2192 | Right arrow | Replace with `->` |
| `<-` | U+2190 | Left arrow | Replace with `<-` |
| `=>` | U+21D2 | Double right arrow | Replace with `=>` |
| `<=` `>=` | U+2264/5 | Less/greater-equal | Replace with `<=` `>=` |
| `!=` | U+2260 | Not equal | Replace with `!=` |
| `-` | U+2022 | Bullet | Replace with `-` or `*` |
| `.` | U+00B7 | Middle dot | Replace with `.` |
| (c) (tm) (r) | Various | Legal symbols | Delete unless legal context |

**Exemptions**: Markdown tables using `|`, ASCII box-drawing chars (`+`, `-`, `|`), code blocks containing string literals with intentional Unicode, and files where the project already uses these characters as established style.

### Tier 1 -- Dead Giveaways (always remove or rewrite)

These appear 10-100x more often in AI output than human writing. Presence is near-certain AI signal.

**Filler Adjectives/Adverbs:**

```text
robust, seamless, comprehensive, cutting-edge, state-of-the-art, innovative,
streamlined, versatile, scalable, elegant, powerful, flexible, dynamic,
efficient, intuitive, holistic
```

**Corporate Nothing-Speak:**

```text
leverage, utilize, facilitate, implement (when meaning "use"), enhance,
optimize, ensure, empower, foster, enable, drive, harness, spearhead,
ecosystem, paradigm
```

**GPTZero High-Multiplier Phrases** (50x-270x more frequent in AI text):

```text
"in today's digital age"        "notable figures"
"aims to"                       "research needed to understand"
"despite facing"                "expressed excitement"
"aligns with"                   "it is important to"
"plays a crucial role"          "offers a range of"
"serves as a"                   "a testament to"
"the interplay of"              "a myriad of"
```

**Claude-Specific Patterns** (Claude produces these more than other models):

```text
"I'd be happy to"               "I'll help you"
"Here's what I found"           "Here's a"
"Based on my analysis"          "Let me explain"
"I notice that"                 "I see that"
"To be clear"                   "To clarify"
"It's worth highlighting"       "For context"
"I should mention"              "I want to emphasize"
"the key takeaway"              "the bottom line"
"straightforward"               (when used as filler, not technical)
```

**Additional Dead Giveaways:**

```text
"elevate"                       "streamline"
"navigate the complexities"     "foster innovation"
"a deep understanding"          "the broader context"
"this approach"                 (as sentence opener, repeatedly)
"it's also worth"               "another key aspect"
"this highlights"               "this underscores"
"resonate"                      "resonates with"
"vibrant"                       "bustling"
"testament"                     "tapestry"
"commendable"                   "laudable"
"paramount"                     "imperative"
"indispensable"                 "pivotal"
"in the context of"             "within the scope of"
```

**Hedge/Placeholder Language:**

```text
"for now"                        "simplified version"
"in a real implementation"       "placeholder"
"temporary"                      "quick and dirty"
```

These are hard-blocked by the `anti-placeholder` hook. If you see them in code, replace with the complete implementation.

**Weasel Phrases:**

```text
"It's important to note"         "It's worth mentioning"
"It should be noted that"        "Keep in mind that"
"As mentioned earlier"           "At the end of the day"
"In today's landscape"           "Moving forward"
"In order to"                    "With that being said"
"That said"                      "Needless to say"
```

**Sycophantic/Filler Openers and Closers:**

```text
"Great question!"                "Excellent point!"
"That's a fantastic approach"    "Absolutely!"  "Definitely!"  "Certainly!"
"I hope this helps"              "Feel free to ask"
"Don't hesitate to"              "Happy to help"
"Let me know if you need"        "If you have any questions"
```

**Hedge Shields:**

```text
"It depends on your use case"    "There are several approaches"
"You might want to consider"     "One possible approach"
"Generally speaking"             "Typically"
```

**AI Transition Crutches:**

```text
"Let's dive in"                  "Let's break this down"
"Let's explore"                  "Without further ado"
"First and foremost"             "Last but not least"
```

### Tier 2 -- Contextual Signals (flag when clustered)

Legitimate words AI overuses. Flag when they appear in groups or where a human would use simpler language.

**Overused Verbs:** `delve, underscore, bolster, pivot, navigate, unpack, unravel, craft, curate, champion, architect (as verb)`

**Overused Adjectives:** `nuanced, multifaceted, intricate, granular, bespoke, thoughtful, meticulous, noteworthy`

**Overused Nouns:** `landscape, realm, journey, deep dive, framework, roadmap, blueprint, ecosystem, stakeholder, touchpoint, bandwidth`

**Structural Tells:**

- Triple adjective stacking: "a robust, scalable, and efficient solution"
- Unnecessary "not only X but also Y" constructions
- Semicolons for fake sophistication where periods work
- Em-dash abuse for parentheticals that don't need emphasis
- 3+ consecutive paragraphs starting with the same structure
- Exactly 3 bullet points in every list (AI default)
- Every paragraph approximately the same length
- Setup-body-conclusion micro-structure in every section
- No sentence fragments -- AI never uses them, humans do
- False balance: every argument paired with counter-argument
- "While X, Y" opener pattern used repeatedly
- Lists with parallel grammatical structure that reads like it was generated
- Collapsed authorial voice -- reads like "the mean of all written text"

**Naming Patterns in Code:**

- Full-word verbose names where humans abbreviate: `userAuthenticationService` vs `authSvc`
- Overly formal parameter names: `inputData`, `outputResult`, `targetObject`, `configOptions`
- `handle` + noun pattern for every function: `handleClick`, `handleSubmit`, `handleError`, `handleData`

**Statistical Markers:**

- 60-70% of example names in AI text are "Emily", "Sarah", "Alex", "John" (GPTZero verified)
- Example domains always `example.com`, never realistic-looking domains
- Example ports always `3000`, `8080`, `5000` -- never odd numbers humans actually use

### Tier 3 -- Code-Specific Slop

**Obvious Comments (delete entirely):**

```python
counter += 1  # Increment the counter
user = get_user(id)  # Get the user by ID
results = []  # Initialize empty results list
return data  # Return the data
if error:  # Check if there's an error
    raise error  # Raise the error
```

**Narrating Structure (delete entirely):**

```python
# Import dependencies
import os

# Define constants
MAX_RETRIES = 3

# Main function
def main():

# Helper functions
def helper():
```

**Non-Information Comments (delete entirely):**

```python
# This class handles user authentication
class UserAuthenticator:

# Constructor
def __init__(self):

# Process the data
def process_data(data):
```

**Placeholder/Hedge Comments -- do not rewrite these, replace with correct complete implementation instead:**

Such comments expose missing work. Do not fix by rewriting the comment -- fix by implementing what's missing. Never leave a placeholder; never leave a "TODO" for core function or error handling.

```text
// In a real implementation, you would...
// For production use, consider...
// This is a simplified version
// TODO: Add proper error handling
// For demonstration purposes
// Placeholder: connect database here
// FIXME: handle edge cases
// NOTE: This can be improved
// HACK: temporary workaround
// TODO make this async later
// Should validate input here
```

If you find yourself writing a comment apologizing for a shortcut, an unfinished case, or "for demo only," stop and do the missing work instead.

**Over-Abstraction:**

- Factory pattern for objects created once
- Interface/protocol with exactly one implementation
- Abstract base class for a single subclass
- Dependency injection container for <5 dependencies
- Builder pattern for objects with <4 fields
- Error handling that catches and re-throws without transformation

**Uniform Commenting:**

- Every function has a docstring (even 2-line helpers)
- Comments distributed evenly -- humans cluster comments at non-obvious spots
- Error messages that are complete English sentences with periods (humans use terse messages)
- JSDoc/docstring for private/internal functions that are only called once

**Verbosity Tells:**

```python
# AI writes:
if len(items) == 0:
    return []

# Human writes:
if not items:
    return []
```

```python
# AI writes:
result = some_function()
return result

# Human writes:
return some_function()
```

### Tier 4 -- Doc and README Slop

**Hype Copy (rewrite to factual):**

```text
SLOP:  "A powerful, cutting-edge framework that revolutionizes..."
CLEAN: "A framework for [specific thing it does]."

SLOP:  "Seamlessly integrate with your existing workflow"
CLEAN: "Works with [X], [Y], and [Z]."

SLOP:  "Built with developer experience in mind"
CLEAN: [Delete. If the DX is good, the docs prove it.]
```

**Padding Sections (delete if empty of real content):**

```text
## Why [Project Name]?   -> Delete unless concrete differentiators
## Philosophy             -> Delete unless genuinely novel
## Our Vision             -> Delete
```

**Emoji Abuse (strip or reduce):**

```text
## Getting Started        not  ## :rocket: Getting Started
### Features              not  ### :sparkles: Features
- Easy configuration      not  - :wrench: Easy config
```

Exception: severity indicators and established project style are fine.

### Tier 5 -- Invisible Characters (always remove)

These are invisible but break string matching, URLs, and copy-paste. Always remove. No exemptions.

| Char | Codepoint | Name | Action |
| ---- | --------- | ---- | ------ |
| (space) | U+00A0 | Non-breaking space | Replace with regular space |
| (empty) | U+200B | Zero-width space | Delete |
| (space) | U+202F | Narrow no-break space | Replace with regular space |
| (empty) | U+00AD | Soft hyphen | Delete |
| (empty) | U+200C | Zero-width non-joiner | Delete |
| (empty) | U+200D | Zero-width joiner | Delete |
| (empty) | U+200E | LTR mark | Delete |
| (empty) | U+200F | RTL mark | Delete |
| (empty) | U+2060 | Word joiner | Delete |
| (empty) | U+FEFF | BOM / ZWNBSP | Delete |

## Rewrite Rules

| Slop | Replacement |
| ---- | ----------- |
| "Utilize" / "Leverage" | "Use" |
| "Facilitate" | "Allow" / "Let" |
| "Robust" | [Delete, or specific quality: "tested", "handles X"] |
| "Seamless" | [Delete, or what happens: "without restart", "in one step"] |
| "Comprehensive" | [Delete, or scope: "covers X, Y, Z"] |
| "Ensure" | "Check" / "Verify" |
| "Enhance" | "Improve" / "Add" / [specific change] |
| "Optimize" | "Speed up" / "Reduce" / [specific metric] |
| "In order to" | "To" |
| "A number of" | [Specific number, or "some"] |
| "Due to the fact that" | "Because" |
| "In the event that" | "If" |
| "Prior to" | "Before" |
| "Has the ability to" / "Is able to" | "Can" |
| "In terms of" | [Delete, restructure sentence] |
| Triple adjective stacking | Pick the one that matters |
| "Elevate" | "Improve" / specific change |
| "Streamline" | "Simplify" / "Remove steps" |
| "Navigate" (metaphorical) | "Handle" / "Work with" |
| "Foster" | "Encourage" / "Support" |
| "Resonate" | "Match" / "Fit" |
| "Stakeholder" | "User" / "Team" / specific role |
| "Touchpoint" | "Interaction" / "Step" |
| "Bandwidth" (metaphorical) | "Time" / "Capacity" |
| "Deep dive" | "Detailed look" / "Analysis" |
| "Paradigm" | "Pattern" / "Approach" |
| "Ecosystem" | "System" / "Tools" / specific |
| "Architected" (verb) | "Designed" / "Built" |
| "Curated" | "Chosen" / "Selected" |
| "Crafted" | "Made" / "Built" / "Wrote" |
| "Bespoke" | "Custom" |
| "Granular" | "Detailed" / "Fine" |
| "Holistic" | "Complete" / "Full" |
| "Pivotal" | "Key" / "Important" |
| "Paramount" | "Critical" / "Top priority" |
| "Aligns with" | "Matches" / "Follows" |
| "Aims to" | "Does" / specific verb |
| "Serves as" | "Is" |
| "Plays a crucial role" | "Is needed for" / specific |
| "A testament to" | Delete, or specific evidence |

## Remediation Protocol

### Step 1: Scan

Read target file(s). Identify all Tier 0 Unicode violations, Tier 1 matches (definite slop), Tier 2 clusters (probable slop), and Tier 5 invisible characters.

### Step 2: Classify each finding

- **AUTO-FIX** -- Tier 0 and Tier 5 characters (no judgment needed, always wrong)
- **DELETE** -- adds no information (obvious comments, filler phrases, hype copy)
- **REWRITE** -- useful information buried under slop language
- **FLAG** -- Tier 2 word that might be intentional; needs human judgment

### Step 3: Apply rewrites

Use the substitution table. For items not in the table: replace with the simplest word that preserves meaning. If no meaning is lost by deletion, delete.

### Step 4: Verify

- No Tier 0 Unicode characters remain (outside exempted contexts)
- No Tier 1 phrases remain
- No obvious comments survive
- No hype copy survives
- Remaining comments explain "why" not "what"
- README states what the project does in the first sentence
- No emoji unless established project style
- No Tier 5 invisible characters remain
- File does not use any of its own flagged patterns

## Output Format

When reporting on a desloppify pass:

```markdown
## Desloppify: [filename]

### Findings
| Line | Tier | Original                  | Action                           |
| ---- | ---- | ------------------------- | -------------------------------- |
| 5    | T0   | U+2014 em dash            | AUTO-FIX -> " -- "               |
| 12   | T1   | "robust and seamless"     | REWRITE -> "handles X without Y" |
| 34   | T3   | "// Initialize the array" | DELETE                           |
| 56   | T2   | "delve into"              | REWRITE -> "examine"             |
| 89   | T5   | U+200B zero-width space   | AUTO-FIX -> deleted              |

### Summary
- Auto-fixed: [n] items (Tier 0 + Tier 5)
- Deleted: [n] items
- Rewritten: [n] items
- Flagged: [n] items
```

When directly editing files (not reporting), skip the report -- just make the changes.
