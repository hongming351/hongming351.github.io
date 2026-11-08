'use strict';

hexo.extend.helper.register('side_recent_posts', function (current) {
  return hexo.locals.get('posts')
    .sort('date', -1)
    .toArray()
    .filter(function (post) { return post.path !== current.path; })
    .slice(0, 5);
});

hexo.extend.helper.register('side_stats', function (post) {
  const text = String(post.content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s/g, '');
  const chars = text.length;

  return {
    chars: chars >= 1000 ? (chars / 1000).toFixed(1) + 'k' : String(chars),
    minutes: Math.max(1, Math.ceil(chars / 120))
  };
});

hexo.extend.filter.register('theme_inject', function (injects) {
  injects.postLeft.raw('post-left', `
<%
  var stats = side_stats(page);
  var categories = page.categories ? page.categories.toArray() : [];
  var tags = page.tags ? page.tags.toArray() : [];
  var recent = side_recent_posts(page);
  var editUrl = '/admin/?edit=' + encodeURIComponent('source/' + page.source);
%>
<aside class="sidebar post-side" style="margin-right: -1rem">
  <section class="side-card side-author-card">
    <div class="side-author">
      <div class="side-author-text">
        <div class="side-name"><%= config.author %></div>
        <div class="side-bio"><%= config.subtitle || '记录生活与学习' %></div>
      </div>
    </div>
    <div class="side-links">
      <a href="/">首页</a>
      <a href="/archives/">归档</a>
      <a href="/admin/">写日记</a>
      <a href="https://github.com/hongming351" target="_blank" rel="noopener">GitHub</a>
    </div>
  </section>

  <section class="side-card">
    <div class="side-title">本文信息</div>
    <ul class="side-meta">
      <li><span>日期</span><strong><%= date(page.date, 'YYYY-MM-DD') %></strong></li>
      <li><span>分类</span><strong>
        <% if (categories.length) { %>
          <% categories.forEach(function (cat, index) { %>
            <a href="<%- url_for(cat.path) %>"><%= cat.name %></a><% if (index < categories.length - 1) { %>、<% } %>
          <% }); %>
        <% } else { %>未分类<% } %>
      </strong></li>
      <li><span>字数</span><strong><%= stats.chars %></strong></li>
      <li><span>阅读</span><strong><%= stats.minutes %> 分钟</strong></li>
    </ul>
    <% if (tags.length) { %>
      <div class="side-tags">
        <% tags.slice(0, 8).forEach(function (tag) { %>
          <a href="<%- url_for(tag.path) %>">#<%= tag.name %></a>
        <% }); %>
      </div>
    <% } %>
    <a class="side-edit" href="<%= editUrl %>">编辑本文 →</a>
  </section>

  <section class="side-card side-quote">
    <div class="side-title">今日一句</div>
    <p>把今天写下来，明天就有迹可循。</p>
    <a class="side-edit" href="/admin/">去写日记 →</a>
  </section>

  <% if (recent.length) { %>
  <section class="side-card">
    <div class="side-title">最近日记</div>
    <ul class="side-recent">
      <% recent.forEach(function (post) { %>
        <li>
          <a href="<%- url_for(post.path) %>"><%= post.title %></a>
          <time><%= date(post.date, 'MM-DD') %></time>
        </li>
      <% }); %>
    </ul>
  </section>
  <% } %>
</aside>
`, {}, 100);
});
