const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const splitSource = (source) => source.trim().split(/\n\s*\n/).map((text, i) => ({id:`S${i + 1}`,text}));
const audienceNames = {developer:'For developers',student:'For students',everyday:'For everyday curiosity'};
const audienceIcons = {developer:'⌘',student:'▧',everyday:'☀'};
const storageKey = 'explainlab.library.v1';
let examples = [];
let current = null;
let activeTab = 'explanation';
let selectedConcept = null;
let answers = {};
let controller = null;
let library = [];
let toastTimer;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}

function updateCount() {
  $('#char-count').textContent = `${$('#source').value.length.toLocaleString()} / 20,000`;
}

function citations(ids) {
  return `<span class="citations">${ids.map(id => `<button type="button" class="citation" data-source="${escapeHTML(id)}" aria-label="View source passage ${escapeHTML(id)}">${escapeHTML(id)}</button>`).join('')}</span>`;
}

function showView(view) {
  $('#explore-view').hidden = view !== 'explore';
  $('#library-view').hidden = view !== 'library';
  $('#nav-explore').classList.toggle('active', view === 'explore');
  $('#nav-library').classList.toggle('active', view === 'library');
  if (view === 'library') renderLibrary();
}

function loadLesson(item, setInput = true) {
  current = structuredClone(item);
  activeTab = 'explanation';
  answers = {};
  selectedConcept = item.lesson.concepts[0].id;
  if (setInput) {
    $('#source').value = item.source;
    $(`input[name="audience"][value="${item.audience}"]`).checked = true;
    updateCount();
  }
  $('#form-error').hidden = true;
  showView('explore');
  renderLesson();
}

function renderLesson() {
  if (!current) return;
  const {lesson, sample, audience} = current;
  $('#result-label').textContent = sample ? 'SAMPLE LESSON' : 'AI GENERATED';
  $('#result-label').classList.toggle('live', !sample);
  $('#result-card').innerHTML = `
    <div class="lesson-header">
      <div class="lesson-meta"><span>${escapeHTML(audienceNames[audience] || 'Your lesson')}</span><span class="divider">/</span><span>${sample ? 'Prewritten sample · no AI call' : `Generated with ${escapeHTML(current.model)}`}</span></div>
      <h3>${escapeHTML(lesson.title)}</h3>
      <p class="lesson-summary">${escapeHTML(lesson.summary)}</p>
    </div>
    <div class="result-tabs" role="tablist" aria-label="Explore lesson">
      <button type="button" id="tab-explanation" class="result-tab" role="tab" data-tab="explanation" aria-controls="lesson-panel"><span aria-hidden="true">≡</span> Explanation</button>
      <button type="button" id="tab-map" class="result-tab" role="tab" data-tab="map" aria-controls="lesson-panel"><span aria-hidden="true">⌘</span> Concept map</button>
      <button type="button" id="tab-quiz" class="result-tab" role="tab" data-tab="quiz" aria-controls="lesson-panel"><span aria-hidden="true">✓</span> Check yourself</button>
    </div>
    <div class="tab-content" id="lesson-panel" role="tabpanel" tabindex="0"></div>
    <div class="lesson-actions"><button type="button" class="secondary-button" data-action="save">＋ Save lesson</button><div class="export-actions"><button type="button" class="quiet-button" data-action="markdown" aria-label="Export lesson as Markdown">Markdown ↓</button><button type="button" class="quiet-button" data-action="json" aria-label="Export lesson as JSON">JSON ↓</button></div></div>`;
  renderPanel();
}

function renderPanel() {
  $$('.result-tab').forEach(button => {
    const selected = button.dataset.tab === activeTab;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const panel = $('#lesson-panel');
  panel.setAttribute('aria-labelledby', `tab-${activeTab}`);
  if (activeTab === 'explanation') panel.innerHTML = explanationHTML();
  if (activeTab === 'map') panel.innerHTML = mapHTML();
  if (activeTab === 'quiz') panel.innerHTML = quizHTML();
}

function explanationHTML() {
  const {lesson} = current;
  return `<div class="takeaway"><span class="card-eyebrow">A WAY TO PICTURE IT</span><p>${escapeHTML(lesson.concepts[0].analogy)}</p></div>
    <div class="content-label">LET’S BREAK IT DOWN</div>
    <div class="steps">${lesson.steps.map((step, i) => `<article class="explanation-step"><span class="step-bullet">${i + 1}</span><div><h4>${escapeHTML(step.title)}</h4><p>${escapeHTML(step.detail)} ${citations(step.sourceIds)}</p></div></article>`).join('')}</div>
    <div class="caveat"><strong>Keep in mind</strong> · ${escapeHTML(lesson.caveat)}</div>`;
}

function mapHTML() {
  const {lesson} = current;
  const concept = lesson.concepts.find(c => c.id === selectedConcept) || lesson.concepts[0];
  const titleFor = id => lesson.concepts.find(c => c.id === id)?.title || id;
  const links = lesson.connections.filter(link => link.from === concept.id || link.to === concept.id);
  return `<div class="concept-map" aria-label="Concept map"><div class="map-root">${escapeHTML(lesson.title)}</div><div class="concept-nodes">${lesson.concepts.map(c => `<button type="button" class="concept-node ${c.id === concept.id ? 'selected' : ''}" aria-pressed="${c.id === concept.id}" data-concept="${escapeHTML(c.id)}">${escapeHTML(c.title)}</button>`).join('')}</div></div>
    <div class="concept-detail"><span class="card-eyebrow">SELECT A CONCEPT TO EXPLORE</span><h4>${escapeHTML(concept.title)}</h4><p>${escapeHTML(concept.explanation)} ${citations(concept.sourceIds)}</p><div class="analogy"><strong>Picture it:</strong> ${escapeHTML(concept.analogy)}</div><div class="connection-list">${links.map(link => `<div class="connection-item"><strong>${escapeHTML(titleFor(link.from))}</strong><span>→ ${escapeHTML(link.label)} →</span><strong>${escapeHTML(titleFor(link.to))}</strong></div>`).join('')}</div></div>`;
}

function quizHTML() {
  const {quiz} = current.lesson;
  const count = Object.keys(answers).length;
  const score = quiz.reduce((total, q, i) => total + (answers[i] === q.answer ? 1 : 0), 0);
  return `<p class="quiz-intro">A quick check, just for you. Choose an answer to see why it works.</p>${quiz.map((q, i) => {
    const answered = Object.hasOwn(answers, i);
    return `<fieldset class="quiz-question"><legend>${i + 1}. ${escapeHTML(q.question)}</legend><div class="quiz-options">${q.options.map((option, j) => `<button type="button" class="quiz-option ${answered && j === q.answer ? 'correct' : answered && j === answers[i] ? 'wrong' : ''}" data-question="${i}" data-answer="${j}" ${answered ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + j)}</span><span>${escapeHTML(option)}</span>${answered && j === q.answer ? '<span aria-label="Correct answer">✓</span>' : ''}</button>`).join('')}</div>${answered ? `<p class="quiz-feedback" role="status"><strong>${answers[i] === q.answer ? 'That’s it.' : 'Good try. Here’s the idea:'}</strong> ${escapeHTML(q.explanation)} ${citations(q.sourceIds)}</p>` : ''}</fieldset>`;
  }).join('')}<div class="quiz-score"><span>${count === quiz.length ? `${score} of ${quiz.length} correct · ${score === quiz.length ? 'It clicked!' : 'Every try is progress.'}` : `${count} of ${quiz.length} answered`}</span>${count ? '<button type="button" class="quiet-button" data-action="reset-quiz">Try again ↻</button>' : ''}</div>`;
}

function openSource(id) {
  const passage = current?.paragraphs.find(p => p.id === id);
  if (!passage) return;
  $('#source-passages').innerHTML = `<article class="source-passage"><strong>${escapeHTML(passage.id)} · ORIGINAL SOURCE</strong><pre>${escapeHTML(passage.text)}</pre></article>`;
  $('#source-dialog').showModal();
}

function reportError(message) {
  $('#form-error').textContent = message;
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.textContent = 'Open model settings';
  settings.addEventListener('click', () => $('#settings-dialog').showModal());
  $('#form-error').append(settings);
  $('#form-error').hidden = false;
}

async function refreshModels() {
  const button = $('#refresh-models');
  button.disabled = true;
  $('#model-status').textContent = 'Checking your Ollama connection…';
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not check the connection.');
    const selected = $('#model-select').value;
    $('#model-select').replaceChildren();
    const models = Array.isArray(data.models) ? data.models : [];
    if (models.length) {
      for (const model of models) $('#model-select').add(new Option(model, model));
      if (models.includes(selected)) $('#model-select').value = selected;
      $('#connection-label').textContent = 'Local AI connected';
      $('#connection-dot').classList.remove('muted');
      $('#model-status').textContent = `${models.length} installed model${models.length === 1 ? '' : 's'} available. You’re ready to explain.`;
    } else {
      $('#model-select').add(new Option('No models found yet', ''));
      $('#connection-label').textContent = 'Connect local AI';
      $('#connection-dot').classList.add('muted');
      $('#model-status').textContent = data.message || 'Start Ollama and download a model, then refresh.';
    }
  } catch {
    $('#model-status').textContent = 'Could not reach the local server. Make sure ExplainLab is running, then refresh.';
    $('#connection-label').textContent = 'Connection unavailable';
    $('#connection-dot').classList.add('muted');
  } finally {
    button.disabled = false;
  }
}

async function generate(event) {
  event.preventDefault();
  if (controller) return;
  const source = $('#source').value.trim();
  if (source.length < 80) return reportError('Add a little more context: at least 80 characters of text or code.');
  const model = $('#model-select').value;
  if (!model) {
    reportError('Connect an Ollama model to explain your own material. You can also explore any of the three prewritten samples below.');
    $('#settings-dialog').showModal();
    return;
  }
  controller = new AbortController();
  const timeout = setTimeout(() => controller?.abort('timeout'), 185000);
  $('#generate-button').disabled = true;
  $('#generate-label').textContent = 'Finding the connections…';
  $('#cancel-button').hidden = false;
  $('#form-error').hidden = true;
  $('#result-label').textContent = 'GENERATING';
  $('#result-card').setAttribute('aria-busy', 'true');
  $('#result-card').innerHTML = '<div class="loading-state" role="status"><span class="loading-symbol">✳</span><h3>Making sense of it.</h3><p>Your model is connecting the ideas and building a lesson. Larger sources and models can take a few minutes.</p><div class="loading-line"></div></div>';
  $$('.example-button').forEach(b => { b.disabled = true; });
  const audience = $('input[name="audience"]:checked').value;
  try {
    const response = await fetch('/api/explain', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,audience,depth:$('#depth').value,model}),signal:controller.signal});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your model could not create a lesson.');
    loadLesson({source,audience,lesson:result.lesson,paragraphs:result.paragraphs,model:result.model,sample:false},false);
    toast('Your lesson is ready. Follow a source reference to check the explanation.');
  } catch (error) {
    const message = controller.signal.aborted ? (controller.signal.reason === 'timeout' ? 'Generation timed out. Try a shorter source or a smaller model.' : 'Generation cancelled. Your text is still here.') : error.message;
    if (current) renderLesson();
    else {
      $('#result-label').textContent = 'READY WHEN YOU ARE';
      $('#result-card').innerHTML = '<div class="empty-state"><span class="empty-spark">✳</span><h3>Let’s try again.</h3><p>Check your model connection, or explore a sample lesson.</p></div>';
    }
    reportError(message);
  } finally {
    clearTimeout(timeout);
    controller = null;
    $('#generate-button').disabled = false;
    $('#generate-label').textContent = 'Explain this';
    $('#cancel-button').hidden = true;
    $('#result-card').removeAttribute('aria-busy');
    $$('.example-button').forEach(b => { b.disabled = false; });
  }
}

function validSavedLesson(item) {
  const l = item?.lesson;
  return item && typeof item.id === 'string' && typeof item.source === 'string' && Object.hasOwn(audienceNames,item.audience) && Array.isArray(item.paragraphs) && item.paragraphs.every(p => typeof p.id === 'string' && typeof p.text === 'string') && l && typeof l.title === 'string' && typeof l.summary === 'string' && typeof l.caveat === 'string' && Array.isArray(l.concepts) && l.concepts.length && l.concepts.every(c=>typeof c.id === 'string' && typeof c.title === 'string' && typeof c.explanation === 'string' && typeof c.analogy === 'string' && Array.isArray(c.sourceIds)) && Array.isArray(l.steps) && l.steps.every(s=>typeof s.title === 'string' && typeof s.detail === 'string' && Array.isArray(s.sourceIds)) && Array.isArray(l.quiz) && l.quiz.every(q=>typeof q.question === 'string' && Array.isArray(q.options) && Number.isInteger(q.answer) && typeof q.explanation === 'string' && Array.isArray(q.sourceIds)) && Array.isArray(l.connections);
}

function readLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    library = Array.isArray(parsed) ? parsed.filter(validSavedLesson).slice(0, 50) : [];
  } catch { library = []; }
  $('#library-count').textContent = library.length;
}

function saveLesson() {
  if (!current) return;
  if (library.some(item => item.source === current.source && item.lesson.title === current.lesson.title && JSON.stringify(item.lesson) === JSON.stringify(current.lesson))) return toast('This lesson is already in your library.');
  if (library.length >= 50) return toast('Your library has 50 lessons. Export and remove a lesson to make room.');
  const item = {...structuredClone(current),id:crypto.randomUUID(),savedAt:new Date().toISOString()};
  const next = [item,...library];
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    library = next;
    $('#library-count').textContent = library.length;
    toast('Saved in this browser. Export a copy to keep it elsewhere.');
  } catch { toast('Browser storage is full or unavailable. Export your lesson instead.'); }
}

function renderLibrary() {
  if (!library.length) {
    $('#library-list').innerHTML = '<div class="library-empty"><span class="empty-spark">▤</span><h3>Keep your lightbulb moments.</h3><p>Save a lesson from the workspace and find it here next time.</p><button type="button" class="primary-button" data-action="explore">Explore a lesson →</button></div>';
    return;
  }
  $('#library-list').innerHTML = library.map(item => `<article class="library-card"><small>${item.sample ? 'PREWRITTEN SAMPLE' : 'AI GENERATED'} · ${escapeHTML(audienceNames[item.audience])}</small><h3>${escapeHTML(item.lesson.title)}</h3><p>${escapeHTML(item.lesson.summary.slice(0,190))}${item.lesson.summary.length > 190 ? '…' : ''}</p><div class="library-actions"><button type="button" class="secondary-button" data-open-lesson="${escapeHTML(item.id)}">Open lesson →</button><button type="button" class="quiet-button" data-remove-lesson="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.lesson.title)} from library">Remove</button></div></article>`).join('');
}

function removeLesson(id) {
  const item = library.find(entry => entry.id === id);
  if (!item || !confirm(`Remove “${item.lesson.title}” from this browser’s library?`)) return;
  const next = library.filter(entry => entry.id !== id);
  try {
    localStorage.setItem(storageKey,JSON.stringify(next));
    library = next;
    $('#library-count').textContent = library.length;
    renderLibrary();
    toast('Lesson removed from this browser.');
  } catch { toast('Could not update browser storage.'); }
}

const md = (text) => String(text).replace(/[\\`*_[\]<>#]/g, '\\$&');
function exportLesson(format) {
  if (!current) return;
  const {lesson,paragraphs,sample,model} = current;
  const refs = ids => ids.map(id => `[${id}](#${id.toLowerCase()})`).join(' ');
  const lines = [`# ${md(lesson.title)}`,'',sample ? '> Prewritten sample lesson. No AI generation was performed.' : `> AI generated with ${md(model)}. Source references are traceability, not proof of correctness.`,'',md(lesson.summary),'','## Explanation','',...lesson.steps.flatMap((s,i)=>[`### ${i+1}. ${md(s.title)}`,'',`${md(s.detail)} ${refs(s.sourceIds)}`,'']),'## Concepts','',...lesson.concepts.flatMap(c=>[`### ${md(c.title)}`,'',`${md(c.explanation)} ${refs(c.sourceIds)}`,'',`**Analogy:** ${md(c.analogy)}`,'']),'## Connections','',...lesson.connections.map(c=>`- ${md(lesson.concepts.find(n=>n.id===c.from)?.title || c.from)} → ${md(c.label)} → ${md(lesson.concepts.find(n=>n.id===c.to)?.title || c.to)}`),'','## Check yourself','',...lesson.quiz.flatMap((q,i)=>[`### ${i+1}. ${md(q.question)}`,'',...q.options.map((option,j)=>`${String.fromCharCode(65+j)}. ${md(option)}`),'',`**Answer: ${String.fromCharCode(65+q.answer)}.** ${md(q.explanation)} ${refs(q.sourceIds)}`,'']),'## Keep in mind','',md(lesson.caveat),'','## Original source','',...paragraphs.flatMap(p=>[`### ${p.id}`,'',...p.text.split('\n').map(line=>`    ${line}`),''])];
  const content = format === 'json' ? JSON.stringify({format:'explainlab',version:1,...current},null,2) : lines.join('\n');
  const blob = new Blob([content],{type:format === 'json' ? 'application/json' : 'text/markdown;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${lesson.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70).replace(/^-|-$/g,'') || 'explainlab-lesson'}.${format === 'json' ? 'json' : 'md'}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Exported with the original source and quiz answers.');
}

$('#source').addEventListener('input',updateCount);
$('#clear-source').addEventListener('click',() => { $('#source').value = ''; updateCount(); $('#source').focus(); });
$('#explain-form').addEventListener('submit',generate);
$('#cancel-button').addEventListener('click',() => controller?.abort('cancelled'));
$('#connection-button').addEventListener('click',() => { $('#settings-dialog').showModal(); refreshModels(); });
$('#refresh-models').addEventListener('click',refreshModels);
$('#help-button').addEventListener('click',() => $('#help-dialog').showModal());
$('#nav-explore').addEventListener('click',() => showView('explore'));
$('#nav-library').addEventListener('click',() => showView('library'));
$$('[data-close]').forEach(button => button.addEventListener('click',() => document.getElementById(button.dataset.close).close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));

$('#result-card').addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.tab) { activeTab = button.dataset.tab; renderPanel(); }
  if (button.dataset.source) openSource(button.dataset.source);
  if (button.dataset.concept) { selectedConcept = button.dataset.concept; renderPanel(); $(`[data-concept="${CSS.escape(selectedConcept)}"]`)?.focus(); }
  if (button.dataset.question !== undefined) {
    answers[Number(button.dataset.question)] = Number(button.dataset.answer);
    renderPanel();
  }
  if (button.dataset.action === 'save') saveLesson();
  if (button.dataset.action === 'markdown') exportLesson('markdown');
  if (button.dataset.action === 'json') exportLesson('json');
  if (button.dataset.action === 'reset-quiz') { answers = {}; renderPanel(); $('#lesson-panel').focus(); }
});
$('#result-card').addEventListener('keydown',event => {
  if (!event.target.matches('[role="tab"]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = ['explanation','map','quiz'];
  const index = tabs.indexOf(activeTab);
  activeTab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[2] : tabs[(index+(event.key === 'ArrowRight' ? 1 : 2)) % 3];
  renderPanel();
  $(`[data-tab="${activeTab}"]`).focus();
});
$('#library-list').addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'explore') showView('explore');
  if (button.dataset.openLesson) {
    const item = library.find(entry => entry.id === button.dataset.openLesson);
    if (item) loadLesson(item);
  }
  if (button.dataset.removeLesson) removeLesson(button.dataset.removeLesson);
});
window.addEventListener('storage',event => { if (event.key === storageKey) { readLibrary(); renderLibrary(); } });

async function init() {
  readLibrary();
  refreshModels();
  try {
    const response = await fetch('/api/examples');
    if (!response.ok) throw new Error('Samples unavailable');
    examples = await response.json();
    $('#example-list').innerHTML = examples.map(example => `<button class="example-button" type="button" data-example="${escapeHTML(example.id)}"><span class="example-icon" aria-hidden="true">${audienceIcons[example.audience] || '✳'}</span><span class="example-copy"><strong>${escapeHTML(example.title)}</strong><small>${escapeHTML(example.description)}</small></span><span class="example-arrow" aria-hidden="true">↗</span></button>`).join('');
    $('#example-list').addEventListener('click',event => {
      const button = event.target.closest('[data-example]');
      if (!button || controller) return;
      const item = examples.find(example => example.id === button.dataset.example);
      if (item) { loadLesson({...item,paragraphs:splitSource(item.source),sample:true,model:'prewritten sample'}); toast('Loaded a prewritten sample. No AI call was made.'); }
    });
    if (examples[0]) loadLesson({...examples[0],paragraphs:splitSource(examples[0].source),sample:true,model:'prewritten sample'});
  } catch {
    $('#example-list').textContent = 'Samples could not load. Restart the server and refresh the page.';
  }
}
init();
