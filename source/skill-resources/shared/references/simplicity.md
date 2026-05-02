# Simplicity discipline

Use this when code structure, package boundaries, abstractions, prompt contracts, or generated artifacts start to hide the real behavior.

> “An idiot admires complexity; a genius admires simplicity; a physicist tries to make it simple. For an idiot, anything--the more complicated it is, the more he will admire it. If you make something so clusterfucked he can't understand it, he's gonna think you're a God, cause you made it so complicated nobody can understand it. That's how they write journals in Academics: they try to make it so complicated people think you're a genius.”
>
> -- Terry A. Davis, Creator of TempleOS

**Apply it as an engineering constraint:**

- prefer the smallest source-backed shape that exposes the real behavior
- delete pass-through abstractions that only make the system harder to inspect
- keep package boundaries named after the thing they own
- reject clever indirection when a direct function, table, or renderer is clearer
- block when missing evidence would force invention
