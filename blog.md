
---
layout: default
title: 部落格
---

# 部落格

{% for post in site.posts %}
  <div class="post-preview">
    <a href="{{ post.url }}">
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
    </a>
  </div>
{% endfor %}
