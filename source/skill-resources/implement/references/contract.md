# Implementation contract

Before editing, identify:

- owner package or source record
- generated or runtime artifact affected
- existing validation or acceptance gap
- source truth that defines behavior

During editing:

- prefer direct code over generic frameworks
- do not leave placeholder branches
- do not create disconnected catalogs
- do not edit generated files directly when authored source exists
- use scripts for safe mechanical rewrites, then inspect the result

Done means code is consumed by source loading, rendering, deployment, runtime execution, uninstall, or acceptance validation.
