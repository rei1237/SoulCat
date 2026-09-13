import { absoluteUrl, siteName } from "@/lib/seo";
import FortuneHome from "@/components/FortuneHome";
export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({"@context":"https://schema.org","@type":"WebSite",name:siteName,url:absoluteUrl("/yeongnyangi/"),publisher:{"@type":"Organization",name:"Code Destiny",url:"https://code-destiny.com/"}})}} /><FortuneHome /></>;
}
