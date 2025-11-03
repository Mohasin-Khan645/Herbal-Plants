const historyEl = document.getElementById('chatHistory');
const inputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearChat');
const suggBtn = document.getElementById('suggestionsBtn');
const suggBox = document.getElementById('quickSuggestions');
const voiceBtn = document.getElementById('voiceBtn');

// Using geminiText from utils.js

// ====== Chat Functions ======
function loadChat(){
  try {
    const arr = JSON.parse(localStorage.getItem(HG_STORAGE_KEYS.chat)||'[]');
    arr.forEach(m=>appendMsg(m.role,m.content,false));
  } catch {}
  const pre = new URLSearchParams(location.search).get('prefill');
  if (pre) inputEl.value = pre;
}

function saveMsg(role, content){
  const arr = JSON.parse(localStorage.getItem(HG_STORAGE_KEYS.chat)||'[]');
  arr.push({role, content, ts: Date.now()});
  localStorage.setItem(HG_STORAGE_KEYS.chat, JSON.stringify(arr.slice(-100)));
}

function appendMsg(role, content, save=true){
  const div = document.createElement('div');
  div.className = 'msg ' + (role==='user'?'user':'bot');
  div.innerHTML = content.replace(/\n/g,'<br>');
  historyEl.appendChild(div);
  historyEl.scrollTop = historyEl.scrollHeight;
  if (save) saveMsg(role, content);
}

// Typing animation
function showTyping() {
  const typing = document.createElement('div');
  typing.className = 'msg bot typing';
  typing.textContent = 'AI is thinking';
  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    typing.textContent = 'AI is thinking' + '.'.repeat(dots);
  }, 400);
  historyEl.appendChild(typing);
  historyEl.scrollTop = historyEl.scrollHeight;
  return { typing, interval };
}

async function ask(){
  const prompt = inputEl.value.trim();
  if (!prompt) return;
  appendMsg('user', prompt);
  inputEl.value = '';
  
  const { typing, interval } = showTyping();
  
  try {
    const ai = await geminiText(prompt);
    clearInterval(interval);
    typing.remove();
    appendMsg('bot', ai || 'No response.');
  } catch (err) {
    clearInterval(interval);
    typing.remove();
    appendMsg('bot', 'Sorry, AI service unavailable. Check your internet or API key.');
  }
}

function bind(){
  sendBtn.addEventListener('click', ask);
  inputEl.addEventListener('keydown', e=>{ if (e.key==='Enter') ask(); });
  clearBtn.addEventListener('click', ()=>{
    localStorage.removeItem(HG_STORAGE_KEYS.chat);
    historyEl.innerHTML = '';
  });
  suggBtn.addEventListener('click', ()=>{ suggBox.classList.toggle('d-none'); });
  suggBox.addEventListener('click', (e)=>{
    if (e.target.matches('button')) {
      inputEl.value = e.target.textContent;
      suggBox.classList.add('d-none');
      inputEl.focus();
    }
  });
  setupVoiceInput(inputEl, voiceBtn, null);
}

document.addEventListener('DOMContentLoaded', ()=>{
  bind();
  loadChat();
});
