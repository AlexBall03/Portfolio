import { jsonLdText } from '@/lib/seo/structured-data';

/** Server-rendered structured data block. Content is escaped by `jsonLdText`. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
