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

async function build() {
    console.log('🚀 Starting article build process...');

    if (!fs.existsSync(CONTENT_DIR)) {
        console.log('❌ Content directory not found.');
        return;
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

    const articles = [];

    for (const file of files) {
        const filePath = path.join(CONTENT_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        const slug = data.slug || file.replace('.md', '');
        const htmlContent = marked.parse(content);

        let outputHtml = template
            .replaceAll('{{TITLE}}', data.title)
            .replaceAll('{{DESCRIPTION}}', data.description)
            .replaceAll('{{SLUG}}', slug)
            .replaceAll('{{DATE}}', data.date || new Date().toISOString().split('T')[0])
            .replaceAll('{{CONTENT}}', htmlContent);

        const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);
        fs.writeFileSync(outputPath, outputHtml);
        console.log(`✅ Generated: ${outputPath}`);

        articles.push({
            title: data.title,
            description: data.description,
            slug: slug,
            date: data.date || '2000-01-01'
        });
    }

    // Sort by date descending
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    updateLearnIndex(articles);
    updateSitemap(articles);

    console.log('✨ Build process completed successfully!');
}

function updateLearnIndex(articles) {
    let learnHtml = fs.readFileSync(LEARN_INDEX_PATH, 'utf-8');
    
    // We keep the first 3 static ones as "featured" or just keep them? 
    // Usually, we want the generated ones to appear first.
    
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
        // Keep the original static ones? The prompt said "transform to articles"...
        // Let's keep the marker structure.
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
