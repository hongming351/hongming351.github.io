'use strict';

hexo.extend.filter.register('after_render:html', function (html, locals) {
  const page = locals && locals.page;
  if (!page || page.layout !== 'post' || !page.source) return html;

  const source = 'source/' + String(page.source).replace(/\\/g, '/');
  const root = hexo.config.root || '/';
  const editUrl = `${root}admin/?edit=${encodeURIComponent(source)}`;
  const block = `<p class="post-edit-link" style="margin:2rem 0 0;padding-top:1rem;border-top:1px dashed #ddd;text-align:right;font-size:0.9em;"><a href="${editUrl}">在线编辑此页</a></p>`;

  return html.replace('</article>', `${block}</article>`);
});
