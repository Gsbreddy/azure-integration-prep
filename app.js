// ===== THEME =====
const body = document.body;
const saved = localStorage.getItem('theme') || 'light';
body.className = saved;
document.getElementById('themeToggle').addEventListener('click', () => {
  body.className = body.className === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', body.className);
});
document.addEventListener('keydown', e => {
  if (e.key === 'd' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    body.className = body.className === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', body.className);
  }
});

// ===== READING PROGRESS =====
window.addEventListener('scroll', () => {
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  document.getElementById('readingProgress').style.width = Math.min(pct, 100) + '%';
});

// ===== Q&A TOGGLE =====
function toggleQA(el) {
  const item = el.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.qa-item.open').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

// ===== DEEPER TOGGLE =====
function toggleDeeper(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('open');
}

// ===== ACTIVE NAV =====
const navLinks = document.querySelectorAll('.nav-item[href^="#"]');
const allSections = document.querySelectorAll('section[id]');
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(n => {
        n.classList.remove('active');
        if (n.getAttribute('href') === '#' + e.target.id) n.classList.add('active');
      });
    }
  });
}, { rootMargin: '-10% 0px -80% 0px' });
allSections.forEach(s => navObserver.observe(s));

// ===== RENDER CARDS =====
const container = document.getElementById('dynamic-topics');

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

CARDS.forEach(card => {
  const section = document.createElement('section');
  section.id = card.id;
  section.className = 'topic-section';

  const numColor = card.isKey ? '#f97316' : 'var(--accent)';

  let html = `
    <div class="section-header">
      ${card.isKey ? `<div class="key-topic-banner">★ JD PRIORITY TOPIC — Know this cold</div>` : ''}
      <h2>
        <span class="topic-num" style="background:${numColor}">${card.num}</span>
        ${esc(card.title)}
      </h2>
    </div>

    <div class="one-thing-box">
      <div class="one-thing-label">THE ONE THING TO SAY</div>
      <div class="one-thing-text">"${esc(card.oneThing)}"</div>
    </div>

    <div class="story-card">
      <div class="story-card-label">YOUR STORY — Tell this if they ask</div>
      <div class="story-card-text">${esc(card.story)}</div>
    </div>
  `;

  // Key terms as hover pills
  if (card.terms && card.terms.length) {
    html += `<div class="terms-row">`;
    card.terms.forEach(([name, def]) => {
      html += `<span class="term-pill" data-def="${esc(def)}" title="${esc(def)}">${esc(name)}</span>`;
    });
    html += `</div>`;
  }

  // If they go deeper
  if (card.deeper && card.deeper.length) {
    html += `
      <div class="deeper-section">
        <div class="deeper-toggle" onclick="toggleDeeper(this)">
          <span>If they go deeper ▾</span>
          <span class="chevron">▾</span>
        </div>
        <div class="deeper-body">
          <ul class="deeper-list">
            ${card.deeper.map(d => `<li>${d}</li>`).join('')}
          </ul>
          ${card.apimPolicy ? `<pre class="code-block">${esc(card.apimPolicy)}</pre>` : ''}
        </div>
      </div>
    `;
  }

  // Q&As
  if (card.qa && card.qa.length) {
    html += `
      <div class="qa-section">
        <div class="qa-label">Likely questions — click to see answer</div>
        <div class="qa-list">
          ${card.qa.map(qa => `
            <div class="qa-item">
              <div class="qa-question" onclick="toggleQA(this)">
                <span>${esc(qa.q)}</span>
                <span class="qa-chevron">▼</span>
              </div>
              <div class="qa-answer"><p>${esc(qa.a)}</p></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  section.innerHTML = html;
  container.appendChild(section);
  navObserver.observe(section);
});

console.log('Pallavi — Interview Monday. You\'ve got this.');
