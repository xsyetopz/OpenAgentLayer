# RTK Efficiency and OAL Runner Plan

## Problem

RTK gives high savings on many development commands, but aggregate impact depends on command coverage, shell-shape handling, output budgets, and repeated read/search behavior.

Runner risks OAL must avoid:

- command policy living only in prompt text
- hook enforcement parsing shell strings ad hoc
- unsupported commands bypassing useful compaction
- command chains and shell operators breaking reliable wrapping
- repeated low-yield read/search loops

## Decision

OAL does not treat RTK as the whole solution. OAL provides a runner layer and uses RTK as one filter backend when useful.

## Runner Responsibilities

`oal-runner` owns:

- command parsing
- shell operator segmentation
- filter selection
- token budget enforcement
- output summarization
- exit-code preservation
- command history metrics
- RTK capability probing
- fallback compaction when RTK has no filter

## RTK Compatibility

`oal doctor rtk` must detect:

- `rtk` path
- version
- `rtk gain` availability
- supported rewrite/filter commands
- project/global history availability
- broken recursion or proxy behavior

The runner stores a capability map. Hook logic uses the map instead of guessing.

## Command Policy

| Command Shape                         | OAL Behavior                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| known high-yield command              | use RTK or native OAL filter                                                 |
| unsupported simple command            | run through OAL generic compact filter                                       |
| shell chain                           | segment and filter each command when safe                                    |
| command with redirection/substitution | preserve shell semantics; apply output budget                                |
| destructive command                   | require explicit approval/request evidence                                   |
| repeated low-yield read/search        | suggest narrower harness-internal context retrieval to agent route, not user |

## Token Budgets

Each task contract gets budgets:

- command output budget
- search/read budget
- test failure budget
- final answer budget

Budget overflow should produce useful summaries, not raw truncation.

## Metrics

Track per project:

- raw output tokens
- kept output tokens
- estimated saved tokens
- command count
- unsupported command count
- low-yield command count
- repeated same-command count
- average output kept per validation command

Targets for v4 beta:

- project-level saved tokens >= 60% on supported development loops
- `rtk read`-style low-yield loops reduced by 50%
- zero hook recursion incidents
- zero regex-only completion blocks

## Roadmap Tie-In

The runner must be implemented before strict hook enforcement. Otherwise hooks duplicate shell-string parsing.
