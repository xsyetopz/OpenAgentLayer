---
name: ca-desloppify
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

**Sycophantic/Filler Openers & Closers:**

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

**Placeholder/Hedge Comments - do not rewrite these, replace with correct complete implementation instead:**

Such comments expose missing work. Do not fix by rewriting the comment - fix by implementing what's missing. Never leave a placeholder; never leave a "TODO" for core function or error handling.

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

### Tier 4 -- Doc & README Slop

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
## 🚀 Getting Started   ->  ## Getting Started
### ✨ Features          ->  ### Features
- 🔧 Easy config        ->  - Easy configuration
```

Exception: severity indicators and established project style are fine.

## Rewrite Rules

| Slop                                | Replacement                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| "Utilize" / "Leverage"              | "Use"                                                       |
| "Facilitate"                        | "Allow" / "Let"                                             |
| "Robust"                            | [Delete, or specific quality: "tested", "handles X"]        |
| "Seamless"                          | [Delete, or what happens: "without restart", "in one step"] |
| "Comprehensive"                     | [Delete, or scope: "covers X, Y, Z"]                        |
| "Ensure"                            | "Check" / "Verify"                                          |
| "Enhance"                           | "Improve" / "Add" / [specific change]                       |
| "Optimize"                          | "Speed up" / "Reduce" / [specific metric]                   |
| "In order to"                       | "To"                                                        |
| "A number of"                       | [Specific number, or "some"]                                |
| "Due to the fact that"              | "Because"                                                   |
| "In the event that"                 | "If"                                                        |
| "Prior to"                          | "Before"                                                    |
| "Has the ability to" / "Is able to" | "Can"                                                       |
| "In terms of"                       | [Delete, restructure sentence]                              |
| Triple adjective stacking           | Pick the one that matters                                   |

## Remediation Protocol

### Step 1: Scan

Read target file(s). Identify all Tier 1 matches (definite slop) and Tier 2 clusters (probable slop).

### Step 2: Classify each finding

- **DELETE** - adds no information (obvious comments, filler phrases, hype copy)
- **REWRITE** - useful information buried under slop language
- **FLAG** - Tier 2 word that might be intentional; needs human judgment

### Step 3: Apply rewrites

Use the substitution table. For items not in the table: replace with the simplest word that preserves meaning. If no meaning is lost by deletion, delete.

### Step 4: Verify

- No Tier 1 phrases remain
- No obvious comments survive
- No hype copy survives
- Remaining comments explain "why" not "what"
- README states what the project does in the first sentence
- No emoji unless established project style

## Output Format

When reporting on a desloppify pass:

```markdown
## Desloppify: [filename]

### Findings
| Line | Tier | Original                  | Action                           |
| ---- | ---- | ------------------------- | -------------------------------- |
| 12   | T1   | "robust and seamless"     | REWRITE -> "handles X without Y" |
| 34   | T3   | "// Initialize the array" | DELETE                           |
| 56   | T2   | "delve into"              | REWRITE -> "examine"             |

### Summary
- Deleted: [n] items
- Rewritten: [n] items
- Flagged: [n] items
```

When directly editing files (not reporting), skip the report - just make the changes.
