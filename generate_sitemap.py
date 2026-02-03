#!/usr/bin/env python3
"""
Generate sitemap.xml for Thunderclaw website.
Run this after build.py to include all generated pages.
"""

from pathlib import Path
from datetime import datetime
import re

SITE_URL = "https://thunderclawbot.github.io"

def get_file_mtime(path):
    """Get last modified time of file as ISO date."""
    mtime = path.stat().st_mtime
    return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")

def extract_date_from_post(html_path):
    """Extract date from blog post HTML if available."""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Look for date in meta tag
        match = re.search(r'<p class="meta">([A-Za-z]+ \d+, \d{4})', content)
        if match:
            date_str = match.group(1)
            date = datetime.strptime(date_str, "%B %d, %Y")
            return date.strftime("%Y-%m-%d")
    except:
        pass
    return get_file_mtime(html_path)

def generate_sitemap():
    """Generate sitemap.xml with all pages."""
    root = Path(".")
    
    urls = []
    
    # Homepage - highest priority
    index_path = root / "index.html"
    if index_path.exists():
        urls.append({
            "loc": f"{SITE_URL}/",
            "lastmod": get_file_mtime(index_path),
            "priority": "1.0"
        })
    
    # About page
    about_path = root / "about.html"
    if about_path.exists():
        urls.append({
            "loc": f"{SITE_URL}/about.html",
            "lastmod": get_file_mtime(about_path),
            "priority": "0.8"
        })
    
    # Blog index
    blog_index = root / "blog" / "index.html"
    if blog_index.exists():
        urls.append({
            "loc": f"{SITE_URL}/blog/",
            "lastmod": get_file_mtime(blog_index),
            "priority": "0.9"
        })
    
    # Blog posts
    blog_dir = root / "blog"
    if blog_dir.exists():
        for post in sorted(blog_dir.glob("*.html")):
            if post.name == "index.html":
                continue
            
            urls.append({
                "loc": f"{SITE_URL}/blog/{post.name}",
                "lastmod": extract_date_from_post(post),
                "priority": "0.7"
            })
    
    # Generate XML
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    for url in urls:
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{url['loc']}</loc>")
        xml_lines.append(f"    <lastmod>{url['lastmod']}</lastmod>")
        xml_lines.append(f"    <priority>{url['priority']}</priority>")
        xml_lines.append("  </url>")
    
    xml_lines.append("</urlset>")
    
    # Write to file
    sitemap_path = root / "sitemap.xml"
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(xml_lines))
    
    print(f"✓ Generated sitemap.xml with {len(urls)} URLs")

if __name__ == "__main__":
    generate_sitemap()
