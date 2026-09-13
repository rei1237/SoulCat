import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { domainEntries } from "@/data/domain-registry";
import { faqJsonLd, routeMetadata, seoRouteBySlug, seoRoutes } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return seoRoutes.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = seoRouteBySlug.get(slug);
  if (!route) return {};
  return routeMetadata(route);
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const route = seoRouteBySlug.get(slug);
  if (!route) notFound();

  return (
    <main className="seo-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(route)) }}
      />
      <section className="seo-hero" aria-labelledby="seo-title">
        <p className="seo-kicker">사주보는 고양이 영냥이</p>
        <h1 id="seo-title">{route.title}</h1>
        <p>{route.description}</p>
        <div className="seo-actions">
          <a className="primary-cta" href={route.ctaHref}>
            {route.ctaLabel}
          </a>
          <a className="outlined-cta" href="/fortune/">
            운세 전체 보기
          </a>
        </div>
      </section>

      <section className="seo-panel" aria-label="검색 의도">
        <strong>이 페이지가 답하는 질문</strong>
        <p>{route.intent}</p>
      </section>

      <section className="seo-section-grid" aria-label="핵심 안내">
        {route.sections.map((section) => (
          <article key={section.title} className="seo-section">
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      <section className="seo-domain-list" aria-labelledby="seo-domains-title">
        <h2 id="seo-domains-title">영냥이가 보는 운세 체계</h2>
        <div>
          {domainEntries.map((entry) => (
            <a key={entry.domain} href={`/${entry.slug}/`}>
              <span>{entry.label}</span>
              <small>{entry.shortDescription}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="seo-faq" aria-labelledby="seo-faq-title">
        <h2 id="seo-faq-title">자주 묻는 질문</h2>
        {route.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
