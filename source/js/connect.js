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

    var popover = document.createElement('div');
    popover.className = 'connect-popover hidden';
    popover.innerHTML = [
      '<div class="connect-popover-title">连接 GitHub</div>',
      '<p>粘贴只允许写入本仓库的 Token。Repository access 只选 hongming351.github.io，Contents 设为 Read and write。</p>',
      '<input id="connect-token" type="password" placeholder="github_pat_..." autocomplete="off">',
      '<div class="connect-actions">',
      '  <button id="connect-submit" class="connect-primary" type="button">连接</button>',
      '  <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">创建 Token</a>',
      '</div>',
      '<div id="connect-status" class="connect-status"></div>'
    ].join('');
    document.body.appendChild(popover);

    var label = button.querySelector('.connect-label');
    var input = popover.querySelector('#connect-token');
    var submit = popover.querySelector('#connect-submit');
    var status = popover.querySelector('#connect-status');

    function setStatus(text, ok) {
      status.textContent = text || '';
      status.className = 'connect-status' + (ok ? ' ok' : '');
    }

    function setConnected(connected) {
      button.classList.toggle('is-connected', connected);
      label.textContent = connected ? '已连接' : '连接';
      button.title = connected ? '点击进入写日记' : '连接 GitHub';
    }

    function openPopover() {
      setStatus('');
      popover.classList.remove('hidden');
      window.setTimeout(function () { input.focus(); }, 0);
    }

    function closePopover() {
      popover.classList.add('hidden');
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
        window.setTimeout(closePopover, 700);
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
      openPopover();
    });

    submit.addEventListener('click', submitToken);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') submitToken();
    });

    document.addEventListener('click', function (event) {
      if (popover.classList.contains('hidden')) return;
      if (popover.contains(event.target) || button.contains(event.target)) return;
      closePopover();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closePopover();
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
