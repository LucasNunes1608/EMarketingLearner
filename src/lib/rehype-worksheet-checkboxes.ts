/**
 * Replaces Markdown task-list checkboxes with a CSS-drawn box.
 *
 * GitHub-flavoured Markdown renders `- [ ] item` as a disabled
 * `<input type="checkbox">`. That is wrong for us twice over:
 *
 *  1. Accessibility — a bare input with no label is a critical axe violation
 *     ("Form elements must have labels"), and there are 13 of them on a single
 *     worksheet. The checkbox carries no information the list item text does not
 *     already carry, so exposing it to assistive tech is noise, not meaning.
 *  2. Print — worksheets exist to be printed and filled in with a pen. Browsers
 *     render a disabled checkbox greyed out, which reads as "you cannot use this".
 *
 * So the input becomes a decorative span that CSS draws as an empty square.
 *
 * Written as a manual tree walk rather than pulling in `unist-util-visit`: the
 * traversal is six lines and the project avoids a dependency it does not need.
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function isTaskCheckbox(node: HastNode): boolean {
  return node.tagName === 'input' && node.properties?.type === 'checkbox';
}

function walk(node: HastNode): void {
  if (isTaskCheckbox(node)) {
    node.tagName = 'span';
    node.properties = { className: ['worksheet-box'], 'aria-hidden': 'true' };
    node.children = [];
    return;
  }

  for (const child of node.children ?? []) walk(child);
}

export function rehypeWorksheetCheckboxes() {
  return (tree: HastNode): void => {
    walk(tree);
  };
}
