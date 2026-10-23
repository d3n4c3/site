/* text/javascript */
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var input = document.querySelector("#site-search");
  var cards = document.querySelectorAll("[data-search]");
  function apply(q) {
    q = (q || "").trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var hay = (card.getAttribute("data-search") || "").toLowerCase();
      var match = !q || hay.indexOf(q) !== -1;
      card.hidden = !match;
      if (match) shown += 1;
    });
    var empty = document.querySelector("#search-empty");
    if (empty) empty.hidden = shown !== 0;
  }
  if (input && cards.length) {
    var params = new URLSearchParams(location.search);
    if (params.get("q")) input.value = params.get("q");
    input.addEventListener("input", function () { apply(input.value); });
    apply(input.value);
  }

  var post = new URLSearchParams(location.search).get("post");
  var root = document.querySelector("#legacy-root");
  if (!post || !root) return;
  if (!/^[A-Za-z0-9._-]+$/.test(post)) {
    root.hidden = false;
    root.innerHTML = "<p>That issue isn’t on this shelf.</p>";
    return;
  }
  var home = document.querySelector("#home-feed");
  if (home) home.hidden = true;
  root.hidden = false;
  root.innerHTML = "<p>Opening the issue…</p>";
  fetch("/blogs/" + post)
    .then(function (res) {
      if (!res.ok) throw new Error("missing");
      return res.text();
    })
    .then(function (md) {
      var title = (md.match(/^#\s+(.+)$/m) || [null, post])[1];
      root.innerHTML =
        '<article class="post-article"><header><p class="caption"><a href="/category/projects">Projects</a><span>Archive</span></p><h1>' +
        escapeHtml(title) +
        '</h1></header><div class="post-body post-content">' +
        markdownToHtml(md) +
        '</div><p class="post-actions"><a class="btn btn-ghost" href="/">← All issues</a></p></article>';
    })
    .catch(function () {
      root.innerHTML = "<p>Couldn’t load that issue. Try the archive from the home page.</p>";
    });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function imgPath(src) {
    src = src.replace(/^\.\//, "");
    if (src.indexOf("94flair/cards/") === 0) {
      return "/blogs/" + src;
    }
    if (/^(https?:|\/)/.test(src)) return src;
    return "/blogs/" + src;
  }

  function inline(text) {
    var s = escapeHtml(text);
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      return '<img alt="' + alt + '" src="' + imgPath(src.replace(/&amp;/g, "&")) + '" loading="lazy">';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      return '<a href="' + href + '">' + label + "</a>";
    });
    return s;
  }

  function markdownToHtml(md) {
    var lines = md.split(/\r?\n/);
    var html = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^# /.test(line)) { i += 1; continue; }
      if (/^## /.test(line)) {
        html.push("<h2>" + inline(line.slice(3).trim()) + "</h2>");
        i += 1;
        continue;
      }
      if (/^### /.test(line)) {
        html.push("<h3>" + inline(line.slice(4).trim()) + "</h3>");
        i += 1;
        continue;
      }
      if (!line.trim()) { i += 1; continue; }
      if (line.trim().charAt(0) === "<") {
        var chunk = [];
        while (i < lines.length && lines[i].trim() && !/^#{1,3} /.test(lines[i])) {
          chunk.push(lines[i].replace(/(src|href)="(?!https?:|\/)([^"]+)"/g, function (_, attr, src) {
            return attr + '="' + imgPath(src) + '"';
          }));
          i += 1;
        }
        html.push(chunk.join("\n"));
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^#{1,3} /.test(lines[i]) && lines[i].trim().charAt(0) !== "<") {
        para.push(lines[i].trim());
        i += 1;
      }
      html.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return html.join("\n");
  }
})();
