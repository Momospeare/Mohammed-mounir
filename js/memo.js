/* ============================================================
   Memo — scripted sidekick for mohammedmounir.ca
   ------------------------------------------------------------
   Scripted replies only. Answers come from a fixed script below.
   What the visitor types is sent (scrubbed of emails, phone
   numbers and links) to Momo's own Cloudflare Worker, so he
   can see what Memo couldn't answer and improve it. Only the
   topic of the question (the matched intent name, e.g.
   "police") and whether Memo could answer it are sent to
   Google Analytics as counts. Nothing is stored in the
   browser. Not live AI — the panel says so up front.
   The real Memo runs on Ollama on Momo's MacBook (local-only);
   wiring live replies would need a backend, which this static
   site doesn't have.
   ============================================================ */
(function () {
  'use strict';

  var LINKEDIN = 'https://www.linkedin.com/in/mohammed-mounir-10587621b/';

  /* Intent table: first keyword-group match wins. Replies are
     trusted static strings (may contain links); user input is
     always rendered as text, never HTML. */
  var INTENTS = [
    {
      name: 'identity',
      keys: ['who are you', 'who is memo', 'what are you', 'are you ai', 'are you real', 'memo'],
      reply: 'I\'m Memo — mini-Momo. I answer from a script, not live AI. Think of me as the tour guide. The real Momo is on LinkedIn.'
    },
    {
      name: 'about_momo',
      keys: ['who is momo', 'tell me about momo', 'about momo', 'about him'],
      reply: 'Asset protection at Loblaw — investigations, evidence packages, organized retail crime. Co-founder of MOLEX, a digital solutions business. Seneca CPA (on hold), working toward crime intelligence — auxiliary applications in preparation. The About section has the details.'
    },
    {
      name: 'work',
      keys: ['what does momo do', 'what do you do', 'job', 'work', 'career', 'profession', 'occupation'],
      reply: 'Asset Protection Rep at Loblaw, and co-founder of MOLEX — a digital solutions business. Security by trade, digital solutions through MOLEX.'
    },
    {
      name: 'experience',
      keys: ['experience', 'timeline', 'history', 'background', 'worked', 'jobs'],
      reply: 'Six years in: Loblaw AP now, MOLEX since 2025, ASP field security 2020–25, WLKN store management, and the early retail years before that. Scroll the timeline — it\'s the whole story.'
    },
    {
      name: 'skills',
      keys: ['skill', 'certification', 'cert', 'qualified', 'licence', 'license'],
      reply: 'OSINT, GA4, MLEO (renewed Aug 2026), behavior detection, use of force, First Aid / CPR-C, Naloxone. Plus Python, Java, SQL, JavaScript. Full list under Skills &amp; certifications.'
    },
    {
      name: 'projects',
      keys: ['project', 'molex', 'sparkylube', 'true shield', 'built', 'website'],
      reply: 'MOLEX is the business. SparkyLube\'s site did 4,300+ visitors and 344 upsold clients in 2025 — there\'s a demo in Projects. True Shield Security\'s official site launched 2026.'
    },
    {
      name: 'education',
      keys: ['education', 'school', 'seneca', 'study', 'degree', 'diploma', 'college'],
      reply: 'Computer Programming &amp; Analysis at Seneca (Jan 2024 – on hold), after Police Foundations with distinction. Direction: digital solutions and crime intelligence. He was invited to complete Seneca\'s Honours Bachelor of Crime &amp; Intelligence Analysis.'
    },
    {
      name: 'awards',
      keys: ['award', 'ospa', 'lifesaver', 'highlight', 'recognition', 'achievement'],
      reply: 'OSPA Outstanding Young Security Professional 2025, Canadian Security Lifesaver Award twice — August 2023 fire-truck rescue at Kipling &amp; Stevenson, March 2022 TTC bus rescue. Full list under Highlights.'
    },
    {
      name: 'police',
      keys: ['police', 'opp', 'cop', 'constable', 'auxiliary'],
      reply: 'No — he is a civilian security guard with a policing education. Police Foundations grad, OACP certificate done. Auxiliary applications in preparation — OPP and South Simcoe. Crime intelligence analyst is the long game: his Police Foundations diploma already qualifies him for the Seneca Honours Bachelor of Crime & Intelligence Analysis (advanced entry).'
    },
    {
      name: 'contact',
      keys: ['contact', 'hire', 'email', 'reach', 'resume', 'cv', 'talk to momo'],
      reply: 'LinkedIn\'s the way in — <a href="' + LINKEDIN + '" target="_blank" rel="noopener noreferrer">connect with Momo there<span class="visually-hidden"> (opens in new tab)</span></a>, or request the resume from the Contact section.'
    },
    {
      name: 'motovlog',
      keys: ['bike', 'motorcycle', 'motovlog', 'momospeare', 'ride', 'mt-07', 'ninja', 'alex', 'youtube', 'stream', 'twitch', 'discord'],
      reply: 'Yamaha MT-07, duo motovlog with Alex on the Ninja 300. Destination rides, garage stuff, gaming. There\'s a whole page for it: <a href="/momospeare.html">Momospeare</a> — streams are on <a href="https://www.twitch.tv/momospeare" target="_blank" rel="noopener noreferrer">Twitch<span class="visually-hidden"> (opens in new tab)</span></a> and <a href="https://www.youtube.com/@Momospeare" target="_blank" rel="noopener noreferrer">YouTube<span class="visually-hidden"> (opens in new tab)</span></a>.'
    },
    {
      name: 'gaming',
      keys: ['gta', 'gaming', 'cod', 'call of duty', 'fortnite', 'minecraft', 'game'],
      reply: 'COD, GTA, Minecraft, Fortnite. Currently running Vice City chaos with Alex — the duo run, plus breakup and romance skits for clipping. Details are on the <a href="/momospeare.html">Momospeare page</a>.'
    },
    {
      /* Greeting is checked after every substantive intent, so a
         greeting word inside a real question never hijacks it. */
      name: 'greeting',
      keys: ['hello', 'hi', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening'],
      reply: 'Hey. I\'m Memo. Ask me what Momo does, his experience, skills, or projects — or how to reach him.'
    },
    {
      name: 'thanks',
      keys: ['thank', 'thanks', 'thx'],
      reply: 'Anytime.'
    },
    {
      name: 'goodbye',
      keys: ['bye', 'goodbye', 'see you'],
      reply: 'Later. The timeline\'s up top if you want the full story.'
    }
  ];

  var FALLBACK = 'Don\'t have that one in my script. Best move: ask Momo directly on ' +
    '<a href="' + LINKEDIN + '" target="_blank" rel="noopener noreferrer">LinkedIn<span class="visually-hidden"> (opens in new tab)</span></a> — the link\'s in the Contact section.';

  var CHIPS = [
    'What does Momo do?',
    'Experience',
    'Skills & certs',
    'Projects',
    'How do I reach him?'
  ];

  var toggle = document.getElementById('memo-toggle');
  var panel = document.getElementById('memo-panel');
  var closeBtn = document.getElementById('memo-close');
  var messages = document.getElementById('memo-messages');
  var chipsBox = document.getElementById('memo-chips');
  var form = document.getElementById('memo-form');
  var input = document.getElementById('memo-input');
  if (!toggle || !panel || !messages || !form || !input || !closeBtn || !chipsBox) return;

  var greeted = false;

  function addMessage(html, who) {
    var div = document.createElement('div');
    div.className = 'memo-msg ' + who;
    if (who === 'memo') {
      div.innerHTML = html; // trusted static strings only
    } else {
      div.textContent = html; // user input: text, never HTML
    }
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  // Analytics: only the intent name (e.g. "police") and whether
  // Memo could answer are sent to GA4. The visitor's words never leave.
  function trackMemo(name, params) {
    if (window.PortfolioAnalytics && window.PortfolioAnalytics.track) {
      window.PortfolioAnalytics.track(name, params);
    }
  }

  // Question log: the visitor's words are sent (scrubbed of emails,
  // phone numbers and links) to Momo's own Cloudflare Worker, so he
  // can see what Memo couldn't answer and improve it. Fire-and-forget:
  // if the endpoint isn't up yet, nothing breaks and nothing shows.
  var MEMO_LOG_URL = '/api/memo-log';

  function scrub(text) {
    return (text || '')
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
      .replace(/https?:\/\/\S+/g, '[link]')
      .replace(/\b(?:www\.)?[A-Za-z0-9-]+\.[A-Za-z]{2,}\b/g, '[link]')
      .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone]')
      .replace(/\b\d{7,}\b/g, '[number]');
  }

  function logQuestion(question, intentName, via, fallback) {
    try {
      var body = JSON.stringify({
        q: scrub(question).slice(0, 500),
        intent: intentName,
        via: via,
        fallback: !!fallback,
        ts: new Date().toISOString()
      });
      fetch(MEMO_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(function () { /* logging is best-effort; never break Memo */ });
    } catch (e) { /* never break Memo */ }
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function matchIntent(text) {
    var q = text.toLowerCase();
    for (var i = 0; i < INTENTS.length; i++) {
      var keys = INTENTS[i].keys;
      for (var j = 0; j < keys.length; j++) {
        // Word-boundary match only: 'hi' must be a whole word (not
        // inside 'him' / 'this' / 'think'), 'yo' must not match
        // 'you' / 'your'. Substring matching hijacked most questions.
        // A trailing 's' is allowed so plurals ('skills', 'projects',
        // 'awards') still match their singular keys.
        var re = new RegExp('\\b' + escapeRegExp(keys[j]) + 's?\\b');
        if (re.test(q)) return INTENTS[i];
      }
    }
    return null;
  }

  function ask(text, via) {
    var clean = (text || '').trim();
    if (!clean) return;
    addMessage(clean, 'user');
    var intent = matchIntent(clean);
    var name = intent ? intent.name : 'fallback';
    addMessage(intent ? intent.reply : FALLBACK, 'memo');
    trackMemo('memo_ask', { intent: name, via: via || 'typed' });
    if (!intent) trackMemo('memo_fallback', {});
    logQuestion(clean, name, via || 'typed', !intent);
  }

  function openPanel() {
    trackMemo('memo_open', {});
    panel.hidden = false;
    document.body.classList.add('memo-open');
    toggle.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      addMessage('Hey, I\'m Memo — mini-Momo. Ask me about his work, or tap one below.', 'memo');
    }
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    document.body.classList.remove('memo-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) openPanel(); else closePanel();
  });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  // Focus trap: while the panel is open, Tab cycles within it.
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || panel.hidden) return;
    var focusables = panel.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  CHIPS.forEach(function (label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'memo-chip';
    b.textContent = label;
    b.addEventListener('click', function () {
      if (panel.hidden) openPanel();
      ask(label, 'chip');
    });
    chipsBox.appendChild(b);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = '';
    ask(v);
    input.focus();
  });
})();
