// Simple localStorage-backed notes app
const KEY = 'simple_notes_v1';
let notes = [];
let editingId = null;

// DOM
const tabEdit = document.getElementById('tab-edit');
const tabList = document.getElementById('tab-list');
const viewEditor = document.getElementById('view-editor');
const viewList = document.getElementById('view-list');
const titleInput = document.getElementById('note-title');
const bodyInput = document.getElementById('note-body');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const notesContainer = document.getElementById('notesContainer');
const emptyMsg = document.getElementById('emptyMsg');
const noteCount = document.getElementById('noteCount');
const searchInput = document.getElementById('searchInput');
const clearAll = document.getElementById('clearAll');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const btnH1 = document.getElementById('btnH1');
const btnH2 = document.getElementById('btnH2');
const btnH3 = document.getElementById('btnH3');
const btnBold = document.getElementById('btnBold');
const btnItalic = document.getElementById('btnItalic');
const btnUnderline = document.getElementById('btnUnderline');
const btnImage = document.getElementById('btnImage');
const imgInput = document.getElementById('imgInput');
const colorInput = document.getElementById('colorInput');
const btnColor = document.getElementById('btnColor');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const exportDocx = document.getElementById('export-docx');
const exportPdf = document.getElementById('export-pdf');
const openFileBtn = document.getElementById('open-file-btn');
const fileInput = document.getElementById('file-input');

// Helpers for file interoperability
function sanitizeFileName(name){
  if(!name) return 'untitled';
  return name
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'untitled';
}

function extractStyleValue(styleString, property){
  if(!styleString) return '';
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
  const match = styleString.match(regex);
  return match ? match[1].trim() : '';
}

function unwrapElement(el){
  if(!el || !el.parentNode) return;
  while(el.firstChild){
    el.parentNode.insertBefore(el.firstChild, el);
  }
  el.parentNode.removeChild(el);
}

function normalizeHtmlContent(sourceHtml){
  const temp = document.createElement('div');
  temp.innerHTML = sourceHtml || '';

  // Remove unwanted tags
  temp.querySelectorAll('script, style, iframe, object, embed').forEach(node => node.remove());

  // Flatten resizable image containers into plain <img>
  temp.querySelectorAll('div[style*="resize"][style*="overflow"]').forEach(wrapper => {
    const img = wrapper.querySelector('img');
    if(img){
      const wrapperStyle = wrapper.getAttribute('style') || '';
      const width = extractStyleValue(wrapperStyle, 'width') || img.style.width || '';
      const height = extractStyleValue(wrapperStyle, 'height') || img.style.height || '';
      if(width) img.style.width = width;
      if(height) img.style.height = height;
      img.style.maxWidth = '100%';
      if(!height) img.style.height = 'auto';
      wrapper.replaceWith(img);
    } else {
      unwrapElement(wrapper);
    }
  });

  // Convert generic div wrappers to paragraphs when safe to do so
  temp.querySelectorAll('div').forEach(div => {
    if(div.querySelector('table, ul, ol, pre, blockquote, figure, img, video, iframe, code, div')) return;
    const replacement = document.createElement('p');
    replacement.innerHTML = div.innerHTML;
    div.replaceWith(replacement);
  });

  // Ensure top-level stray text nodes are wrapped in paragraphs
  Array.from(temp.childNodes).forEach(node => {
    if(node.nodeType === Node.TEXT_NODE && node.textContent.trim()){
      const p = document.createElement('p');
      p.textContent = node.textContent.trim();
      temp.replaceChild(p, node);
    }
  });

  // Clean empty paragraphs (keep intentional blank lines via <br>)
  temp.querySelectorAll('p').forEach(p => {
    const content = p.innerHTML.replace(/&nbsp;/g, '').trim();
    if(!content || content === '<br>' || content === '<br/>'){
      p.innerHTML = '<br>';
    }
  });

  return temp.innerHTML.trim();
}

function applyDefaultTextStyles(html){
  const temp = document.createElement('div');
  temp.innerHTML = html || '';

  temp.querySelectorAll('h1').forEach(h => {
    if(!h.style.fontSize) h.style.fontSize = '28px';
    if(!h.style.fontWeight) h.style.fontWeight = '700';
    if(!h.style.margin) h.style.margin = '20px 0 15px';
    if(!h.style.color) h.style.color = '#333333';
  });
  temp.querySelectorAll('h2').forEach(h => {
    if(!h.style.fontSize) h.style.fontSize = '22px';
    if(!h.style.fontWeight) h.style.fontWeight = '700';
    if(!h.style.margin) h.style.margin = '18px 0 12px';
    if(!h.style.color) h.style.color = '#444444';
  });
  temp.querySelectorAll('h3').forEach(h => {
    if(!h.style.fontSize) h.style.fontSize = '18px';
    if(!h.style.fontWeight) h.style.fontWeight = '700';
    if(!h.style.margin) h.style.margin = '16px 0 10px';
    if(!h.style.color) h.style.color = '#555555';
  });
  temp.querySelectorAll('p').forEach(p => {
    if(!p.style.margin) p.style.margin = '10px 0';
    if(!p.style.lineHeight) p.style.lineHeight = '1.6';
  });
  temp.querySelectorAll('ul, ol').forEach(list => {
    if(!list.style.margin) list.style.margin = '12px 0 12px 24px';
    if(!list.style.padding) list.style.padding = '0 0 0 16px';
  });
  temp.querySelectorAll('li').forEach(li => {
    if(!li.style.margin) li.style.margin = '4px 0';
  });

  return temp.innerHTML.trim();
}

function getPreparedBodyHtml(){
  const rawHtml = bodyInput ? bodyInput.innerHTML : '';
  return normalizeHtmlContent(rawHtml);
}

function applyImportedHtml(html){
  const normalized = normalizeHtmlContent(html);
  bodyInput.innerHTML = normalized || '';
  bodyInput.focus();
  editingId = null;
}

// init
function load(){
  try{ notes = JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch(e){ notes = []; }
  renderNotesList();
  updateCount();
}

function saveToStorage(){ localStorage.setItem(KEY, JSON.stringify(notes)); }

function makeId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function saveNote(){
  const title = titleInput.value.trim();
  const body = (bodyInput.innerHTML || '').trim();
  if(!title && !body){ alert('Please write something before saving 🙂'); return }
  if(editingId){
    const i = notes.findIndex(n => n.id === editingId);
    if(i>-1){ notes[i].title = title; notes[i].body = body; notes[i].updated = Date.now(); }
  } else {
    notes.unshift({ id: makeId(), title, body, created: Date.now(), updated: Date.now(), pinned:false });
  }
  saveToStorage();
  renderNotesList();
  updateCount();
  // reset editor
  titleInput.value = '';
  bodyInput.innerHTML = '';
  editingId = null;
  tabList.click(); // show saved notes after save
}

// Auto-save function (saves silently without alerts or tab switching)
function autoSaveNote(){
  const title = titleInput.value.trim();
  const body = (bodyInput.innerHTML || '').trim();
  if(!title && !body) return; // Don't save empty notes
  if(editingId){
    const i = notes.findIndex(n => n.id === editingId);
    if(i>-1){ notes[i].title = title; notes[i].body = body; notes[i].updated = Date.now(); saveToStorage(); }
  } else {
    notes.unshift({ id: makeId(), title, body, created: Date.now(), updated: Date.now(), pinned:false });
    saveToStorage();
    // Update UI silently
    renderNotesList();
    updateCount();
  }
}

function renderNotesList(filter=''){
  notesContainer.innerHTML = '';
  const f = filter.toLowerCase().trim();
  const list = notes
    .filter(n => {
      if(!f) return true;
      return (n.title||'').toLowerCase().includes(f) || (n.body||'').toLowerCase().includes(f);
    })
    .sort((a,b)=> (b.pinned===true) - (a.pinned===true) || (b.updated||0) - (a.updated||0));
  if(list.length===0){ emptyMsg.style.display='block'; } else { emptyMsg.style.display='none'; }
  list.forEach(n => {
    const card = document.createElement('div'); card.className='note-card';
    const meta = document.createElement('div'); meta.className='note-meta';
    const t = document.createElement('div'); t.className='note-title'; t.textContent = n.title || '(No title)';
    const s = document.createElement('div'); s.className='note-time'; s.textContent = new Date(n.updated || n.created).toLocaleString();
    meta.appendChild(t); meta.appendChild(s);
    const actions = document.createElement('div'); actions.className='note-actions';
    const pinBtn = document.createElement('button'); pinBtn.className='icon-btn icon-glass'; pinBtn.title='Pin / Unpin'; pinBtn.innerHTML = n.pinned ? '<ion-icon name="pin"></ion-icon>' : '<ion-icon name="pin-outline"></ion-icon>';
    pinBtn.onclick = (e)=>{ e.stopPropagation(); togglePin(n.id); };
    const openBtn = document.createElement('button'); openBtn.className='icon-btn icon-glass'; openBtn.title='Open to edit'; openBtn.innerHTML='<ion-icon name="create-outline"></ion-icon>';
    openBtn.onclick = (e)=>{ e.stopPropagation(); openNote(n.id); }
    const delBtn = document.createElement('button'); delBtn.className='icon-btn icon-glass'; delBtn.title='Delete'; delBtn.innerHTML='<ion-icon name="trash-outline"></ion-icon>';
    delBtn.onclick = (e)=>{ e.stopPropagation(); if(confirm('Delete this note?')){ deleteNote(n.id); } }
    actions.appendChild(pinBtn); actions.appendChild(openBtn); actions.appendChild(delBtn);
    card.appendChild(meta); card.appendChild(actions);
    card.onclick = ()=>{ openNote(n.id); }
    notesContainer.appendChild(card);
  });
}

function openNote(id){
  const n = notes.find(x=>x.id===id); if(!n) return;
  editingId = id;
  titleInput.value = n.title; bodyInput.innerHTML = n.body;
  showEditor();
}

function deleteNote(id){ notes = notes.filter(n=>n.id!==id); saveToStorage(); renderNotesList(); updateCount(); }

function clearEditor(){ editingId=null; titleInput.value=''; bodyInput.innerHTML=''; }

function updateCount(){ noteCount.textContent = notes.length ? `${notes.length} notes` : 'No notes yet'; }

// tabs
tabEdit.addEventListener('click', ()=>{ tabEdit.classList.add('active'); tabEdit.setAttribute('aria-pressed','true'); tabList.classList.remove('active'); tabList.setAttribute('aria-pressed','false'); showEditor(); });
tabList.addEventListener('click', ()=>{ tabList.classList.add('active'); tabList.setAttribute('aria-pressed','true'); tabEdit.classList.remove('active'); tabEdit.setAttribute('aria-pressed','false'); showList(); });

function showEditor(){ viewEditor.style.display='flex'; viewEditor.setAttribute('aria-hidden','false'); viewList.style.display='none'; viewList.setAttribute('aria-hidden','true'); titleInput.focus(); }
function showList(){ viewEditor.style.display='none'; viewEditor.setAttribute('aria-hidden','true'); viewList.style.display='flex'; viewList.setAttribute('aria-hidden','false'); searchInput.focus(); }

// events
saveBtn.addEventListener('click', saveNote);
clearBtn.addEventListener('click', ()=>{ if(confirm('Clear will discard current content?')) clearEditor(); });
searchInput.addEventListener('input', ()=>{ renderNotesList(searchInput.value); });
clearAll.addEventListener('click', ()=>{ if(confirm('Clear all notes?')){ notes=[]; saveToStorage(); renderNotesList(); updateCount(); } });

// theme toggle with persistence
const THEME_KEY = 'simple_notes_theme';
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  if(themeIcon){ themeIcon.setAttribute('name', theme==='dark' ? 'sunny-outline' : 'moon-outline'); }
}
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);
if(themeToggle){ themeToggle.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}); }

// rich text commands
function exec(cmd){ document.execCommand(cmd, false, null); bodyInput.focus(); }
function formatHeading(level){
  bodyInput.focus();
  const sel = window.getSelection();
  if(sel.rangeCount === 0) {
    // Create a range at the current cursor position
    const range = document.createRange();
    range.selectNodeContents(bodyInput);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();
  
  // Find the current block element (paragraph, heading, div, etc.)
  let container = range.commonAncestorContainer;
  if(container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }
  
  // Find the block-level parent
  let blockElement = container;
  while(blockElement && blockElement !== bodyInput) {
    const tagName = blockElement.tagName ? blockElement.tagName.toLowerCase() : '';
    if(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(tagName)) {
      break;
    }
    blockElement = blockElement.parentElement;
  }
  
  // If we have selected text
  if(selectedText.trim()) {
    // Extract the selected text and surrounding context
    const heading = document.createElement(`h${level}`);
    heading.textContent = selectedText.trim();
    
    // Replace the selected content with the heading
    range.deleteContents();
    range.insertNode(heading);
    
    // Add a new paragraph after the heading if needed
    const nextSibling = heading.nextSibling;
    if(!nextSibling || (nextSibling.nodeType === Node.TEXT_NODE && !nextSibling.textContent.trim())) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      heading.parentNode.insertBefore(p, heading.nextSibling);
    }
    
    // Move cursor after the heading
    const newRange = document.createRange();
    newRange.setStartAfter(heading);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    // No selection - convert current block to heading
    if(blockElement && blockElement !== bodyInput && blockElement.parentElement === bodyInput) {
      // We're in a block element, convert it to heading
      const text = blockElement.textContent || '';
      const heading = document.createElement(`h${level}`);
      heading.textContent = text.trim() || '';
      if(!text.trim()) {
        heading.innerHTML = '<br>';
      }
      
      blockElement.parentNode.replaceChild(heading, blockElement);
      
      // Move cursor inside the heading
      const newRange = document.createRange();
      if(heading.firstChild) {
        if(heading.firstChild.nodeType === Node.TEXT_NODE) {
          newRange.setStart(heading.firstChild, heading.firstChild.textContent.length);
        } else {
          newRange.setStart(heading, 0);
        }
      } else {
        newRange.setStart(heading, 0);
      }
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      // Create a new heading at cursor position
      const heading = document.createElement(`h${level}`);
      heading.innerHTML = '<br>';
      
      // Insert the heading
      range.deleteContents();
      range.insertNode(heading);
      
      // Move cursor inside the heading
      const newRange = document.createRange();
      newRange.setStart(heading, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
  
  bodyInput.focus();
}

if(btnH1) btnH1.addEventListener('click', ()=> formatHeading(1));
if(btnH2) btnH2.addEventListener('click', ()=> formatHeading(2));
if(btnH3) btnH3.addEventListener('click', ()=> formatHeading(3));
if(btnBold) btnBold.addEventListener('click', ()=> exec('bold'));
if(btnItalic) btnItalic.addEventListener('click', ()=> exec('italic'));
if(btnUnderline) btnUnderline.addEventListener('click', ()=> exec('underline'));
if(btnImage) btnImage.addEventListener('click', ()=> imgInput && imgInput.click());

// Color picker functionality
if(btnColor) btnColor.addEventListener('click', ()=> colorInput && colorInput.click());
if(colorInput) colorInput.addEventListener('change', (e)=>{
  const color = e.target.value;
  document.execCommand('foreColor', false, color);
  bodyInput.focus();
});

if(imgInput) imgInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    const url = reader.result;
    
    // Create resizable container div
    const container = document.createElement('div');
    container.style.cssText = 'display:inline-block; resize: both; overflow: hidden; border: 1px dashed gray; width: 300px; height: 200px; min-width: 100px; min-height: 100px; max-width: 100%; margin: 5px; position: relative;';
    
    // Create image element
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'width:100%; height:100%; object-fit:contain; display: block; transition: transform 0.1s ease;';
    img.alt = 'Inserted image';
    
    // Add mobile pinch-to-zoom functionality
    let startDistance = 0;
    let currentScale = 1;
    let isZooming = false;
    
    // Prevent default touch behaviors that might interfere
    img.addEventListener("touchstart", e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        isZooming = true;
        startDistance = getDistance(e.touches);
        img.style.transition = 'none'; // Remove transition during zoom
      }
    }, { passive: false });

    img.addEventListener("touchmove", e => {
      if (e.touches.length === 2 && isZooming) {
        e.preventDefault();
        e.stopPropagation();
        let newDistance = getDistance(e.touches);
        let scale = (newDistance / startDistance) * currentScale;
        // Limit scale between 0.5 and 3
        scale = Math.max(0.5, Math.min(3, scale));
        img.style.transform = `scale(${scale})`;
      }
    }, { passive: false });

    img.addEventListener("touchend", e => {
      if (isZooming) {
        e.preventDefault();
        e.stopPropagation();
        isZooming = false;
        img.style.transition = 'transform 0.1s ease'; // Restore transition
        
        // Update current scale when touch ends
        const transform = img.style.transform;
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
          currentScale = parseFloat(scaleMatch[1]);
        }
      }
    }, { passive: false });

    // Add double tap to reset zoom
    let lastTap = 0;
    img.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0 && e.touches.length === 0) {
        // Double tap detected - reset zoom
        currentScale = 1;
        img.style.transform = 'scale(1)';
        img.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
          img.style.transition = 'transform 0.1s ease';
        }, 300);
      }
      lastTap = currentTime;
    });

    function getDistance(touches) {
      let dx = touches[0].clientX - touches[1].clientX;
      let dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Add image to container
    container.appendChild(img);
    
    const sel = window.getSelection();
    if(sel && sel.rangeCount){
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(container);
      // Move cursor after the inserted container
      range.setStartAfter(container);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      bodyInput.appendChild(container);
    }
    
    bodyInput.focus();
  };
  reader.readAsDataURL(file);
  e.target.value='';
});

// pin feature
function togglePin(id){
  const i = notes.findIndex(n=>n.id===id);
  if(i>-1){ notes[i].pinned = !notes[i].pinned; notes[i].updated = Date.now(); saveToStorage(); renderNotesList(searchInput.value||''); }
}

// keyboard shortcut save
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){
    e.preventDefault(); saveNote();
  }
});

// Auto-save when user leaves the app
window.addEventListener('beforeunload', (e)=>{
  autoSaveNote();
});

// Auto-save when tab becomes hidden (user switches tabs or minimizes)
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    autoSaveNote();
  }
});

// Auto-save when page is about to be unloaded (additional safety)
window.addEventListener('pagehide', ()=>{
  autoSaveNote();
});

// initialize
load();

// Export functionality
if(exportBtn && exportMenu) {
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
      exportMenu.classList.remove('show');
    }
  });
}

// Export options
if(exportDocx) {
  exportDocx.addEventListener('click', () => {
    exportMenu.classList.remove('show');
    exportToDocx();
  });
}

if(exportPdf) {
  exportPdf.addEventListener('click', () => {
    exportMenu.classList.remove('show');
    exportToPdf();
  });
}

// Export functions (placeholder implementations)
function exportToDocx() {
  const title = titleInput.value.trim();
  const preparedBody = getPreparedBodyHtml();
  const styledBody = applyDefaultTextStyles(preparedBody);
  const safeTitle = sanitizeFileName(title || 'untitled');
  
  if (!title && !preparedBody) {
    alert('No content to export. Please write something first.');
    return;
  }
  
  // Create HTML content for DOCX export with proper heading styles
  const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        h1 { font-size: 24px; font-weight: bold; margin: 20px 0 15px 0; color: #333; }
        h2 { font-size: 20px; font-weight: bold; margin: 18px 0 12px 0; color: #444; }
        h3 { font-size: 16px; font-weight: bold; margin: 16px 0 10px 0; color: #555; }
        p { margin: 10px 0; }
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #333;">${title || 'Untitled'}</h1>
      ${styledBody}
    </body>
    </html>
  `;
  
  try {
    const converted = window.htmlDocx.asBlob(htmlContent);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(converted);
    link.download = `${safeTitle}-${new Date().toISOString().slice(0,10)}.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting DOCX:', error);
    alert('Error exporting to DOCX. Please try again.');
  }
}

function exportToPdf() {
  const title = titleInput.value.trim();
  const preparedBody = getPreparedBodyHtml();
  const styledBody = applyDefaultTextStyles(preparedBody);
  const safeTitle = sanitizeFileName(title || 'untitled');
  
  if (!title && !preparedBody) {
    alert('No content to export. Please write something first.');
    return;
  }
  
  // Create HTML content for PDF export with proper heading styles and forced white background
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background-color: white; color: black;">
      <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #333; background-color: white;">${title || 'Untitled'}</h1>
      <div style="line-height: 1.6; font-size: 14px; color: black; background-color: white;">
        ${styledBody}
      </div>
    </div>
  `;
  
  // Use html2pdf to generate and download PDF with white background
  const filename = `${safeTitle}-${new Date().toISOString().slice(0,10)}.pdf`;
  const options = {
    margin: 1,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      backgroundColor: '#ffffff', // Force white background
      useCORS: true
    },
    jsPDF: { 
      unit: 'in', 
      format: 'letter', 
      orientation: 'portrait' 
    }
  };
  
  html2pdf().set(options).from(content).save();
}

// Open File functionality
if(openFileBtn && fileInput) {
  openFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', function(event) {
    const file = this.files[0];
    if (!file) return;

    const extension = (file.name.split('.').pop() || '').toLowerCase();

    if(extension === 'doc'){
      alert('Legacy .doc files are not supported yet. Please convert them to .docx before importing.');
      this.value = '';
      return;
    }

    if(extension !== 'docx'){
      alert('Unsupported file format. Please choose a DOCX file.');
      this.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function(loadEvent) {
      const arrayBuffer = loadEvent.target.result;
      mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.inline(function(element) {
            return element.read('base64').then(function(imageBuffer) {
              return {
                src: `data:${element.contentType};base64,${imageBuffer}`
              };
            });
          }),
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
            "p[style-name='Quote'] => blockquote:fresh"
          ]
        }
      )
        .then(function(result) {
          applyImportedHtml(result.value);
          const fileName = file.name.replace(/\.(docx)$/i, '');
          if(!titleInput.value.trim()){
            titleInput.value = fileName;
          }
          showEditor(); // Switch to editor view
          if(result.messages && result.messages.length){
            console.warn('DOCX import messages:', result.messages);
          }
          alert('File loaded successfully!');
        })
        .catch(function(error){
          console.error('Error importing DOCX:', error);
          alert('Unable to import this DOCX file. Please verify the file is not corrupted.');
        });
    };
    reader.onerror = function(){
      alert('Unable to read the selected file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
    
    event.target.value = ''; // Clear the file input
  });
}

// Accessibility: if empty and on mobile, focus editor by default
window.matchMedia('(max-width:767px)').matches ? showEditor() : showEditor();


