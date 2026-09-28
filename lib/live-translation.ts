export type TranslationRecord = { source: string; rendered: string };
// Keep the original only while the DOM contains our last translation.
// A new React value (loaded count, random pick, status) becomes the new source.
export function reconcileTranslation(current: string, previous: TranslationRecord | undefined, translate: (source:string) => string): TranslationRecord {
  const source = previous && current === previous.rendered ? previous.source : current;
  return {source,rendered:translate(source)};
}
