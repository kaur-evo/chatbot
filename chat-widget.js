// =====================================================
// Evocon AI Support — Shared Chat Widget Logic
// =====================================================
//
// COMPONENT MAPPING (prototype → Evocon Vue component library):
// ┌─────────────────────────────────┬──────────────────────────────────────────────┐
// │ Prototype element                │ Vue component                                │
// ├─────────────────────────────────┼──────────────────────────────────────────────┤
// │ .ev-widget (whole widget)        │ MrEvoconChat (organism)                      │
// │ .ev-header                       │ v-toolbar flat density=compact               │
// │ .ev-header-icon                  │ v-icon :icon="mdiContactSupport" color=primary│
// │ .ev-header-close                 │ EvoconVButton icon=mdiClose type=secondary    │
// │ .ev-ref-chip                     │ EvoconVChip type=outlined :icon :label        │
// │ .ev-feedback-btn (helpful)       │ EvoconVChip type=neutral icon=mdiThumbUp      │
// │ .ev-feedback-btn (not helpful)   │ EvoconVChip type=neutral icon=mdiThumbDown    │
// │ .ev-feedback-comment-input       │ EvoconVInput filled density=compact           │
// │ .ev-feedback-comment-submit      │ EvoconVButton icon=mdiCheck type=secondary    │
// │ .ev-privacy-accept               │ EvoconVButton text="I ACCEPT" type=primary    │
// │ .ev-input-field                  │ EvoconVInput filled density=compact            │
// │ .ev-send                         │ EvoconVButton icon=mdiSend type=secondary     │
// │ .ev-input-hint                   │ v-messages (helper text below input)           │
// │ .ev-bubble-bot                   │ Custom: chat-bubble (new shape, no existing)   │
// │ .ev-bubble-user                  │ Custom: chat-bubble variant=user               │
// │ .ev-feedback                     │ Custom: chat-bubble (feedback pill variant)    │
// └─────────────────────────────────┴──────────────────────────────────────────────┘
//
// NOTE: Chat bubbles (.ev-bubble-bot, .ev-bubble-user, .ev-feedback) are NEW shapes
// not present in the existing component library. They need a new component or CSS class.
// Everything else maps directly to existing Evocon atoms/molecules.
//

/**
 * EvoconChat — Initializes chat widget behavior on existing DOM.
 *
 * Options:
 *   persistConsent: boolean — if true, reads/writes localStorage to remember consent
 *   onClose: function — called when close button is clicked (page handles visibility)
 *
 * Expects DOM ids: ev-chat-container, ev-messages, ev-input, ev-send, ev-privacy, ev-consent
 * Expects DOM class: .ev-input-container (first match inside the widget)
 */
function EvoconChat(containerEl, options) {
  options = options || {};

  const PRIVACY_URL = 'https://143752644.fs1.hubspotusercontent-eu1.net/hubfs/143752644/Terms%20of%20service%20documents%202026%20Jan/Evocon%20Privacy%20Notice.pdf';
  const HELP_URL = 'https://support.evocon.com/Help-Support-1fce89bd3f624aba977dbbda5ef0224a';

  // ===== Feature toggles =====
  const ENABLE_FEEDBACK = true;
  const MOCK_RESPONSE = true;
  const MOCK_ANSWER = "Red in Shift View means there's a production stop — the time between two consecutive production signals has exceeded the stop start time defined for that product.";
  const MOCK_SOURCES = [
    'https://support.evocon.com/en/shift-view-overview',
    'https://support.evocon.com/en/users',
    'https://support.evocon.com/en/factory-overview'
  ];

  // API endpoints
  const CHAT_ENDPOINT = '/chat';
  const FEEDBACK_ENDPOINT = '/feedback';

  const GREETING_TEXT = "Hello! I'm your AI support assistant.\nAsk me about Evocon functionality and I'll try to help. For full Evocon documentation, see below:";
  const GREETING_REFS = [
    { label: 'Evocon Help & Support', url: HELP_URL, icon: 'help' }
  ];

  // ===== State =====
  const sessionId = 'web-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
  let botTurnIndex = -1;
  let isSending = false;

  // ===== Elements =====
  const chatContainer = containerEl.querySelector('#ev-chat-container') || containerEl.querySelector('.ev-chat-container');
  const messagesEl = containerEl.querySelector('#ev-messages') || containerEl.querySelector('.ev-messages');
  const inputEl = containerEl.querySelector('#ev-input') || containerEl.querySelector('.ev-input');
  const sendBtn = containerEl.querySelector('#ev-send') || containerEl.querySelector('.ev-send');
  const privacyEl = containerEl.querySelector('#ev-privacy') || containerEl.querySelector('.ev-privacy');
  const consentEl = containerEl.querySelector('#ev-consent') || containerEl.querySelector('.ev-privacy-accept');
  const inputContainer = containerEl.querySelector('.ev-input-container');
  const closeBtn = containerEl.querySelector('.ev-header-close');

  // ===== SVG icons (MDI paths) =====
  const ICONS = {
    openInNew: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg>',
    helpCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"/></svg>',
    thumbUp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23,10C23,8.89 22.1,8 21,8H14.68L15.64,3.43C15.66,3.33 15.67,3.22 15.67,3.11C15.67,2.7 15.5,2.32 15.23,2.05L14.17,1L7.59,7.59C7.22,7.95 7,8.45 7,9V19A2,2 0 0,0 9,21H18C18.83,21 19.54,20.5 19.84,19.78L22.86,12.73C22.95,12.5 23,12.26 23,12V10M1,21H5V9H1V21Z"/></svg>',
    thumbDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,15H23V3H19M15,3H6C5.17,3 4.46,3.5 4.16,4.22L1.14,11.27C1.05,11.5 1,11.74 1,12V14A2,2 0 0,0 3,16H9.31L8.36,20.57C8.34,20.67 8.33,20.78 8.33,20.89C8.33,21.3 8.5,21.68 8.77,21.95L9.83,23L16.41,16.41C16.78,16.05 17,15.55 17,15V5C17,3.89 16.1,3 15,3Z"/></svg>',
    checkCircle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>',
  };

  // ===== Consent =====
  const CONSENT_STORAGE_KEY = 'ev-consent-acknowledged-at';

  // Set privacy link href from constant
  var privacyLink = privacyEl && privacyEl.querySelector('a');
  if (privacyLink) {
    privacyLink.href = PRIVACY_URL;
  }

  function applyConsentState(consented) {
    inputEl.disabled = !consented;
    sendBtn.disabled = !consented;
    if (consented) {
      inputEl.placeholder = 'Ask about Evocon app';
      inputContainer.classList.remove('ev-input-container--disabled');
      privacyEl.style.display = 'none';
      updateInputState();
    } else {
      inputEl.placeholder = 'Please accept to start';
      inputContainer.classList.add('ev-input-container--disabled');
      privacyEl.style.display = '';
    }
  }

  // Init consent
  if (options.persistConsent && localStorage.getItem(CONSENT_STORAGE_KEY)) {
    applyConsentState(true);
  } else {
    applyConsentState(false);
  }

  consentEl.addEventListener('click', function() {
    localStorage.setItem(CONSENT_STORAGE_KEY, new Date().toISOString());
    applyConsentState(true);
    inputEl.focus();
  });

  // ===== Close button =====
  if (closeBtn && options.onClose) {
    closeBtn.addEventListener('click', options.onClose);
  }

  // ===== Helpers =====
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function createRefChip(ref) {
    var a = document.createElement('a');
    a.className = 'ev-ref-chip';
    a.href = ref.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('data-component', 'EvoconVChip type=outlined icon=' + (ref.icon === 'help' ? 'mdiHelpCircle' : 'mdiOpenInNew'));
    a.innerHTML = (ref.icon === 'help' ? ICONS.helpCircle : ICONS.openInNew) + '<span>' + ref.label + '</span>';
    return a;
  }

  function labelFromUrl(url) {
    try {
      var u = new URL(url);
      var slug = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
      return decodeURIComponent(slug)
        .replace(/-[a-f0-9]{20,}$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
    } catch (e) {
      return url;
    }
  }

  // ===== Render greeting =====
  function renderGreeting() {
    var row = document.createElement('div');
    row.className = 'ev-row-bot';

    var bubble = document.createElement('div');
    bubble.className = 'ev-bubble ev-bubble-bot';

    var lines = GREETING_TEXT.split('\n');
    lines.forEach(function(line, i) {
      var p = document.createElement('p');
      p.textContent = line;
      if (i < lines.length - 1) p.style.marginBottom = '0';
      bubble.appendChild(p);
    });

    var refs = document.createElement('div');
    refs.className = 'ev-refs';
    GREETING_REFS.forEach(function(ref) {
      refs.appendChild(createRefChip(ref));
    });
    bubble.appendChild(refs);

    row.appendChild(bubble);
    chatContainer.appendChild(row);
  }

  // ===== User message =====
  function renderUserMessage(text) {
    var row = document.createElement('div');
    row.className = 'ev-row-user';

    var bubble = document.createElement('div');
    bubble.className = 'ev-bubble ev-bubble-user';
    bubble.textContent = text;
    row.appendChild(bubble);

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  // ===== Typing indicator =====
  function renderTyping() {
    var row = document.createElement('div');
    row.className = 'ev-row-bot';
    row.id = 'ev-typing-row';

    var bubble = document.createElement('div');
    bubble.className = 'ev-bubble ev-bubble-bot';
    bubble.innerHTML = '<div class="ev-typing"><span></span><span></span><span></span></div>';
    row.appendChild(bubble);

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  function removeTyping() {
    var row = document.getElementById('ev-typing-row');
    if (row) row.remove();
  }

  // ===== Bot message =====
  function renderBotMessage(answer, sources, turnIndex) {
    var row = document.createElement('div');
    row.className = 'ev-row-bot';

    var bubble = document.createElement('div');
    bubble.className = 'ev-bubble ev-bubble-bot';

    try {
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(answer || ''));
    } catch (e) {
      bubble.textContent = answer || '';
    }

    bubble.querySelectorAll('a').forEach(function(a) {
      a.target = '_blank';
      a.rel = 'noopener';
    });

    if (sources && sources.length) {
      var refs = document.createElement('div');
      refs.className = 'ev-refs';
      sources.forEach(function(src) {
        refs.appendChild(createRefChip({
          label: labelFromUrl(src),
          url: src,
          icon: 'openInNew'
        }));
      });
      bubble.appendChild(refs);
    }

    row.appendChild(bubble);

    if (ENABLE_FEEDBACK) {
      row.appendChild(buildFeedback(turnIndex));
    }

    chatContainer.appendChild(row);
    scrollToBottom();
  }

  // ===== Feedback =====
  function buildFeedback(turnIndex) {
    var wrap = document.createElement('div');
    wrap.className = 'ev-feedback';

    var prompt = document.createElement('div');
    prompt.className = 'ev-feedback-prompt';
    prompt.textContent = 'Please rate if this reply has helped you or not.';

    var btns = document.createElement('div');
    btns.className = 'ev-feedback-buttons';

    var btnUp = document.createElement('button');
    btnUp.className = 'ev-feedback-btn';
    btnUp.setAttribute('data-component', 'EvoconVChip type=neutral icon=mdiThumbUp label=Helpful');
    btnUp.innerHTML = ICONS.thumbUp + ' Helpful';

    var btnDown = document.createElement('button');
    btnDown.className = 'ev-feedback-btn';
    btnDown.setAttribute('data-component', 'EvoconVChip type=neutral icon=mdiThumbDown label="Not helpful"');
    btnDown.innerHTML = ICONS.thumbDown + ' Not helpful';

    btns.appendChild(btnUp);
    btns.appendChild(btnDown);

    wrap.appendChild(prompt);
    wrap.appendChild(btns);

    function showThanks() {
      wrap.innerHTML = '';
      var thanks = document.createElement('div');
      thanks.className = 'ev-feedback-thanks';
      thanks.innerHTML = ICONS.checkCircle + ' Thank you for feedback!';
      wrap.appendChild(thanks);
      setTimeout(function() {
        wrap.classList.add('ev-feedback--hidden');
      }, 2000);
    }

    btnUp.addEventListener('click', function() {
      btnUp.classList.add('ev-feedback-btn--active-up');
      btnUp.disabled = true;
      btnDown.disabled = true;
      sendFeedback(turnIndex, 'helpful', '');
      setTimeout(showThanks, 300);
    });

    var commentWrap = null;

    btnDown.addEventListener('click', function() {
      // Toggle: if already active, go back to default
      if (btnDown.classList.contains('ev-feedback-btn--active-down')) {
        btnDown.classList.remove('ev-feedback-btn--active-down');
        if (commentWrap) {
          commentWrap.remove();
          commentWrap = null;
        }
        return;
      }

      btnDown.classList.add('ev-feedback-btn--active-down');

      commentWrap = document.createElement('div');
      commentWrap.className = 'ev-feedback-comment';

      var commentRow = document.createElement('div');
      commentRow.className = 'ev-feedback-comment-row';

      var commentInput = document.createElement('input');
      commentInput.type = 'text';
      commentInput.className = 'ev-feedback-comment-input';
      commentInput.placeholder = 'Description';

      var submitBtn = document.createElement('button');
      submitBtn.className = 'ev-feedback-comment-submit';
      submitBtn.innerHTML = ICONS.check;

      commentRow.appendChild(commentInput);
      commentRow.appendChild(submitBtn);

      var hint = document.createElement('div');
      hint.className = 'ev-feedback-comment-hint';
      hint.textContent = 'What was wrong with the response?';

      commentWrap.appendChild(commentRow);
      commentWrap.appendChild(hint);
      wrap.appendChild(commentWrap);
      scrollToBottom();
      commentInput.focus();

      commentInput.addEventListener('input', function() {
        submitBtn.classList.toggle('ev-feedback-comment-submit--active', commentInput.value.trim().length > 0);
      });

      function submitComment() {
        var comment = commentInput.value.trim();
        sendFeedback(turnIndex, 'not_helpful', comment);
        showThanks();
      }

      submitBtn.addEventListener('click', submitComment);
      commentInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitComment();
        }
      });
    });

    return wrap;
  }

  function sendFeedback(turnIndex, signal, comment) {
    if (MOCK_RESPONSE) {
      console.log('[Feedback mock]', { turnIndex: turnIndex, signal: signal, comment: comment });
      return;
    }
    fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        turn_index: turnIndex,
        signal: signal,
        comment: comment
      })
    }).catch(function(e) {
      console.warn('Feedback send failed:', e);
    });
  }

  // ===== Error =====
  function renderBotError(message) {
    var row = document.createElement('div');
    row.className = 'ev-row-bot';
    var bubble = document.createElement('div');
    bubble.className = 'ev-bubble ev-bubble-bot';
    bubble.style.color = '#D32F2F';
    bubble.textContent = message;
    row.appendChild(bubble);
    chatContainer.appendChild(row);
    scrollToBottom();
  }

  // ===== API: chat =====
  async function sendMessage() {
    if (isSending) return;
    var text = inputEl.value.trim();
    if (!text) return;
    if (text.length > CHAR_LIMIT) return;

    renderUserMessage(text);
    inputEl.value = '';
    updateInputState();
    inputEl.focus();

    isSending = true;
    sendBtn.disabled = true;
    renderTyping();

    if (MOCK_RESPONSE) {
      await new Promise(function(r) { setTimeout(r, 800); });
      removeTyping();
      botTurnIndex++;
      renderBotMessage(MOCK_ANSWER, MOCK_SOURCES, botTurnIndex);
      isSending = false;
      sendBtn.disabled = false;
      return;
    }

    try {
      var res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          session_id: sessionId
        })
      });

      removeTyping();

      if (!res.ok) {
        renderBotError("Sorry, something went wrong. Please try again.");
      } else {
        var data = await res.json();
        botTurnIndex++;
        renderBotMessage(data.answer || "", data.sources || [], botTurnIndex);
      }
    } catch (e) {
      removeTyping();
      renderBotError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  // ===== Send button empty-state + char limit =====
  var hintEl = containerEl.querySelector('.ev-input-hint-text');
  var HINT_DEFAULT = hintEl ? hintEl.textContent : '';
  var CHAR_LIMIT = 1000;

  function updateInputState() {
    var len = inputEl.value.length;
    var empty = inputEl.value.trim().length === 0;
    var overLimit = len > CHAR_LIMIT;

    // Send button opacity
    if (empty || overLimit) {
      sendBtn.classList.add('ev-send--empty');
    } else {
      sendBtn.classList.remove('ev-send--empty');
    }

    // Hint text
    if (hintEl) {
      if (overLimit) {
        hintEl.textContent = 'Message too long, max ' + CHAR_LIMIT + ' characters.';
        hintEl.classList.add('ev-input-hint-text--error');
      } else {
        hintEl.textContent = HINT_DEFAULT;
        hintEl.classList.remove('ev-input-hint-text--error');
      }
    }
  }
  inputEl.addEventListener('input', updateInputState);
  sendBtn.classList.add('ev-send--empty');

  // ===== Wire up input =====
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ===== Boot =====
  renderGreeting();

  // ===== Public API =====
  this.focus = function() {
    if (!inputEl.disabled) inputEl.focus();
  };
}
