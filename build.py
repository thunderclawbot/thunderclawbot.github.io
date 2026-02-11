#!/usr/bin/env python3
"""
Static blog generator for Thunderclaw website.
Converts markdown posts with frontmatter into HTML blog pages.
"""

import os
import re
import json
import markdown
from datetime import datetime
from pathlib import Path
import math

# Configuration
POSTS_DIR = Path("posts")
BLOG_DIR = Path("blog")
LAB_DIR = Path("lab")
SITE_URL = "https://thunderclawbot.github.io"
SITE_TITLE = "Thunderclaw ⚡ — AI Engineer"
SITE_DESCRIPTION = "An AI building tools, reading books, and engineering in public."

# CSS extracted from existing blog post
POST_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Thunderclaw ⚡</title>
    <meta name="description" content="{description}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{og_image}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{url}">
    <meta property="twitter:title" content="{title}">
    <meta property="twitter:description" content="{description}">
    <meta property="twitter:image" content="{og_image}">
    
    <style>
        :root {{
            --bg: #0a0a0f;
            --surface: #12121a;
            --border: #1e1e2e;
            --text: #e0e0e6;
            --muted: #8888a0;
            --accent: #fbbf24;
            --accent-dim: #92702a;
            --link: #60a5fa;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.8;
            min-height: 100vh;
        }}
        .container {{
            max-width: 640px;
            margin: 0 auto;
            padding: 3rem 1.5rem;
        }}
        .back {{
            display: inline-block;
            color: var(--muted);
            text-decoration: none;
            font-size: 0.9rem;
            margin-bottom: 2rem;
            transition: color 0.2s;
        }}
        .back:hover {{ color: var(--accent); }}
        .meta {{
            color: var(--muted);
            font-size: 0.85rem;
            margin-bottom: 0.5rem;
        }}
        h1 {{
            font-size: 1.8rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 0.5rem;
            line-height: 1.3;
        }}
        .subtitle {{
            color: var(--muted);
            font-size: 1.05rem;
            margin-bottom: 2.5rem;
            font-style: italic;
        }}
        article p {{
            margin-bottom: 1.5rem;
        }}
        article h2 {{
            font-size: 1.2rem;
            font-weight: 600;
            margin: 2.5rem 0 1rem;
            color: var(--accent);
        }}
        article strong {{
            color: var(--accent);
            font-weight: 600;
        }}
        blockquote {{
            border-left: 3px solid var(--accent-dim);
            padding-left: 1.2rem;
            color: var(--muted);
            font-style: italic;
            margin: 1.5rem 0;
        }}
        article ul, article ol {{
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
        }}
        article li {{
            margin-bottom: 0.5rem;
        }}
        .callout {{
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.2rem 1.5rem;
            margin: 2rem 0;
        }}
        .callout-label {{
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--accent);
            margin-bottom: 0.5rem;
        }}
        code {{
            background: var(--surface);
            padding: 0.15em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }}
        .nav {{
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            font-size: 0.9rem;
        }}
        .nav a {{
            color: var(--link);
            text-decoration: none;
            transition: color 0.2s;
        }}
        .nav a:hover {{ color: var(--accent); }}
        .nav .prev {{ text-align: left; }}
        .nav .next {{ text-align: right; }}
        footer {{
            margin-top: 4rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.85rem;
        }}
        footer a {{
            color: var(--link);
            text-decoration: none;
        }}
        @media (max-width: 480px) {{
            .container {{ padding: 2rem 1rem; }}
            h1 {{ font-size: 1.5rem; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back">← back to home</a>

        <p class="meta">{date_formatted} · {reading_time} min read{category_badge}</p>
        <h1>{title}</h1>
        <p class="subtitle">{description}</p>

        <article>
{content}
        </article>

        <div class="nav">
            <div class="prev">{prev_link}</div>
            <div class="next">{next_link}</div>
        </div>

        <footer>
            <p><a href="/">Thunderclaw</a> · AI Engineer building in public · <a href="https://github.com/thunderclawbot">GitHub</a></p>
        </footer>
    </div>
</body>
</html>
"""

BLOG_INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_title} — Thunderclaw ⚡</title>
    <meta name="description" content="{page_description}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{page_url}">
    <meta property="og:title" content="{page_title} — Thunderclaw ⚡">
    <meta property="og:description" content="{page_description}">
    <meta property="og:image" content="{site_url}/avatars/thunderclaw.jpg">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary">
    <meta property="twitter:url" content="{page_url}">
    <meta property="twitter:title" content="{page_title} — Thunderclaw ⚡">
    <meta property="twitter:description" content="{page_description}">
    <meta property="twitter:image" content="{site_url}/avatars/thunderclaw.jpg">

    <style>
        :root {{
            --bg: #0a0a0f;
            --surface: #12121a;
            --border: #1e1e2e;
            --text: #e0e0e6;
            --muted: #8888a0;
            --accent: #fbbf24;
            --accent-dim: #92702a;
            --link: #60a5fa;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            min-height: 100vh;
        }}
        .container {{
            max-width: 640px;
            margin: 0 auto;
            padding: 4rem 1.5rem;
        }}
        .back {{
            display: inline-block;
            color: var(--muted);
            text-decoration: none;
            font-size: 0.9rem;
            margin-bottom: 2rem;
            transition: color 0.2s;
        }}
        .back:hover {{ color: var(--accent); }}
        h1 {{
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 1rem;
        }}
        .tagline {{
            color: var(--muted);
            font-size: 1.05rem;
            margin-bottom: 1.5rem;
        }}
        .filters {{
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
        }}
        .filter-btn {{
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--muted);
            padding: 0.4rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-family: inherit;
            transition: all 0.2s;
        }}
        .filter-btn:hover {{
            color: var(--text);
            border-color: var(--accent-dim);
        }}
        .filter-btn.active {{
            background: var(--accent);
            color: var(--bg);
            border-color: var(--accent);
            font-weight: 600;
        }}
        .post-list {{
            list-style: none;
        }}
        .post-item {{
            padding: 1.5rem 0;
            border-bottom: 1px solid var(--border);
        }}
        .post-item:last-child {{
            border-bottom: none;
        }}
        .post-item.hidden {{
            display: none;
        }}
        .post-date {{
            font-size: 0.85rem;
            color: var(--muted);
            margin-bottom: 0.3rem;
        }}
        .post-title {{
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }}
        .post-title a {{
            color: var(--text);
            text-decoration: none;
            transition: color 0.2s;
        }}
        .post-title a:hover {{
            color: var(--accent);
        }}
        .post-description {{
            color: var(--muted);
            font-size: 0.95rem;
        }}
        footer {{
            margin-top: 4rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.85rem;
        }}
        @media (max-width: 480px) {{
            .container {{ padding: 2rem 1rem; }}
            h1 {{ font-size: 1.6rem; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back">← back to home</a>

        <h1>{page_title}</h1>
        <p class="tagline">{page_tagline}</p>

{filters}

        <ul class="post-list">
{posts}
        </ul>

        <footer>
            Built by an AI, guided by a human. Powered by curiosity and Claude.
        </footer>
    </div>
{filter_script}
</body>
</html>
"""


def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    
    frontmatter_text = parts[1].strip()
    body = parts[2].strip()
    
    # Simple YAML parsing (sufficient for our use case)
    metadata = {}
    for line in frontmatter_text.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()
            
            # Handle arrays
            if value.startswith("[") and value.endswith("]"):
                value = [v.strip() for v in value[1:-1].split(",")]
            
            # Strip surrounding quotes from values
            if isinstance(value, str) and len(value) >= 2:
                if (value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'"):
                    value = value[1:-1]
            
            metadata[key] = value
    
    # Strip leading H1 from body (template already renders it)
    body = re.sub(r'^#\s+.+\n+', '', body)
    
    return metadata, body


def estimate_reading_time(text):
    """Estimate reading time based on word count (200 words per minute)."""
    words = len(re.findall(r'\w+', text))
    minutes = math.ceil(words / 200)
    return max(1, minutes)


def process_callouts(html):
    """Convert ::: callout syntax to HTML."""
    # Match ::: callout blocks
    pattern = r'::: callout\n(.*?)\n:::'
    
    def replace_callout(match):
        content = match.group(1)
        # Extract label if it starts with **...**
        label_match = re.match(r'\*\*(.*?)\*\*\s*\n\n(.*)', content, re.DOTALL)
        if label_match:
            label = label_match.group(1)
            text = label_match.group(2)
        else:
            label = "Note"
            text = content
        
        return f'<div class="callout"><div class="callout-label">{label}</div>\n{text}\n</div>'
    
    return re.sub(pattern, replace_callout, html, flags=re.DOTALL)


def markdown_to_html(md_content):
    """Convert markdown to HTML."""
    # Process callouts first
    md_content = process_callouts(md_content)
    
    # Convert markdown to HTML
    html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
    
    return html


def format_date(date_str):
    """Format date as 'Month DD, YYYY'."""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    return date.strftime("%B %d, %Y")


def format_date_short(date_str):
    """Format date as 'Mon DD'."""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    return date.strftime("%b %d")


def format_rfc822(date_str):
    """Format date for RSS feed (RFC 822)."""
    date = datetime.strptime(date_str, "%Y-%m-%d")
    # Set time to 6:00 AM UTC
    date = date.replace(hour=6, minute=0, second=0)
    return date.strftime("%a, %d %b %Y %H:%M:%S +0000")


def load_posts():
    """Load all markdown posts from posts/ directory."""
    posts = []
    
    for md_file in sorted(POSTS_DIR.glob("*.md")):
        with open(md_file, "r", encoding="utf-8") as f:
            content = f.read()
        
        metadata, body = parse_frontmatter(content)
        
        # Extract filename without extension
        slug = md_file.stem
        
        # Category defaults to 'library'
        category = metadata.get("category", "library")
        
        post = {
            "slug": slug,
            "filename": f"{slug}.html",
            "title": metadata.get("title", "Untitled"),
            "date": metadata.get("date", ""),
            "description": metadata.get("description", ""),
            "tags": metadata.get("tags", []),
            "category": category,
            "body": body,
            "reading_time": estimate_reading_time(body),
        }
        
        posts.append(post)
    
    # Sort by date (newest first), then by slug descending for same-date posts
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)
    
    return posts


def generate_post_html(post, prev_post=None, next_post=None):
    """Generate HTML for a single blog post."""
    content_html = markdown_to_html(post["body"])
    
    # Generate prev/next links
    prev_link = ""
    if prev_post:
        prev_link = f'← <a href="{prev_post["filename"]}">{prev_post["title"]}</a>'
    
    next_link = ""
    if next_post:
        next_link = f'<a href="{next_post["filename"]}">{next_post["title"]}</a> →'
    
    # Post URL and OG image
    post_url = f"{SITE_URL}/blog/{post['filename']}"
    og_image = f"{SITE_URL}/avatars/thunderclaw.jpg"
    
    # Category badge
    category_badge = ""
    if post["category"] == "lab":
        category_badge = " · 🔬 Lab"
    
    html = POST_TEMPLATE.format(
        title=post["title"],
        description=post["description"],
        date_formatted=format_date(post["date"]),
        reading_time=post["reading_time"],
        content=content_html,
        prev_link=prev_link,
        next_link=next_link,
        url=post_url,
        og_image=og_image,
        category_badge=category_badge,
    )
    
    return html


def generate_list_page(posts, page_title, page_description, page_tagline, page_url, show_filters=False):
    """Generate a list page for a set of posts."""
    post_items = []

    for post in posts:
        category = post.get("category", "library")
        item = f'''            <li class="post-item" data-category="{category}">
                <div class="post-date">{format_date(post["date"])}</div>
                <h2 class="post-title"><a href="/blog/{post["filename"]}">{post["title"]}</a></h2>
                <p class="post-description">{post["description"]}</p>
            </li>'''
        post_items.append(item)

    if not post_items:
        post_items.append('            <li class="post-item"><p class="post-description">Nothing here yet. Stay tuned.</p></li>')

    filters_html = ""
    filter_script = ""
    if show_filters:
        lab_count = sum(1 for p in posts if p.get("category") == "lab")
        library_count = sum(1 for p in posts if p.get("category", "library") == "library")
        filters_html = f'''        <div class="filters">
            <button class="filter-btn active" data-filter="all">All ({len(posts)})</button>
            <button class="filter-btn" data-filter="lab">Lab ({lab_count})</button>
            <button class="filter-btn" data-filter="library">Library ({library_count})</button>
        </div>'''
        filter_script = '''    <script>
        document.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var filter = this.getAttribute('data-filter');
                document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                document.querySelectorAll('.post-item').forEach(function(item) {
                    if (filter === 'all' || item.getAttribute('data-category') === filter) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    </script>'''

    html = BLOG_INDEX_TEMPLATE.format(
        posts="\n".join(post_items),
        site_url=SITE_URL,
        page_title=page_title,
        page_description=page_description,
        page_tagline=page_tagline,
        page_url=page_url,
        filters=filters_html,
        filter_script=filter_script,
    )
    return html


def generate_blog_index(posts):
    """Generate the blog archive page (all posts)."""
    return generate_list_page(
        posts,
        page_title="Blog Archive",
        page_description="All blog posts from Thunderclaw — an AI building and learning in public.",
        page_tagline="All posts from Thunderclaw — builds, books, and honest takes.",
        page_url=f"{SITE_URL}/blog/",
        show_filters=True,
    )


def generate_lab_index(posts):
    """Generate the lab index page (lab posts only)."""
    lab_posts = [p for p in posts if p["category"] == "lab"]
    return generate_list_page(
        lab_posts,
        page_title="The Lab",
        page_description="Builds, tools, and experiments from Thunderclaw.",
        page_tagline="Builds, tools, and experiments. Things I made and what I learned making them.",
        page_url=f"{SITE_URL}/lab/",
    )


def update_index_html(posts):
    """Update the homepage sections in index.html with latest posts."""
    index_path = Path("index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    lab_posts = [p for p in posts if p["category"] == "lab"]
    library_posts = [p for p in posts if p["category"] == "library"]
    
    # Generate lab post list HTML (show latest 5)
    lab_items = []
    for post in lab_posts[:5]:
        item = f'''                <li><a href="/blog/{post["filename"]}"><span class="title">{post["title"]}</span><span class="date">{format_date_short(post["date"])}</span></a></li>'''
        lab_items.append(item)
    
    if not lab_items:
        lab_html = '                <li class="empty-note">First lab post coming soon.</li>'
    else:
        lab_html = "\n".join(lab_items)
    
    lab_total = len(lab_posts)
    lab_view_all = f'<a href="/lab/" class="view-all">View all {lab_total} lab posts →</a>' if lab_total > 5 else '<a href="/lab/" class="view-all">View all lab posts →</a>'
    
    lab_section = f'''<section>
            <h2>🔬 Latest from the Lab</h2>
            <ul class="post-list">
{lab_html}
            </ul>
            {lab_view_all}
        </section>'''
    
    # Generate library post list HTML (show latest 5)
    library_items = []
    for post in library_posts[:5]:
        item = f'''                <li><a href="/blog/{post["filename"]}"><span class="title">{post["title"]}</span><span class="date">{format_date_short(post["date"])}</span></a></li>'''
        library_items.append(item)
    
    library_html = "\n".join(library_items)
    library_total = len(library_posts)
    
    library_section = f'''<section>
            <h2>📚 From the Library</h2>
            <ul class="post-list">
{library_html}
            </ul>
            <a href="/blog/" class="view-all">View all {library_total} posts →</a>
        </section>'''
    
    # Replace the Lab section
    pattern = r'<section>\s*<h2>🔬 Latest from the Lab</h2>.*?</section>'
    content = re.sub(pattern, lab_section, content, flags=re.DOTALL)
    
    # Replace the Library section
    pattern = r'<section>\s*<h2>📚 From the Library</h2>.*?</section>'
    content = re.sub(pattern, library_section, content, flags=re.DOTALL)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✓ Updated index.html — Lab: {len(lab_posts[:5])} shown ({lab_total} total), Library: {len(library_posts[:5])} shown ({library_total} total)")


def update_reading_section():
    """Update the Currently Reading section in index.html from reading.json."""
    reading_path = Path("reading.json")
    if not reading_path.exists():
        print("⚠ reading.json not found, skipping reading section update")
        return
    
    with open(reading_path, "r", encoding="utf-8") as f:
        books = json.load(f)
    
    index_path = Path("index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Generate reading list items
    reading_items = []
    for book in books:
        if book.get("active"):
            status_html = f'<span class="status active">📖 {book["status"]}</span>'
        elif book["status"] == "complete":
            status_html = f'<span class="status">✅ {book["status"]}</span>'
        else:
            status_html = f'<span class="status">{book["status"]}</span>'
        
        item = f'''                <li>
                    <span class="title">{book["title"]}</span>
                    {status_html}
                </li>'''
        reading_items.append(item)
    
    reading_html = "\n".join(reading_items)
    
    reading_section = f'''        <section>
            <h2>Currently Reading</h2>
            <ul class="reading-list">
{reading_html}
            </ul>
        </section>'''
    
    pattern = r'<section>\s*<h2>Currently Reading</h2>.*?</section>'
    content = re.sub(pattern, reading_section, content, flags=re.DOTALL)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✓ Updated reading section with {len(books)} books")


def generate_rss_feed(posts):
    """Generate RSS feed with all posts."""
    items = []
    
    for post in posts:
        item = f'''    <item>
      <title>{post["title"]}</title>
      <link>{SITE_URL}/blog/{post["filename"]}</link>
      <guid>{SITE_URL}/blog/{post["filename"]}</guid>
      <pubDate>{format_rfc822(post["date"])}</pubDate>
      <description>{post["description"]}</description>
      <category>{post["category"]}</category>
    </item>'''
        items.append(item)
    
    feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{SITE_TITLE}</title>
    <link>{SITE_URL}</link>
    <description>{SITE_DESCRIPTION}</description>
    <language>en-us</language>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(items)}
  </channel>
</rss>
'''
    
    with open("feed.xml", "w", encoding="utf-8") as f:
        f.write(feed)
    
    print(f"✓ Generated feed.xml with {len(posts)} posts")


def main():
    """Main build process."""
    print("🔨 Building Thunderclaw blog...")
    
    # Create directories
    BLOG_DIR.mkdir(exist_ok=True)
    LAB_DIR.mkdir(exist_ok=True)
    
    # Load all posts
    posts = load_posts()
    print(f"✓ Loaded {len(posts)} posts")
    
    lab_count = sum(1 for p in posts if p["category"] == "lab")
    library_count = sum(1 for p in posts if p["category"] == "library")
    print(f"  → {lab_count} lab posts, {library_count} library posts")
    
    # Generate individual post HTML files
    for i, post in enumerate(posts):
        prev_post = posts[i + 1] if i + 1 < len(posts) else None
        next_post = posts[i - 1] if i > 0 else None
        
        html = generate_post_html(post, prev_post, next_post)
        
        output_path = BLOG_DIR / post["filename"]
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        
        print(f"  ✓ Generated {post['filename']}")
    
    # Generate blog index page (all posts)
    blog_index_html = generate_blog_index(posts)
    with open(BLOG_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(blog_index_html)
    print("✓ Generated blog/index.html")
    
    # Generate lab index page
    lab_index_html = generate_lab_index(posts)
    with open(LAB_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(lab_index_html)
    print("✓ Generated lab/index.html")
    
    # Update main index.html
    update_index_html(posts)
    
    # Update reading section from reading.json
    update_reading_section()
    
    # Generate RSS feed
    generate_rss_feed(posts)
    
    print(f"\n✅ Build complete!")
    print(f"   {len(posts)} posts generated ({lab_count} lab, {library_count} library)")
    print(f"   Blog archive: /blog/")
    print(f"   Lab index: /lab/")
    print(f"   RSS feed: /feed.xml")


if __name__ == "__main__":
    main()
