declare module 'pagedjs' {
  export class Previewer {
    preview(
      content: string | Element,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: Element,
    ): Promise<{ total: number; performance: number }>
    /** Where paged.js keeps the `<style>` elements it puts in `<head>`: one per sheet and its own base, and one more of its own. */
    polisher: { inserted: HTMLStyleElement[]; styleEl?: HTMLStyleElement }
  }

  /** The part of paged.js's page layout a handler's hooks are given (spec 075). */
  export interface Layout {
    findOverflow(rendered: Element, bounds?: DOMRect): Range | undefined
  }

  /** paged.js's paginator; `loadFonts` runs before every layout (spec 087). */
  export class Chunker {
    loadFonts(): Promise<unknown>
  }

  /** Base class of paged.js's hooks: a method named after a hook is registered on it. */
  export class Handler {
    constructor(chunker: unknown, polisher: unknown, caller: unknown)
  }

  export function registerHandlers(...handlers: Array<new (chunker: unknown, polisher: unknown, caller: unknown) => Handler>): void
}
