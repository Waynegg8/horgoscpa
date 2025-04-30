+++
title="部落格"
+++

<input id="search" placeholder="搜索文章">
<div id="posts">
{{ range .Pages.ByDate.Reverse }}
<div class="post">
  <h2><a href="{{ .Permalink }}">{{ .Title }}</a></h2>
  <p>{{ .Summary }}</p>
  {{ if .Params.preview_image }}<img src="{{ .Params.preview_image }}" alt>{{ end }}
</div>
{{ end }}
</div>
<script>
document.getElementById('search').addEventListener('input',function(){
  let q=this.value.toLowerCase();
  document.querySelectorAll('#posts .post').forEach(post => {
    post.style.display = post.innerText.toLowerCase().includes(q)? 'block':'none';
  });
});
</script>
