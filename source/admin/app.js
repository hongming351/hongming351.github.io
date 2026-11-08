'use strict';

(function () {
  var REPO = 'hongming351/hongming351.github.io';
  var BRANCH = 'master';
  var POSTS_PREFIX = 'source/_posts/';
  var IMAGES_PREFIX = 'source/images/';
  var TOKEN_KEY = 'hongming351.blog.admin.token';
  var DATE_PATTERN = /^.?(\d{4})[-_]?(\d{2})[-_]?(\d{2}).?[-_.@# ]*(.*)$/;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    tokenInput: $('tokenInput'),
    tokenSave: $('tokenSave'),
    tokenClear: $('tokenClear'),
    loginHint: $('loginHint'),
    loginStatus: $('loginStatus'),
    workspace: $('workspace'),
    connectionState: $('connectionState'),
    themeToggle: $('themeToggle'),
    postCount: $('postCount'),
    newPost: $('newPost'),
    search: $('search'),
    list: $('list'),
    docTitle: $('docTitle'),
    currentPath: $('currentPath'),
    editor: $('editor'),
    status: $('status'),
    savedState: $('savedState'),
    wordCount: $('wordCount'),
    infoCategory: $('infoCategory'),
    infoDate: $('infoDate'),
    infoWords: $('infoWords'),
    outline: $('outline'),
    toggleLibrary: $('toggleLibrary'),
    drawerBackdrop: $('drawerBackdrop'),
    save: $('save'),
    remove: $('remove'),
    uploadImage: $('uploadImage'),
    imageInput: $('imageInput'),
    newDialog: $('newDialog'),
    newForm: $('newForm'),
    newTitle: $('newTitle'),
    newDate: $('newDate'),
    newCategory: $('newCategory'),
    newTags: $('newTags'),
    cancelNew: $('cancelNew')
  };

  var token = localStorage.getItem(TOKEN_KEY) || '';
  var files = [];
  var current = null;
  var dirty = false;
  var pendingPath = new URLSearchParams(location.search).get('edit');

  function encPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function bytesToB64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function textToB64(text) {
    return bytesToB64(new TextEncoder().encode(text));
  }

  function b64ToText(value) {
    var binary = atob(value.replace(/\s/g, ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function api(path, options) {
    options = options || {};
    var headers = { Accept: 'application/vnd.github+json' };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;

    return fetch('https://api.github.com/repos/' + REPO + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body
    }).then(function (response) {
      if (response.status === 401) {
        throw new Error('Token 无效或已过期，请重新连接');
      }
      if (response.status === 403) {
        throw new Error('Token 权限不足或触发限流，请确认 Contents 权限为 Read and write');
      }
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          var message = '请求失败（' + response.status + '）';
          if (data && data.message) message += '：' + data.message;
          throw new Error(message);
        });
      }
      if (response.status === 204) return null;
      return response.json();
    });
  }

  function setStatus(text, kind) {
    els.status.textContent = text || '';
    els.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  function setSavedState(text, kind) {
    els.savedState.textContent = text || '';
    els.savedState.className = 'saved-state' + (kind ? ' ' + kind : '');
  }

  function setLoginStatus(text, kind) {
    els.loginStatus.textContent = text || '';
    els.loginStatus.className = 'login-status' + (kind ? ' ' + kind : '');
  }

  function setConnected(connected) {
    els.loginHint.classList.toggle('hidden', connected);
    els.workspace.classList.toggle('hidden', !connected);
    els.tokenClear.classList.toggle('hidden', !connected);
    els.connectionState.classList.toggle('hidden', !connected);
    els.tokenInput.value = '';
    els.tokenInput.placeholder = '粘贴 GitHub Token';
  }

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function closeDrawer() {
    els.workspace.classList.remove('library-open');
    els.drawerBackdrop.classList.remove('show');
  }

  function togglePanel() {
    if (isMobile()) {
      var open = els.workspace.classList.toggle('library-open');
      els.drawerBackdrop.classList.toggle('show', open);
    } else {
      els.workspace.classList.toggle('focus-mode');
    }
  }

  function parsePost(path) {
    var relative = path.slice(POSTS_PREFIX.length).replace(/\.md$/i, '');
    var parts = relative.split('/');
    var filename = parts.pop() || '';
    var category = parts.join(' / ');
    var match = filename.match(DATE_PATTERN);
    var date = '';
    var title = filename;

    if (match) {
      date = match[1] + '-' + match[2] + '-' + match[3];
      title = match[4] || date;
    }

    return {
      path: path,
      filename: filename,
      category: category,
      date: date,
      title: title
    };
  }

  function readFrontMatter(text) {
    var match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    var data = {};
    match[1].split(/\r?\n/).forEach(function (line) {
      var pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!pair) return;
      var value = pair[2].trim();
      if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"')
        || (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) {
        value = value.slice(1, -1);
      }
      data[pair[1]] = value;
    });
    return data;
  }

  function countCharacters(text) {
    var body = text.replace(/^---[\s\S]*?---\s*/, '');
    return body.replace(/\s/g, '').length;
  }

  function updateStats() {
    var text = els.editor.value;
    var count = countCharacters(text);
    els.wordCount.textContent = count + ' 字';
    els.infoWords.textContent = String(count);
    renderOutline();

    if (!current) return;
    var frontMatter = readFrontMatter(text);
    els.docTitle.textContent = frontMatter.title || current.info.title || '未命名日记';
    els.infoCategory.textContent = current.info.category || '未分类';
    els.infoDate.textContent = current.info.date
      || (frontMatter.date ? String(frontMatter.date).slice(0, 10) : '未设置');
  }

  function renderOutline() {
    var lines = els.editor.value.split(/\r?\n/);
    var headings = [];
    var inFrontMatter = false;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      if (i === 0 && line.trim() === '---') {
        inFrontMatter = true;
        continue;
      }
      if (inFrontMatter) {
        if (line.trim() === '---') inFrontMatter = false;
        continue;
      }
      var match = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
      if (match) {
        headings.push({ level: match[1].length, text: match[2], line: i });
      }
    }

    els.outline.textContent = '';

    if (!headings.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = '正文里添加 # 标题后显示';
      els.outline.appendChild(empty);
      return;
    }

    headings.forEach(function (heading) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline-item level-' + heading.level;
      button.textContent = heading.text;
      button.title = heading.text;
      button.addEventListener('click', function () { jumpToLine(heading.line); });
      els.outline.appendChild(button);
    });
  }

  function jumpToLine(lineIndex) {
    var editor = els.editor;
    var lines = editor.value.split(/\r?\n/);
    var offset = 0;
    for (var i = 0; i < lineIndex && i < lines.length; i += 1) {
      offset += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(offset, offset + (lines[lineIndex] || '').length);
    editor.scrollTop = (lineIndex / Math.max(1, lines.length - 1)) * editor.scrollHeight;
    closeDrawer();
  }

  function labelFor(path) {
    return path.slice(POSTS_PREFIX.length).replace(/\.md$/i, '');
  }

  function renderList() {
    var keyword = els.search.value.trim().toLowerCase();
    els.list.textContent = '';
    els.postCount.textContent = files.length + ' 篇';

    var items = files.filter(function (file) {
      var info = parsePost(file.path);
      return !keyword
        || info.title.toLowerCase().indexOf(keyword) >= 0
        || info.category.toLowerCase().indexOf(keyword) >= 0;
    });

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = keyword ? '没有匹配的日记' : '还没有日记';
      els.list.appendChild(empty);
      return;
    }

    items.forEach(function (file) {
      var info = parsePost(file.path);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'item' + (current && current.path === file.path ? ' active' : '');
      button.title = file.path;

      if (info.date) {
        var date = document.createElement('span');
        date.className = 'item-date';
        date.textContent = info.date;
        button.appendChild(date);
      }

      var title = document.createElement('span');
      title.className = 'item-title';
      title.textContent = info.title;
      button.appendChild(title);

      if (info.category) {
        var category = document.createElement('span');
        category.className = 'item-cat';
        category.textContent = info.category;
        button.appendChild(category);
      }

      button.addEventListener('click', function () { openFile(file.path); });
      els.list.appendChild(button);
    });
  }

  function loadFiles() {
    return api('/git/trees/' + encodeURIComponent(BRANCH) + '?recursive=1').then(function (data) {
      files = (data.tree || []).filter(function (item) {
        return item.type === 'blob'
          && item.path.indexOf(POSTS_PREFIX) === 0
          && /\.md$/i.test(item.path);
      }).map(function (item) {
        return { path: item.path, sha: item.sha };
      }).sort(function (a, b) {
        var dateA = parsePost(a.path).date;
        var dateB = parsePost(b.path).date;
        if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA);
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return a.path.localeCompare(b.path, 'zh-Hans-CN');
      });

      if (data.truncated) {
        setStatus('仓库文件较多，列表可能不完整', 'error');
      }
      renderList();
    });
  }

  function openFile(path) {
    if (dirty && !confirm('当前内容还没保存，确定离开吗？')) return Promise.resolve();

    setStatus('读取中...');
    return api('/contents/' + encPath(path) + '?ref=' + encodeURIComponent(BRANCH)).then(function (data) {
      var text = b64ToText(data.content);
      var frontMatter = readFrontMatter(text);

      current = { path: path, sha: data.sha, info: parsePost(path) };
      els.editor.value = text;
      els.currentPath.textContent = path;
      els.docTitle.textContent = frontMatter.title || current.info.title || '未命名日记';
      dirty = false;
      updateStats();
      setSavedState('已保存', 'ok');
      setStatus('已加载');
      history.replaceState(null, '', '?edit=' + encodeURIComponent(path));
      renderList();
      closeDrawer();
    }).catch(function (error) {
      setStatus(error.message, 'error');
      setSavedState('读取失败', 'error');
    });
  }

  function connect(value) {
    token = value.trim();
    if (!token) {
      setLoginStatus('请先粘贴 Token');
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);
    setLoginStatus('连接中...');

    loadFiles().then(function () {
      setConnected(true);
      setStatus('已连接，共 ' + files.length + ' 篇日记', 'ok');

      if (pendingPath) {
        var path = pendingPath;
        pendingPath = null;
        openFile(path);
      } else if (!current && files.length) {
        openFile(files[0].path);
      }
    }).catch(function (error) {
      localStorage.removeItem(TOKEN_KEY);
      token = '';
      setConnected(false);
      setLoginStatus(error.message);
    });
  }

  function save() {
    if (!current) {
      setStatus('请先选择或新建一篇日记', 'error');
      return;
    }

    setStatus('保存中...');
    setSavedState('保存中...', '');

    api('/contents/' + encPath(current.path), {
      method: 'PUT',
      body: JSON.stringify({
        message: '更新日记: ' + labelFor(current.path),
        content: textToB64(els.editor.value),
        sha: current.sha,
        branch: BRANCH
      })
    }).then(function (result) {
      current.sha = result.content.sha;
      dirty = false;
      setStatus('已保存，GitHub Actions 正在自动发布（约 1 分钟）', 'ok');
      setSavedState('已保存', 'ok');
      return loadFiles();
    }).catch(function (error) {
      setStatus(error.message, 'error');
      setSavedState('保存失败', 'error');
    });
  }

  function resetDoc() {
    current = null;
    dirty = false;
    els.editor.value = '';
    els.docTitle.textContent = '未选择日记';
    els.currentPath.textContent = '从左侧选择一篇日记，或新建一篇';
    els.infoCategory.textContent = '—';
    els.infoDate.textContent = '—';
    els.infoWords.textContent = '0';
    els.wordCount.textContent = '0 字';
    els.outline.textContent = '';
    var empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = '打开日记后显示';
    els.outline.appendChild(empty);
    setSavedState('未选择', '');
    history.replaceState(null, '', location.pathname);
  }

  function removePost() {
    if (!current) return;
    if (!confirm('确定删除「' + (current.info.title || labelFor(current.path)) + '」？删除也会提交到仓库。')) return;

    setStatus('删除中...');
    api('/contents/' + encPath(current.path), {
      method: 'DELETE',
      body: JSON.stringify({
        message: '删除日记: ' + labelFor(current.path),
        sha: current.sha,
        branch: BRANCH
      })
    }).then(function () {
      resetDoc();
      return loadFiles();
    }).then(function () {
      setStatus('已删除', 'ok');
    }).catch(function (error) {
      setStatus(error.message, 'error');
      setSavedState('删除失败', 'error');
    });
  }

  function sanitizeName(name) {
    return name.trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '');
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function createPost(event) {
    event.preventDefault();
    if (!token) return;

    var title = els.newTitle.value.trim();
    var date = els.newDate.value;
    if (!title || !date) return;

    var category = els.newCategory.value.split('/').map(function (part) {
      return sanitizeName(part);
    }).filter(Boolean).join('/');

    var tags = els.newTags.value.split(/[,，]/).map(function (tag) {
      return tag.trim();
    }).filter(Boolean);

    var filename = date + '-' + sanitizeName(title) + '.md';
    var path = POSTS_PREFIX + (category ? category + '/' : '') + filename;

    if (files.some(function (file) { return file.path === path; })) {
      setStatus('同名日记已存在：' + path, 'error');
      return;
    }

    var now = new Date();
    var content = [
      '---',
      'title: ' + JSON.stringify(title),
      'date: ' + date + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()),
      'tags: ' + JSON.stringify(tags),
      '---',
      '',
      ''
    ].join('\n');

    setStatus('创建中...');
    api('/contents/' + encPath(path), {
      method: 'PUT',
      body: JSON.stringify({
        message: '新建日记: ' + filename,
        content: textToB64(content),
        branch: BRANCH
      })
    }).then(function () {
      els.newDialog.close();
      els.newForm.reset();
      dirty = false;
      return loadFiles().then(function () {
        return openFile(path);
      });
    }).then(function () {
      els.editor.focus();
      setStatus('已创建，直接写正文即可', 'ok');
    }).catch(function (error) {
      setStatus(error.message, 'error');
      setSavedState('创建失败', 'error');
    });
  }

  function insertText(before, after, placeholder) {
    var editor = els.editor;
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var selected = editor.value.slice(start, end) || placeholder || '';
    editor.setRangeText(before + selected + (after || ''), start, end, 'end');
    dirty = true;
    updateStats();
    setSavedState('未保存', 'dirty');
    editor.focus();
  }

  function uploadImage(file) {
    if (!current) {
      setStatus('请先打开一篇日记，再插入图片', 'error');
      return;
    }

    setStatus('上传图片中...');
    file.arrayBuffer().then(function (buffer) {
      var safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
      var path = IMAGES_PREFIX + Date.now() + '-' + safeName;

      return api('/contents/' + encPath(path), {
        method: 'PUT',
        body: JSON.stringify({
          message: '上传图片: ' + safeName,
          content: bytesToB64(new Uint8Array(buffer)),
          branch: BRANCH
        })
      }).then(function () {
        var alt = file.name.replace(/\.[^.]+$/, '');
        var url = '/' + path.replace(/^source\//, '');
        insertText('![' + alt + '](' + url + ')', '', '');
        setStatus('图片已上传并插入正文', 'ok');
      });
    }).catch(function (error) {
      setStatus(error.message, 'error');
    });
  }

  els.tokenSave.addEventListener('click', function () { connect(els.tokenInput.value); });
  els.tokenInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') connect(els.tokenInput.value);
  });
  els.tokenClear.addEventListener('click', function () {
    localStorage.removeItem(TOKEN_KEY);
    token = '';
    files = [];
    els.list.textContent = '';
    resetDoc();
    setConnected(false);
    setLoginStatus('已退出，Token 已从浏览器清除', 'ok');
  });

  els.search.addEventListener('input', renderList);
  els.newPost.addEventListener('click', function () {
    if (!els.newDate.value) {
      var today = new Date();
      els.newDate.value = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    }
    els.newDialog.showModal();
    els.newTitle.focus();
  });
  els.cancelNew.addEventListener('click', function () { els.newDialog.close(); });
  els.newForm.addEventListener('submit', createPost);
  els.save.addEventListener('click', save);
  els.remove.addEventListener('click', removePost);
  els.uploadImage.addEventListener('click', function () { els.imageInput.click(); });
  els.imageInput.addEventListener('change', function () {
    var file = els.imageInput.files && els.imageInput.files[0];
    els.imageInput.value = '';
    if (file) uploadImage(file);
  });

  els.toggleLibrary.addEventListener('click', togglePanel);
  els.drawerBackdrop.addEventListener('click', closeDrawer);
  window.addEventListener('resize', function () {
    if (!isMobile()) closeDrawer();
  });

  document.querySelectorAll('[data-before]').forEach(function (button) {
    button.addEventListener('click', function () {
      insertText(button.dataset.before, button.dataset.after, button.dataset.placeholder);
    });
  });

  els.themeToggle.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('Fluid_Color_Scheme', next);
    } catch (e) {}
  });

  els.editor.addEventListener('input', function () {
    dirty = true;
    updateStats();
    setSavedState('未保存', 'dirty');
  });
  els.editor.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  });
  window.addEventListener('beforeunload', function (event) {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  var today = new Date();
  els.newDate.value = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());

  if (token) {
    connect(token);
  } else {
    setConnected(false);
  }
})();
