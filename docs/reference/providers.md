# Provider Registry

`source/providers.toml` is the source of truth.

| Provider | required | sync_mode | default | macOS install | probe | provenance |
| --- | --- | --- | --- | --- | --- | --- |
| `caveman` | true | exact-upstream | sync-only | — | — | `providers/caveman/upstream`, `providers/caveman/overlay` |
| `rtk` | true | exact-upstream | external-binary | `brew install rtk-ai/tap/rtk` | `rtk --version`; `rtk gain`; `rtk rewrite <command>` | `providers/rtk/upstream`, `providers/rtk/overlay` |
| `bmad-method` | true | upstream-extraction | sync-extract | — | — | `providers/bmad-method/upstream`, `providers/bmad-method/overlay` |
| `taste-skill` | true | exact-upstream | sync-only | — | — | `providers/taste-skill/upstream`, `providers/taste-skill/overlay` |
| `context7` | false | optional-cli | cli-only | `bunx --bun @upstash/context7` | `context7 --version`; `ctx7 --version` | `providers/context7/upstream`, `providers/context7/overlay` |
| `playwright-cli` | false | optional-cli | cli-only | `bunx playwright-cli` | `playwright-cli --help` | `providers/playwright-cli/upstream`, `providers/playwright-cli/overlay` |
| `deepwiki` | false | optional-cli | cli-only | `bunx deepwiki` | `deepwiki --help` | `providers/deepwiki/upstream`, `providers/deepwiki/overlay` |

All providers set `raw_upstream_editable = false` and `pin_required = true`.
