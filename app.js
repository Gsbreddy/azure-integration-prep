// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const saved = localStorage.getItem('theme') || 'light';
body.className = saved;
themeToggle.addEventListener('click', () => {
  body.className = body.className === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', body.className);
});

// ===== Q&A TOGGLE =====
function toggleQA(el) {
  const item = el.parentElement;
  const isOpen = item.classList.contains('open');
  // close all
  document.querySelectorAll('.qa-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ===== READING PROGRESS =====
const progressBar = document.getElementById('readingProgress');
window.addEventListener('scroll', () => {
  const total = document.body.scrollHeight - window.innerHeight;
  const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
  progressBar.style.width = Math.min(pct, 100) + '%';
});

// ===== ACTIVE NAV =====
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.topic-section, #master-story');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navItems.forEach(n => {
        n.classList.remove('active');
        if (n.getAttribute('href') === '#' + id) n.classList.add('active');
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });
sections.forEach(s => observer.observe(s));

// ===== RENDER DYNAMIC TOPICS =====
const container = document.getElementById('dynamic-topics');

function makeBadge(badge, label) {
  const cls = badge === 'active' ? 'badge-blue' : badge === 'done' ? 'badge-done' : 'badge-purple';
  return `<span class="section-badge badge ${cls}">${label}</span>`;
}

function renderQA(qa, topicId) {
  if (!qa || !qa.length) return '';
  const items = qa.map((item, i) => `
    <div class="qa-item">
      <div class="qa-question" onclick="toggleQA(this)">
        <span>${item.q}</span>
        <span class="qa-chevron">▼</span>
      </div>
      <div class="qa-answer">
        ${item.a.includes('\n') || item.a.includes('<')
          ? `<pre class="code-block">${escHtml(item.a)}</pre>`
          : `<p>${item.a}</p>`}
      </div>
    </div>
  `).join('');
  return `<div class="qa-section"><h3>Interview Q&amp;A</h3><div class="qa-list">${items}</div></div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderTerms(terms) {
  if (!terms || !terms.length) return '';
  const rows = terms.map(([name, def]) => `
    <div class="term"><span class="term-name">${name}</span><span class="term-def">${def}</span></div>
  `).join('');
  return `<div class="content-card"><h3>Key Terms</h3><div class="terms-grid">${rows}</div></div>`;
}

function renderConcepts(concepts) {
  if (!concepts || !concepts.length) return '';
  const blocks = concepts.map(c => `
    <div class="concept-block">
      <h4>${c.title}</h4>
      <p>${c.body}</p>
    </div>
  `).join('');
  return `<div class="content-card"><h3>Core Concepts</h3>${blocks}</div>`;
}

function renderDiagram(diagram) {
  if (!diagram) return '';
  return `<div class="flow-diagram">${escHtml(diagram)}</div>`;
}

function renderAPIMPolicy(policy) {
  if (!policy) return '';
  return `
    <div class="content-card" style="margin-top:20px">
      <h3>APIM Policy Reference</h3>
      <pre class="code-block">${escHtml(policy)}</pre>
    </div>
  `;
}

Object.values(TOPICS).forEach(topic => {
  const section = document.createElement('section');
  section.id = topic.id;
  section.className = 'topic-section';

  section.innerHTML = `
    <div class="section-header">
      ${makeBadge(topic.badge, topic.badgeLabel)}
      <h2><span class="topic-num">${topic.num}</span> ${topic.title}</h2>
      <p class="section-desc">${topic.desc}</p>
    </div>

    <div class="content-grid">
      ${renderConcepts(topic.concepts)}
      ${renderTerms(topic.terms)}
    </div>

    ${topic.diagram ? `<div style="margin-bottom:20px"><h3 style="font-size:.95rem;font-weight:700;color:var(--text);margin-bottom:10px">Architecture / Flow Diagram</h3>${renderDiagram(topic.diagram)}</div>` : ''}

    ${topic.apimPolicy ? renderAPIMPolicy(topic.apimPolicy) : ''}

    ${renderQA(topic.qa, topic.id)}
  `;

  container.appendChild(section);

  // observe for nav
  observer.observe(section);
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.key === 'd' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
    body.className = body.className === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', body.className);
  }
});

// ===== SMOOTH SEARCH HIGHLIGHT =====
// Add a quick-find: press / to highlight next Q&A
let lastSearch = '';
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.shiftKey) {
    // open all QAs
    document.querySelectorAll('.qa-item:not(.open)').forEach(i => i.classList.add('open'));
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.qa-item.open').forEach(i => i.classList.remove('open'));
  }
});

console.log(`
╔════════════════════════════════════════════╗
║  Azure Integration Interview Prep          ║
║  Pallavi Dronamraju — KGS Interview        ║
║                                            ║
║  Shortcuts:                                ║
║  D = toggle dark mode                      ║
║  Shift+Enter = open all Q&As               ║
║  Escape = close all Q&As                   ║
╚════════════════════════════════════════════╝
`);
