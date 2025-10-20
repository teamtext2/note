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
const savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
if(themeToggle){ themeToggle.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}); }

// rich text commands
function exec(cmd){ document.execCommand(cmd, false, null); bodyInput.focus(); }
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
  const body = (bodyInput.innerHTML || '').trim();
  
  if (!title && !body) {
    alert('No content to export. Please write something first.');
    return;
  }
  
  // Create HTML content for DOCX export
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #333;">${title || 'Untitled'}</h2>
      <div style="line-height: 1.6; font-size: 14px;">
        ${body}
      </div>
    </div>
  `;
  
  try {
    const converted = window.htmlDocx.asBlob(htmlContent);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(converted);
    link.download = `${title || 'untitled'}-${new Date().toISOString().slice(0,10)}.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error exporting DOCX:', error);
    alert('Error exporting to DOCX. Please try again.');
  }
}

function exportToPdf() {
  const title = titleInput.value.trim();
  const body = (bodyInput.innerHTML || '').trim();
  
  if (!title && !body) {
    alert('No content to export. Please write something first.');
    return;
  }
  
  // Create HTML content for PDF export with forced white background and black text
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background-color: white; color: black;">
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #333; background-color: white;">${title || 'Untitled'}</div>
      <div style="line-height: 1.6; font-size: 14px; color: black; background-color: white;">${body}</div>
    </div>
  `;
  
  // Use html2pdf to generate and download PDF with white background
  const filename = `${title || 'untitled'}-${new Date().toISOString().slice(0,10)}.pdf`;
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

    const reader = new FileReader();
    reader.onload = function(event) {
      const arrayBuffer = event.target.result;
      mammoth.convertToHtml({arrayBuffer: arrayBuffer})
        .then(function(result) {
          bodyInput.innerHTML = result.value; // đưa nội dung vào editor
          // Set filename (without extension) as title
          const fileName = file.name.replace(/\.(docx|doc)$/i, "");
          titleInput.value = fileName;
          showEditor(); // Switch to editor view
          alert('File loaded successfully!');
        })
        .catch(console.error);
    };
    reader.readAsArrayBuffer(file);
    
    event.target.value = ''; // Clear the file input
  });
}

// Accessibility: if empty and on mobile, focus editor by default
window.matchMedia('(max-width:767px)').matches ? showEditor() : showEditor();