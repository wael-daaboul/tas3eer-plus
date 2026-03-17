import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';

const CONTENT_DIR = './content/articles';
const OUTPUT_DIR = './learn';
const TEMPLATE_PATH = './learn/article-template.html';
const LEARN_INDEX_PATH = './learn/index.html';
const SITEMAP_PATH = './sitemap.xml';
const BASE_URL = 'https://pricingplus.app';

// Smart CTA Config: Keyword -> Widget HTML
const SMART_CTAS = [
    {
        keywords: ['ساعة', 'أجر الساعة', 'ساعتك'],
        html: `<div class="cta-widget" style="border: 2px solid var(--pp-blue); border-radius: var(--pp-radius-sm); padding: 1.5rem; margin: 2rem 0; background: var(--pp-bg-soft);">
            <h4 style="margin-top: 0;">⏱️ هل تحسب وقتك بشكل صحيح؟</h4>
            <p>لا تترك أرباحك للصدفة. استخدم أداة حساب أجر الساعة الاحترافية لضمان تسعير مجهودك بدقة.</p>
            <a href="/app/" class="btn btn-primary">ابدأ الحساب الآن</a>
        </div>`
    },
    {
        keywords: ['نقطة التعادل', 'الربح والخسارة', 'متى أربح'],
        html: `<div class="cta-widget" style="border: 2px solid #10b981; border-radius: var(--pp-radius-sm); padding: 1.5rem; margin: 2rem 0; background: #f0fdf4;">
            <h4 style="margin-top: 0; color: #059669;">📊 خطط لنجاحك المالي</h4>
            <p>اكتشف "نقطة التعادل" لمشروعك خلال ثوانٍ. الأداة تقوم بكافة الحسابات المعقدة نيابة عنك.</p>
            <a href="/app/" class="btn btn-primary" style="background: #10b981; border-color: #10b981;">احسب نقطة تعادلك</a>
        </div>`
    }
];

async function build() {
    console.log('🚀 Starting article build process...');

    if (!fs.existsSync(CONTENT_DIR)) {
        console.log('❌ Content directory not found.');
        return;
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

    // Step 1: Pre-scan all articles for metadata (Tags, Titles, etc.)
    const allArticles = files.map(file => {
        const filePath = path.join(CONTENT_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(fileContent);
        return {
            title: data.title,
            description: data.description,
            tags: data.tags || [],
            slug: data.slug || file.replace('.md', ''),
            date: data.date || '2000-01-01'
        };
    });

    for (const file of files) {
        const filePath = path.join(CONTENT_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        const slug = data.slug || file.replace('.md', '');
        
        // Remove the first H1 title from content if it exists to avoid double rendering
        // as the template already includes <h1>{{TITLE}}</h1>
        const cleanContent = content.replace(/^#\s+.+$/m, '');
        let htmlContent = marked.parse(cleanContent);

        // Step 2: Image SEO Automation
        // Add alt, title, and loading="lazy" if missing or generic
        htmlContent = htmlContent.replace(/<img\s+([^>]*src="([^"]+)"[^>]*)>/gi, (match, attrs, src) => {
            if (attrs.includes('loading=')) return match;
            const alt = data.title; // Fallback to article title
            return `<img ${attrs} alt="${alt}" title="${alt}" loading="lazy" style="max-width: 100%; height: auto; border-radius: var(--pp-radius-sm);">`;
        });

        // Step 3: Smart CTA Injection (only once per keyword group per article)
        SMART_CTAS.forEach(cta => {
            let found = false;
            cta.keywords.forEach(keyword => {
                if (!found && htmlContent.includes(keyword)) {
                    // Inject after the first paragraph or list item containing the keyword
                    const regex = new RegExp(`(<(p|li)>[^<]*${keyword}[^<]*<\/(p|li)>)`, 'i');
                    if (regex.test(htmlContent)) {
                        htmlContent = htmlContent.replace(regex, `$1\n${cta.html}`);
                        found = true;
                    }
                }
            });
        });

        // Step 4: Related Articles Logic
        const related = allArticles
            .filter(a => a.slug !== slug)
            .map(a => {
                const overlap = a.tags.filter(t => (data.tags || []).includes(t)).length;
                return { ...a, overlap };
            })
            .sort((a, b) => b.overlap - a.overlap || new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        const relatedHtml = related.map(a => `
          <a href="/learn/${a.slug}.html" class="related-card">
            <h4>${a.title}</h4>
            <p>${a.description}</p>
          </a>`).join('\n');

        // Step 5: JSON-LD Schema
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": data.title,
            "description": data.description,
            "datePublished": data.date || new Date().toISOString().split('T')[0],
            "author": {
                "@type": "Organization",
                "name": "تيم تسعير+",
                "url": "https://pricingplus.app"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Pricing+",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://pricingplus.app/assets/brand/logo-ar.svg"
                }
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `${BASE_URL}/learn/${slug}.html`
            }
        };
        const schemaJson = `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;

        // Step 6: Template Replacement
        let outputHtml = template
            .replaceAll('{{TITLE}}', data.title)
            .replaceAll('{{DESCRIPTION}}', data.description)
            .replaceAll('{{SLUG}}', slug)
            .replaceAll('{{DATE}}', data.date || new Date().toISOString().split('T')[0])
            .replaceAll('{{CONTENT}}', htmlContent)
            .replaceAll('{{RELATED_ARTICLES}}', relatedHtml)
            .replaceAll('{{{SCHEMA_JSON}}}', schemaJson);

        const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
        fs.writeFileSync(outputPath, outputHtml);
        console.log(`✅ Generated: ${outputPath}`);
    }

    // Sort by date descending for index
    const sortedArticles = [...allArticles].sort((a, b) => new Date(b.date) - new Date(a.date));

    updateLearnIndex(sortedArticles);
    updateSitemap(sortedArticles);

    console.log('✨ Build process completed successfully!');
}

function updateLearnIndex(articles) {
    let learnHtml = fs.readFileSync(LEARN_INDEX_PATH, 'utf-8');
    
    const articleCards = articles.map(art => `
      <article class="card">
        <h2>${art.title}</h2>
        <p class="card-desc">${art.description}</p>
        <div class="actions-row"><a class="btn btn-secondary" href="/learn/${art.slug}.html">اقرأ المقال الكامل</a></div>
      </article>`).join('\n');

    const startMarker = '<!-- ARTICLES_LIST_START -->';
    const endMarker = '<!-- ARTICLES_LIST_END -->';
    
    const startIndex = learnHtml.indexOf(startMarker) + startMarker.length;
    const endIndex = learnHtml.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        const updatedHtml = learnHtml.substring(0, startIndex) + '\n' + articleCards + '\n      ' + learnHtml.substring(endIndex);
        fs.writeFileSync(LEARN_INDEX_PATH, updatedHtml);
        console.log('✅ Updated learn index with new articles.');
    }
}

function updateSitemap(articles) {
    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    
    articles.forEach(art => {
        const url = `${BASE_URL}/learn/${art.slug}.html`;
        if (!sitemap.includes(url)) {
            const closingTag = '</urlset>';
            sitemap = sitemap.replace(closingTag, `  <url><loc>${url}</loc></url>\n${closingTag}`);
            console.log(`✅ Added to sitemap: ${url}`);
        }
    });

    fs.writeFileSync(SITEMAP_PATH, sitemap);
}

build().catch(err => {
    console.error('💥 Build failed:', err);
    process.exit(1);
});
