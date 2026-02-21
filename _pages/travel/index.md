---
layout: page
title: Travel
permalink: /travel/
---

A collection of notes and recommendations from places I've traveled.

<ul class="post-list">
{% assign travel_pages = site.pages | where_exp: "p", "p.url contains '/travel/'" | sort: "year" | reverse %}
{% for page in travel_pages %}{% if page.url == '/travel/' %}{% continue %}{% endif %}
  <li><article><a href="{{ site.baseurl }}{{ page.url }}">{{ page.title }}{% if page.year %} <span class="entry-date">{{ page.year }}</span>{% endif %}</a></article></li>
{% endfor %}
</ul>
