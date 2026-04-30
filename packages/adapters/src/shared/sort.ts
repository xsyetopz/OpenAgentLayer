export function compareByPath(
	left: { readonly path: string },
	right: { readonly path: string },
): number {
	return left.path.localeCompare(right.path);
}
