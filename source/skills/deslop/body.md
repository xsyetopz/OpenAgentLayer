# Desloppify

Strip AI-generated linguistic patterns from code comments, documentation, READMEs, changelogs, commit messages, PR descriptions, and prose.

**Say what things do. Not what they are. Not how great they are.**

## Detection Tiers

### Tier 0 -- Unicode Forensics (auto-fix)

Flag characters that standard keyboards cannot produce. AI models inject these from training data. Replace unconditionally in code, comments, and documentation.

| Char         | Codepoint | Name                | Action                       |
| ------------ | --------- | ------------------- | ---------------------------- |
| `---`        | U+2014    | Em dash             | Replace with ` -- ` or ` - ` |
| `--`         | U+2013    | En dash             | Replace with `-`             |
| `...`        | U+2026    | Horizontal ellipsis | Replace with `...`           |
| `"` `"`      | U+201C/D  | Curly double quotes | Replace with `"`             |
| `'` `'`      | U+2018/9  | Curly single quotes | Replace with `'`             |
| `->`         | U+2192    | Right arrow         | Replace with `->`            |
| `<-`         | U+2190    | Left arrow          | Replace with `<-`            |
| `=>`         | U+21D2    | Double right arrow  | Replace with `=>`            |
| `<=` `>=`    | U+2264/5  | Less/greater-equal  | Replace with `<=` `>=`       |
| `!=`         | U+2260    | Not equal           | Replace with `!=`            |
| `-`          | U+2022    | Bullet              | Replace with `-` or `*`      |
| `.`          | U+00B7    | Middle dot          | Replace with `.`             |
| (c) (tm) (r) | Various   | Legal symbols       | Delete unless legal context  |

**Exemptions**: Markdown tables using `|`, ASCII box-drawing chars (`+`, `-`, `|`), code blocks containing string literals with intentional Unicode, and files where the project already uses these characters as established style.

### Tier 1 -- Dead Giveaways (always remove or rewrite)

These appear 10-100x more often in AI output than human writing. Presence is near-certain AI signal.

**Filler Words:**

```text
robust, seamless, comprehensive, cutting-edge, state-of-the-art, innovative,
streamlined, versatile, scalable, elegant, powerful, flexible, dynamic,
efficient, intuitive, holistic,
leverage, utilize, facilitate, implement (when meaning "use"), enhance,
optimize, ensure, empower, foster, enable, drive, harness, spearhead,
ecosystem, paradigm
```

**Filler Phrases:**

```text
"Sure!" / "Of course!" / "Absolutely!" / "Great question!" / "Excellent point!"
"I'd be happy to" / "I'd love to help" / "Let me know if you need anything else"
"Hope this helps" / "Happy to help" / "Feel free to ask" / "Don't hesitate to"
"I think" / "perhaps" / "it might be worth" / "You might want to consider"
"It depends on your use case" / "There are several approaches"
"Generally speaking" / "One possible approach"
"Let's dive in" / "Let's break this down" / "Without further ado"
"First and foremost" / "Last but not least"
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

**Weasel/Hedge Phrases:**

```text
"It's important to note"   "It's worth mentioning"   "It should be noted that"
"As mentioned earlier"     "At the end of the day"   "In today's landscape"
"In order to"              "Moving forward"           "Needless to say"
"elevate"  "streamline"  "navigate the complexities"  "foster innovation"
"testament"  "tapestry"  "paramount"  "pivotal"  "indispensable"
```

**Placeholder Language** (hard-blocked by anti-placeholder hook -- replace with complete implementation):

```text
"for now"  "simplified version"  "in a real implementation"  "placeholder"  "temporary"
```

### Tier 2 -- Contextual Signals (flag when clustered)

Legitimate words AI overuses. Flag when they appear in groups or where a human would use simpler language.

**Overused Verbs:** `delve, underscore, bolster, pivot, navigate, unpack, unravel, craft, curate, champion, architect (as verb)`

**Overused Adjectives:** `nuanced, multifaceted, intricate, granular, bespoke, thoughtful, meticulous, noteworthy`

**Overused Nouns:** `landscape, realm, journey, deep dive, framework, roadmap, blueprint, ecosystem, stakeholder, touchpoint, bandwidth`

**Structural Tells:**

- Triple adjective stacking: "a robust, scalable, and efficient solution"
- Exactly 3 bullet points in every list (AI default)
- Every paragraph approximately the same length
- Setup-body-conclusion micro-structure in every section
- No sentence fragments -- AI never uses them, humans do
- "While X, Y" opener pattern used repeatedly
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

**Obvious Comments + Narrating Structure (delete entirely):**

```python
counter += 1  # Increment the counter
user = get_user(id)  # Get the user by ID
results = []  # Initialize empty results list
return data  # Return the data
if error:  # Check if there's an error
    raise error  # Raise the error

# Import dependencies
import os

# Define constants
MAX_RETRIES = 3

# Main function
def main():

# Helper functions
def helper():
```

**Non-Information Comments + Verbosity (delete or replace with real code):**

```python
# This class handles user authentication
class UserAuthenticator:

# Constructor
def __init__(self):

# Process the data
def process_data(data):

# AI writes:
if len(items) == 0:
    return []

# Human writes:
if not items:
    return []

# AI writes:
result = some_function()
return result

# Human writes:
return some_function()
```

Placeholder/hedge comments expose missing work. Do not fix by rewriting the comment -- fix by implementing what's missing. Never leave a `TODO` for core function or error handling.

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

**Padding Sections** -- delete "Why X?", "Philosophy", "Our Vision" unless they contain concrete differentiators.

**Emoji Abuse** -- strip emoji from headers and bullets unless established project style. Severity indicators are fine.

### Tier 5 -- Invisible Characters (always remove)

These are invisible but break string matching, URLs, and copy-paste. Always remove. No exemptions.

| Char    | Codepoint | Name                  | Action                     |
| ------- | --------- | --------------------- | -------------------------- |
| (space) | U+00A0    | Non-breaking space    | Replace with regular space |
| (empty) | U+200B    | Zero-width space      | Delete                     |
| (space) | U+202F    | Narrow no-break space | Replace with regular space |
| (empty) | U+00AD    | Soft hyphen           | Delete                     |
| (empty) | U+200C    | Zero-width non-joiner | Delete                     |
| (empty) | U+200D    | Zero-width joiner     | Delete                     |
| (empty) | U+200E    | LTR mark              | Delete                     |
| (empty) | U+200F    | RTL mark              | Delete                     |
| (empty) | U+2060    | Word joiner           | Delete                     |
| (empty) | U+FEFF    | BOM / ZWNBSP          | Delete                     |

## Rewrite Rules

| Slop                                | Replacement                                               |
| ----------------------------------- | --------------------------------------------------------- |
| "Utilize" / "Leverage"              | "Use"                                                     |
| "Facilitate"                        | "Allow" / "Let"                                           |
| "Robust"                            | Delete, or specific quality: "tested", "handles X"        |
| "Seamless"                          | Delete, or what happens: "without restart", "in one step" |
| "Comprehensive"                     | Delete, or scope: "covers X, Y, Z"                        |
| "Ensure"                            | "Check" / "Verify"                                        |
| "Enhance"                           | "Improve" / "Add" / [specific change]                     |
| "In order to"                       | "To"                                                      |
| "Due to the fact that"              | "Because"                                                 |
| "In the event that"                 | "If"                                                      |
| "Prior to"                          | "Before"                                                  |
| "Has the ability to" / "Is able to" | "Can"                                                     |
| "In terms of"                       | Delete, restructure sentence                              |
| Triple adjective stacking           | Pick the one that matters                                 |
| "Streamline"                        | "Simplify" / "Remove steps"                               |
| "Foster"                            | "Encourage" / "Support"                                   |
| "Resonate"                          | "Match" / "Fit"                                           |
| "Stakeholder"                       | "User" / "Team" / specific role                           |
| "Paradigm"                          | "Pattern" / "Approach"                                    |
| "Ecosystem"                         | "System" / "Tools" / specific                             |
| "Curated" / "Crafted"               | "Chosen" / "Made" / "Built"                               |
| "Bespoke"                           | "Custom"                                                  |
| "Aims to"                           | "Does" / specific verb                                    |
| "Serves as"                         | "Is"                                                      |
| "Plays a crucial role"              | "Is needed for" / specific                                |
| "A testament to"                    | Delete, or specific evidence                              |

## Verification Checklist

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

When reporting, use: `| Line | Tier | Original | Action |` table with AUTO-FIX/DELETE/REWRITE/FLAG actions. When directly editing files, skip the report -- just make the changes.
