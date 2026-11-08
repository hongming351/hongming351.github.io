'use strict';

hexo.extend.filter.register('theme_inject', function (injects) {
  injects.head.raw(
    'custom-assets',
    '<link rel="stylesheet" href="/css/custom.css?v=<%= Date.now() %>">',
    {},
    100
  );
  injects.bodyEnd.raw(
    'custom-connect',
    '<script src="/js/connect.js?v=<%= Date.now() %>"></script>',
    {},
    100
  );
});
