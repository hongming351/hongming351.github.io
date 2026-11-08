(function () {
  var TOKEN_KEY = 'hongming351.blog.admin.token';
  var REPO = 'hongming351/hongming351.github.io';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function saveToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {}
  }

  function removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function init() {
    var nav = document.querySelector('#navbar .navbar-nav');
    if (!nav) return;

    var li = document.createElement('li');
    li.className = 'nav-item connect-nav';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'connect-btn';
    button.innerHTML = '<span class="connect-dot"></span><span class="connect-label">连接</span>';
    li.appendChild(button);
    nav.appendChild(li);

    var dialog = document.createElement('dialog');
    dialog.className = 'connect-dialog';
    dialog.innerHTML = [
      '<div class="connect-dialog-head">',
      '  <div>',
      '    <div class="connect-dialog-title">连接 GitHub</div>',
      '    <p>粘贴只允许写入本仓库的 Token，连接后点「编辑」不再需要登录。</p>',
      '  </div>',
      '  <button type="button" class="connect-close" aria-label="关闭">×</button>',
      '</div>',
      '<label class="connect-field">Token',
      '  <input id="connect-token" type="password" placeholder="github_pat_..." autocomplete="off">',
      '</label>',
      '<p class="connect-tip">Repository access 只选 hongming351.github.io，Contents 设为 Read and write。</p>',
      '<div class="connect-dialog-actions">',
      '  <button id="connect-submit" class="connect-primary" type="button">连接</button>',
      '  <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">创建 Token</a>',
      '</div>',
      '<div id="connect-status" class="connect-status"></div>'
    ].join('');
    document.body.appendChild(dialog);

    var label = button.querySelector('.connect-label');
    var input = dialog.querySelector('#connect-token');
    var submit = dialog.querySelector('#connect-submit');
    var status = dialog.querySelector('#connect-status');
    var close = dialog.querySelector('.connect-close');

    function setStatus(text, ok) {
      status.textContent = text || '';
      status.className = 'connect-status' + (ok ? ' ok' : '');
    }

    function setConnected(connected) {
      button.classList.toggle('is-connected', connected);
      label.textContent = connected ? '已连接' : '连接';
      button.title = connected ? '点击进入写日记' : '连接 GitHub';
    }

    function openDialog() {
      setStatus('');
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      window.setTimeout(function () { input.focus(); }, 0);
    }

    function closeDialog() {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    function validate(token) {
      return fetch('https://api.github.com/repos/' + REPO, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + token
        }
      }).then(function (response) {
        if (response.status === 401) {
          throw new Error('Token 无效或已过期');
        }
        if (response.status === 403) {
          throw new Error('Token 权限不足或触发限流');
        }
        if (!response.ok) {
          throw new Error('连接失败（' + response.status + '）');
        }
        return response.json();
      });
    }

    function submitToken() {
      var token = input.value.trim();
      if (!token) {
        setStatus('请粘贴 Token');
        return;
      }

      submit.disabled = true;
      setStatus('连接中...');

      validate(token).then(function () {
        saveToken(token);
        setConnected(true);
        setStatus('连接成功', true);
        window.setTimeout(closeDialog, 700);
        input.value = '';
      }).catch(function (error) {
        setStatus(error.message || '网络连接失败');
      }).then(function () {
        submit.disabled = false;
      });
    }

    button.addEventListener('click', function () {
      if (button.classList.contains('is-connected')) {
        window.location.href = '/admin/';
        return;
      }
      openDialog();
    });

    submit.addEventListener('click', submitToken);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') submitToken();
    });
    close.addEventListener('click', closeDialog);

    dialog.addEventListener('close', function () {
      input.value = '';
      setStatus('');
    });

    window.addEventListener('storage', function (event) {
      if (event.key === TOKEN_KEY) setConnected(!!event.newValue);
    });

    var token = getToken();
    if (!token) {
      setConnected(false);
      return;
    }

    setConnected(true);
    validate(token).then(function () {
      setConnected(true);
    }).catch(function (error) {
      if (error.message.indexOf('无效') >= 0) {
        removeToken();
        setConnected(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
