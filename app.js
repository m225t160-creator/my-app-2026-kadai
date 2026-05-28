// State Management
let memos = JSON.parse(localStorage.getItem('classroom_memos')) || [];
let currentMemoId = null;

// DOM Elements
const memoList = document.getElementById('memo-list');
const emptyState = document.getElementById('empty-state');
const editorModal = document.getElementById('editor-modal');
const memoTitleInput = document.getElementById('memo-title-input');
const memoContentInput = document.getElementById('memo-content-input');
const markdownPreview = document.getElementById('markdown-preview');
const searchInput = document.getElementById('search-input');
const newMemoBtn = document.getElementById('new-memo-btn');
const saveMemoBtn = document.getElementById('save-memo-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderMemos();
    setupEventListeners();
});

function setupEventListeners() {
    newMemoBtn.addEventListener('click', openNewMemoModal);
    closeModalBtn.addEventListener('click', closeEditorModal);
    saveMemoBtn.addEventListener('click', saveMemo);
    
    memoContentInput.addEventListener('input', updatePreview);
    searchInput.addEventListener('input', () => renderMemos(searchInput.value));

    // Close modal on click outside
    editorModal.addEventListener('click', (e) => {
        if (e.target === editorModal) closeEditorModal();
    });
}

// CRUD Operations
function renderMemos(filter = '') {
    memoList.innerHTML = '';
    
    const filteredMemos = memos
        .filter(memo => 
            memo.title.toLowerCase().includes(filter.toLowerCase()) || 
            memo.content.toLowerCase().includes(filter.toLowerCase())
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (filteredMemos.length === 0) {
        emptyState.classList.remove('hidden');
        memoList.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        memoList.classList.remove('hidden');
        
        filteredMemos.forEach(memo => {
            const card = createMemoCard(memo);
            memoList.appendChild(card);
        });
    }
    
    // Re-initialize icons for dynamic content
    if (window.lucide) {
        lucide.createIcons();
    }
}

function createMemoCard(memo) {
    const card = document.createElement('div');
    card.className = 'memo-card';
    card.draggable = true;
    card.dataset.id = memo.id;
    
    // Marked parsing for preview in card
    const previewHtml = marked.parse(memo.content.substring(0, 150) + (memo.content.length > 150 ? '...' : ''));

    card.innerHTML = `
        <div class="memo-card-header">
            <h3 class="memo-card-title">${memo.title || '無題のメモ'}</h3>
            <button class="btn-icon delete-btn" data-id="${memo.id}" title="削除">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
        <div class="memo-card-body markdown-body">
            ${previewHtml}
        </div>
        <div class="memo-card-footer">
            <span>${new Date(memo.updatedAt).toLocaleDateString()}</span>
            <i data-lucide="grip-vertical" class="grip-icon"></i>
        </div>
    `;

    // Click to edit
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn')) {
            openEditMemoModal(memo.id);
        }
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMemo(memo.id);
    });

    // Drag and Drop Events
    setupDragAndDrop(card);

    return card;
}

function openNewMemoModal() {
    currentMemoId = null;
    memoTitleInput.value = '';
    memoContentInput.value = '';
    updatePreview();
    editorModal.classList.remove('hidden');
    memoTitleInput.focus();
}

function openEditMemoModal(id) {
    const memo = memos.find(m => m.id === id);
    if (!memo) return;

    currentMemoId = id;
    memoTitleInput.value = memo.title;
    memoContentInput.value = memo.content;
    updatePreview();
    editorModal.classList.remove('hidden');
}

function closeEditorModal() {
    editorModal.classList.add('hidden');
    currentMemoId = null;
}

function saveMemo() {
    const title = memoTitleInput.value.trim();
    const content = memoContentInput.value.trim();

    if (!title && !content) return;

    const now = new Date().toISOString();

    if (currentMemoId) {
        // Update
        memos = memos.map(m => m.id === currentMemoId ? {
            ...m,
            title,
            content,
            updatedAt: now
        } : m);
    } else {
        // Create
        const newMemo = {
            id: Date.now().toString(),
            title: title || '無題のメモ',
            content,
            updatedAt: now,
            createdAt: now,
            order: memos.length
        };
        memos.push(newMemo);
    }

    persistMemos();
    renderMemos();
    closeEditorModal();
}

function deleteMemo(id) {
    if (confirm('このメモを削除してもよろしいですか？')) {
        memos = memos.filter(m => m.id !== id);
        persistMemos();
        renderMemos();
    }
}

function persistMemos() {
    localStorage.setItem('classroom_memos', JSON.stringify(memos));
}

function updatePreview() {
    const content = memoContentInput.value;
    markdownPreview.innerHTML = marked.parse(content);
}

// Phase 3: Drag and Drop Logic
let draggedItem = null;

function setupDragAndDrop(el) {
    el.addEventListener('dragstart', (e) => {
        draggedItem = el;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
        draggedItem = null;
        el.classList.remove('dragging');
        
        // Update order in state and storage
        const cards = Array.from(memoList.querySelectorAll('.memo-card'));
        const newOrder = cards.map((card, index) => {
            const memoId = card.dataset.id;
            const memo = memos.find(m => m.id === memoId);
            return { ...memo, order: index };
        });
        
        memos = newOrder;
        persistMemos();
    });

    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const target = e.target.closest('.memo-card');
        if (target && target !== draggedItem) {
            const rect = target.getBoundingClientRect();
            const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            memoList.insertBefore(draggedItem, next ? target.nextSibling : target);
        }
    });
}
