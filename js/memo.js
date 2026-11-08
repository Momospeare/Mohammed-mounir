/* ============================================================
   Memo — scripted sidekick for mohammedmounir.ca
   ------------------------------------------------------------
   Client-side only. Answers come from a fixed script below;
   nothing the visitor types leaves the browser, nothing is
   stored, nothing is sent to any server. Not live AI — the
   panel says so up front.
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
      keys: ['who are you', 'who is memo', 'what are you', 'are you ai', 'are you real', 'memo'],
      reply: 'I\'m Memo — mini-Momo. I answer from a script, not live AI. Think of me as the tour guide. The real Momo is on LinkedIn.'
    },
    {
      keys: ['who is momo', 'tell me about momo', 'about momo', 'about him'],
      reply: 'Momo\'s a security pro turned builder — asset protection at Loblaw, MOLEX co-founder, Seneca CPA student aiming at cyber security and auxiliary policing. The About section up top tells it properly.'
    },
    {
      keys: ['hello', 'hi', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening'],
      reply: 'Hey. I\'m Memo. Ask me what Momo does, his experience, skills, or projects — or how to reach him.'
    },
    {
      keys: ['what does momo do', 'what do you do', 'job', 'work', 'career', 'profession', 'occupation'],
      reply: 'Asset Protection Rep at Loblaw, and co-founder of MOLEX — a digital-operations business. Security by trade, software in progress.'
    },
    {
      keys: ['experience', 'timeline', 'history', 'background', 'worked', 'jobs'],
      reply: 'Six years in: Loblaw AP now, MOLEX since 2025, ASP field security 2020–25, WLKN store management, and the early retail years before that. Scroll the timeline — it\'s the whole story.'
    },
    {
      keys: ['skill', 'certification', 'cert', 'qualified', 'licence', 'license'],
      reply: 'OSINT, GA4, MLEO (renewed Aug 2026), behavior detection, use of force, First Aid / CPR-C, Naloxone. Plus Python, Java, SQL, JavaScript. Full list under Skills &amp; certifications.'
    },
    {
      keys: ['project', 'molex', 'sparkylube', 'true shield', 'built', 'website'],
      reply: 'MOLEX is the business. SparkyLube\'s site did 4,300+ visitors and 344 upsold clients in 2025 — there\'s a demo in Projects. True Shield Security\'s official site launched 2026.'
    },
    {
      keys: ['education', 'school', 'seneca', 'study', 'degree', 'diploma', 'college'],
      reply: 'Computer Programming &amp; Analysis at Seneca (Jan 2024 – May 2027), after Police Foundations with distinction. Goal: cyber security specialist.'
    },
    {
      keys: ['award', 'ospa', 'lifesaver', 'highlight', 'recognition', 'achievement'],
      reply: 'OSPA Outstanding Young Security Professional 2025, Canadian Security Lifesaver Award twice — 2023 fire-truck rescue, 2022 TTC bus rescue. Full list under Highlights.'
    },
    {
      keys: ['police', 'opp', 'cop', 'constable', 'auxiliary'],
      reply: 'Police Foundations grad, OACP certificate done. Working toward auxiliary policing — OPP and South Simcoe.'
    },
    {
      keys: ['contact', 'hire', 'email', 'reach', 'resume', 'cv', 'talk to momo'],
      reply: 'LinkedIn\'s the way in — <a href="' + LINKEDIN + '" target="_blank" rel="noopener noreferrer">connect with Momo there</a>, or request the resume from the Contact section.'
    },
    {
      keys: ['bike', 'motorcycle', 'motovlog', 'momospeare', 'ride', 'mt-07', 'ninja', 'alex', 'youtube', 'stream', 'twitch', 'discord'],
      reply: 'Yamaha MT-07, duo motovlog with Alex on the Ninja 300. Destination rides, garage stuff, gaming. There\'s a whole page for it: <a href="/momospeare.html">Momospeare</a> — streams are on <a href="https://www.twitch.tv/momospeare" target="_blank" rel="noopener noreferrer">Twitch</a> and <a href="https://www.youtube.com/@Momospeare" target="_blank" rel="noopener noreferrer">YouTube</a>.'
    },
    {
      keys: ['gta', 'gaming', 'cod', 'call of duty', 'fortnite', 'minecraft', 'game'],
      reply: 'COD, GTA, Minecraft, Fortnite. Currently running a full GTA series marathon up to the GTA 6 launch — schedule\'s on the <a href="/momospeare.html">Momospeare page</a>.'
    },
    {
      keys: ['thank', 'thanks', 'thx'],
      reply: 'Anytime.'
    },
    {
      keys: ['bye', 'goodbye', 'see you'],
      reply: 'Later. The timeline\'s up top if you want the full story.'
    }
  ];

  var FALLBACK = 'Don\'t have that one in my script. Best move: ask Momo directly on ' +
    '<a href="' + LINKEDIN + '" target="_blank" rel="noopener noreferrer">LinkedIn</a> — the link\'s in the Contact section.';

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
  if (!toggle || !panel || !messages || !form || !input) return;

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

  function answer(text) {
    var q = text.toLowerCase();
    for (var i = 0; i < INTENTS.length; i++) {
      var keys = INTENTS[i].keys;
      for (var j = 0; j < keys.length; j++) {
        if (q.indexOf(keys[j]) !== -1) return INTENTS[i].reply;
      }
    }
    return FALLBACK;
  }

  function ask(text) {
    var clean = (text || '').trim();
    if (!clean) return;
    addMessage(clean, 'user');
    addMessage(answer(clean), 'memo');
  }

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      addMessage('Hey, I\'m Memo — mini-Momo. Ask me about his work, or tap one below.', 'memo');
    }
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
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

  CHIPS.forEach(function (label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'memo-chip';
    b.textContent = label;
    b.addEventListener('click', function () {
      if (panel.hidden) openPanel();
      ask(label);
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
