'use strict';

hexo.extend.filter.register('theme_inject', function (injects) {
  injects.postMarkdownEnd.raw('edit-link', `
<p class="post-edit-link">
  <a href="<%= config.root %>admin/?edit=<%= encodeURIComponent('source/' + page.source) %>">在线编辑此页</a>
</p>
`, {}, 100);
});
