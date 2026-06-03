/* ─────────────────────────────────────────
   GitHub Actions Guide — script.js
───────────────────────────────────────── */

/* ── Animated Counters ── */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const isLarge = target >= 1000;
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(ease * target);
    if (isLarge) {
      el.textContent = current.toLocaleString() + '+';
    } else if (target === 100) {
      el.textContent = current + '%';
    } else {
      el.textContent = current;
    }
    if (progress < 1) requestAnimationFrame(update);
    else {
      if (isLarge) el.textContent = target.toLocaleString() + '+';
      else if (target === 100) el.textContent = '100%';
      else el.textContent = target;
    }
  };
  requestAnimationFrame(update);
}

/* ── Intersection Observer for scroll animations ── */
const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -60px 0px' };

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const card = entry.target;
      const delay = card.dataset.delay || 0;
      setTimeout(() => card.classList.add('visible'), parseInt(delay));
      cardObserver.unobserve(card);
    }
  });
}, observerOptions);

document.querySelectorAll('.info-card').forEach(card => cardObserver.observe(card));

/* ── Counter Observer ── */
let countersStarted = false;
const counterObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !countersStarted) {
    countersStarted = true;
    document.querySelectorAll('.stat-num').forEach(el => {
      const target = parseInt(el.dataset.target);
      animateCounter(el, target);
    });
    counterObserver.disconnect();
  }
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) counterObserver.observe(heroStats);

/* ── Nav scroll effect ── */
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.borderBottomColor = '#2d2d42';
    nav.style.background = 'rgba(6, 6, 10, 0.95)';
  } else {
    nav.style.borderBottomColor = '#1e1e2e';
    nav.style.background = 'rgba(10, 10, 15, 0.85)';
  }
}, { passive: true });

/* ── Pipeline interactive steps ── */
const pipelineSteps = document.querySelectorAll('.pipeline-step');
let activeStep = 0;
let pipelineInterval = null;

function setActiveStep(index) {
  pipelineSteps.forEach(s => s.classList.remove('active'));
  pipelineSteps[index].classList.add('active');
  activeStep = index;
}

function startPipelineAnimation() {
  pipelineInterval = setInterval(() => {
    setActiveStep((activeStep + 1) % pipelineSteps.length);
  }, 1400);
}

// Auto-start when in view
const pipelineObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    startPipelineAnimation();
  } else {
    clearInterval(pipelineInterval);
  }
}, { threshold: 0.4 });

const pipeline = document.querySelector('.pipeline');
if (pipeline) pipelineObserver.observe(pipeline);

pipelineSteps.forEach((step, i) => {
  step.addEventListener('click', () => {
    clearInterval(pipelineInterval);
    setActiveStep(i);
    setTimeout(startPipelineAnimation, 2000);
  });
});

/* ── Code Tabs & Syntax Highlighting ── */
const workflows = {
  ci: {
    filename: '.github/workflows/ci.yml',
    code: `# Triggered on every push and pull request
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run test suite
        run: npm test -- --coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4`,
    annotations: [
      { key: 'on:', text: 'Triggers this workflow on push to main/develop, and on any pull request targeting main.' },
      { key: 'matrix:', text: 'Runs the job in parallel across Node.js v18 and v20 — two runners at once.' },
      { key: 'actions/checkout@v4', text: 'Official action that clones your repository onto the runner.' },
      { key: 'cache: npm', text: "Caches node_modules between runs — speeds up builds significantly." },
    ]
  },
  deploy: {
    filename: '.github/workflows/deploy.yml',
    code: `# Deploy to AWS on merge to main
name: Deploy to Production

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: my-app
  ECS_SERVICE: my-app-service
  ECS_CLUSTER: production

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        run: |
          docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:latest .
          docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:latest

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1`,
    annotations: [
      { key: 'environment: production', text: 'Requires manual approval in GitHub Environments before deployment proceeds.' },
      { key: 'secrets.*', text: 'AWS credentials are stored as encrypted secrets — never hardcoded in YAML.' },
      { key: 'ECR_REGISTRY', text: 'Environment variables keep your config DRY and easy to update in one place.' },
    ]
  },
  release: {
    filename: '.github/workflows/release.yml',
    code: `# Auto-create releases when a version tag is pushed
name: Create Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    name: Build & Publish
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Install & Build
        run: |
          npm ci
          npm run build

      - name: Generate changelog
        id: changelog
        uses: mikepenz/release-changelog-builder-action@v4

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: \${{ steps.changelog.outputs.changelog }}
          files: dist/**

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}`,
    annotations: [
      { key: "tags: 'v*.*.*'", text: "Only fires when you push a semantic version tag like v1.2.0 — not on regular commits." },
      { key: 'fetch-depth: 0', text: 'Fetches the full git history, needed to generate a proper changelog between versions.' },
      { key: 'steps.changelog.outputs', text: 'Step outputs let you pass data between steps using the id: reference pattern.' },
    ]
  }
};

function highlight(code) {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n')
    .map(line => {
      // Comments
      if (/^\s*#/.test(line)) return `<span class="yaml-comment">${line}</span>`;
      // Key: value lines
      if (/^(\s*)([a-zA-Z_\-]+)(:)\s*(.*)$/.test(line)) {
        return line.replace(/^(\s*)([a-zA-Z_\-]+)(:)(\s*)(.*)$/, (_, indent, key, colon, space, val) => {
          const keySpan = `<span class="yaml-key">${key}</span><span class="yaml-punct">${colon}</span>`;
          if (!val.trim()) return indent + keySpan;
          let valSpan = val;
          if (/^\$\{\{/.test(val.trim())) valSpan = `<span class="yaml-event">${val}</span>`;
          else if (/^(push|pull_request|schedule|workflow_dispatch|release)/.test(val.trim())) valSpan = `<span class="yaml-event">${val}</span>`;
          else if (/^(ubuntu-latest|windows-latest|macos-latest)/.test(val.trim())) valSpan = `<span class="yaml-action">${val}</span>`;
          else if (/^actions\/|^aws-actions\/|^softprops\/|^mikepenz\/|^codecov\//.test(val.trim())) valSpan = `<span class="yaml-action">${val}</span>`;
          else if (/^'/.test(val.trim()) || /^"/.test(val.trim())) valSpan = `<span class="yaml-string">${val}</span>`;
          else valSpan = `<span class="yaml-value">${val}</span>`;
          return indent + keySpan + space + valSpan;
        });
      }
      // List items with dash
      if (/^\s+-\s+/.test(line)) {
        return line.replace(/^(\s+-\s+)(.*)$/, (_, dash, rest) => {
          if (/^actions\/|^aws-actions\/|^softprops\/|^mikepenz\/|^codecov\//.test(rest.trim()))
            return `<span class="yaml-punct">${dash}</span><span class="yaml-action">${rest}</span>`;
          return `<span class="yaml-punct">${dash}</span><span class="yaml-value">${rest}</span>`;
        });
      }
      return line;
    })
    .join('\n');
}

function loadTab(tab) {
  const data = workflows[tab];
  document.getElementById('code-filename').textContent = data.filename;
  const codeEl = document.getElementById('code-content');
  codeEl.innerHTML = highlight(data.code);

  const annotationsEl = document.getElementById('code-annotations');
  annotationsEl.innerHTML = data.annotations.map(a =>
    `<div class="annotation"><strong>${a.key}</strong> ${a.text}</div>`
  ).join('');

  // Reset copy button
  const btn = document.getElementById('copy-btn');
  btn.textContent = 'Copy';
  btn.classList.remove('copied');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTab(btn.dataset.tab);
  });
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const tab = document.querySelector('.tab-btn.active').dataset.tab;
  navigator.clipboard.writeText(workflows[tab].code).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});

// Load initial tab
loadTab('ci');

/* ── Active nav link on scroll ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = '';
        if (a.getAttribute('href') === '#' + entry.target.id) {
          a.style.color = 'var(--accent)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

/* ── Concept items stagger on scroll ── */
const conceptObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = parseInt(entry.target.dataset.index) - 1;
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, idx * 80);
      conceptObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.concept-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  conceptObserver.observe(el);
});

/* ── Use case cards stagger ── */
const ucObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const cards = entry.target.querySelectorAll('.usecase-card');
      cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.25s, box-shadow 0.25s';
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 80);
      });
      ucObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

const ucGrid = document.querySelector('.usecases-grid');
if (ucGrid) ucObserver.observe(ucGrid);
