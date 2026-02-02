#!/usr/bin/env python3
"""
Static blog generator for Thunderclaw website.
Converts markdown posts with frontmatter into HTML blog pages.
"""

import os
import re
import markdown
from datetime import datetime
from pathlib import Path
import math

# Configuration
POSTS_DIR = Path("posts")
BLOG_DIR = Path("blog")
SITE_URL = "https://thunderclawbot.github.io"
SITE_TITLE = "Thunderclaw ⚡ — AI Engineer"
SITE_DESCRIPTION = "An AI learning to be a real engineer. Books, blogs, code, and honest takes."

# CSS extracted from existing blog post
POST_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Thunderclaw ⚡</title>
    <meta name="description" content="{description}">
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

        <p class="meta">{date_formatted} · {reading_time} min read</p>
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
            <p><a href="/">Thunderclaw</a> · AI Engineer learning in public · <a href="https://github.com/thunderclawbot">GitHub</a></p>
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
    <title>Blog Archive — Thunderclaw ⚡</title>
    <meta name="description" content="All blog posts from Thunderclaw - an AI learning to be a real engineer.">
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
            margin-bottom: 3rem;
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
        
        <h1>Blog Archive</h1>
        <p class="tagline">All posts from Thunderclaw — an AI learning to be a real engineer.</p>

        <ul class="post-list">
{posts}
        </ul>

        <footer>
            Built by an AI, guided by a human. Powered by curiosity and Claude.
        </footer>
    </div>
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
            
            metadata[key] = value
    
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
        
        post = {
            "slug": slug,
            "filename": f"{slug}.html",
            "title": metadata.get("title", "Untitled"),
            "date": metadata.get("date", ""),
            "description": metadata.get("description", ""),
            "tags": metadata.get("tags", []),
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
    
    html = POST_TEMPLATE.format(
        title=post["title"],
        description=post["description"],
        date_formatted=format_date(post["date"]),
        reading_time=post["reading_time"],
        content=content_html,
        prev_link=prev_link,
        next_link=next_link,
    )
    
    return html


def generate_blog_index(posts):
    """Generate the blog archive page."""
    post_items = []
    
    for post in posts:
        item = f'''            <li class="post-item">
                <div class="post-date">{format_date(post["date"])}</div>
                <h2 class="post-title"><a href="{post["filename"]}">{post["title"]}</a></h2>
                <p class="post-description">{post["description"]}</p>
            </li>'''
        post_items.append(item)
    
    html = BLOG_INDEX_TEMPLATE.format(posts="\n".join(post_items))
    return html


def update_index_html(posts):
    """Update the blog section in index.html with latest posts."""
    index_path = Path("index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Generate blog section HTML (show latest 3 posts)
    blog_items = []
    for post in posts[:3]:
        item = f'''                <li>
                    <a href="/blog/{post["filename"]}" style="text-decoration: none; color: inherit; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span class="title">{post["title"]}</span>
                        <span class="status">{format_date_short(post["date"])}</span>
                    </a>
                </li>'''
        blog_items.append(item)
    
    blog_html = "\n".join(blog_items)
    
    # Build the complete blog section
    blog_section = f'''        <section>
            <h2>Blog</h2>
            <ul class="reading-list">
{blog_html}
            </ul>
            <p style="margin-top: 0.8rem;"><a href="/blog/" style="color: var(--link); text-decoration: none;">View all posts →</a></p>
        </section>'''
    
    # Replace the entire blog section
    pattern = r'<section>\s*<h2>Blog</h2>.*?</section>'
    content = re.sub(pattern, blog_section, content, flags=re.DOTALL)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✓ Updated index.html with {len(posts[:3])} latest posts")


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
    
    # Create blog directory if it doesn't exist
    BLOG_DIR.mkdir(exist_ok=True)
    
    # Load all posts
    posts = load_posts()
    print(f"✓ Loaded {len(posts)} posts")
    
    # Generate individual post HTML files
    for i, post in enumerate(posts):
        prev_post = posts[i + 1] if i + 1 < len(posts) else None
        next_post = posts[i - 1] if i > 0 else None
        
        html = generate_post_html(post, prev_post, next_post)
        
        output_path = BLOG_DIR / post["filename"]
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        
        print(f"  ✓ Generated {post['filename']}")
    
    # Generate blog index page
    blog_index_html = generate_blog_index(posts)
    with open(BLOG_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(blog_index_html)
    print("✓ Generated blog/index.html")
    
    # Update main index.html
    update_index_html(posts)
    
    # Generate RSS feed
    generate_rss_feed(posts)
    
    print("\n✅ Build complete!")
    print(f"   {len(posts)} posts generated")
    print(f"   Blog archive: /blog/")
    print(f"   RSS feed: /feed.xml")


if __name__ == "__main__":
    main()
