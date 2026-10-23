// Turns a practical sheet on screen into what the trainer receives:
//   html    – a clean copy of the printed record (name, readings, result) that Google turns into the PDF
//   tables  – every observation / result table as plain rows, so the dashboard can show the readings
//   correct / wrong – how many ✓ and ✗ marks the tables carry
// It keeps what the browser prints and drops what it hides: buttons, hints, the step list, the diagrams.

export interface SnapshotTable {
  title: string;
  rows: string[][];
}

export interface Snapshot {
  html: string;
  tables: SnapshotTable[];
  correct: number;
  wrong: number;
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const FIELDS = 'input, select, textarea';
const DROP = 'svg, canvas, button, script, style, img, aside, [hidden]';
const MAX_HTML = 900_000;

const squash = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** What a field shows. Typed values are properties, not attributes, so cloneNode does not carry them over. */
function shown(f: Field): string | null {
  if (f instanceof HTMLSelectElement) return f.selectedOptions[0]?.text ?? '';
  if (f instanceof HTMLInputElement) {
    if (f.type === 'range' || f.type === 'hidden' || f.type === 'button' || f.type === 'submit') return null;
    if (f.type === 'checkbox' || f.type === 'radio') return f.checked ? 'Yes' : '';
  }
  return f.value;
}

/** The nearest heading above a table, e.g. "Observation table". */
function titleOf(table: Element): string {
  for (let n: Element | null = table; n; n = n.parentElement) {
    for (let s = n.previousElementSibling; s; s = s.previousElementSibling) {
      if (/^H[1-6]$/.test(s.tagName)) return squash(s.textContent);
    }
    const own = n.parentElement?.querySelector(':scope > h4');
    if (own) return squash(own.textContent);
  }
  return '';
}

export function buildSnapshot(root: HTMLElement): Snapshot {
  const clone = root.cloneNode(true) as HTMLElement;

  const live = root.querySelectorAll<Field>(FIELDS);
  const copy = clone.querySelectorAll<Field>(FIELDS);
  live.forEach((src, i) => {
    const text = shown(src);
    if (text == null) copy[i].remove();
    else {
      const span = document.createElement('span');
      span.textContent = text;
      copy[i].replaceWith(span);
    }
  });

  // Class names are hashed by the build, but "noPrint" survives inside them.
  clone.querySelectorAll('[class*="noPrint"]').forEach((e) => e.remove());
  clone.querySelectorAll(DROP).forEach((e) => e.remove());

  // Open every <details> as plain text, as the print view does.
  clone.querySelectorAll('details').forEach((d) => {
    const box = document.createElement('div');
    const head = d.querySelector(':scope > summary');
    if (head) {
      const h = document.createElement('h4');
      h.textContent = squash(head.textContent);
      box.append(h);
      head.remove();
    }
    box.append(...Array.from(d.childNodes));
    d.replaceWith(box);
  });

  const tables: SnapshotTable[] = [];
  let correct = 0;
  let wrong = 0;
  clone.querySelectorAll('table').forEach((t) => {
    const rows = Array.from(t.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((c) => squash(c.textContent)));
    if (rows.length) tables.push({title: titleOf(t), rows});
    correct += (t.textContent?.match(/✓/g) ?? []).length;
    wrong += (t.textContent?.match(/✗/g) ?? []).length;
  });

  clone.querySelectorAll('*').forEach((e) => {
    for (const a of Array.from(e.attributes)) {
      if (a.name === 'class' || a.name === 'id' || a.name === 'role' || a.name === 'tabindex' || a.name.startsWith('aria-') || a.name.startsWith('data-')) {
        e.removeAttribute(a.name);
      }
    }
  });

  const html = clone.innerHTML;
  return {html: html.length > MAX_HTML ? html.slice(0, MAX_HTML) : html, tables, correct, wrong};
}
