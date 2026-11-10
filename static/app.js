// State management
let state = {
    template: "",
    settings: {
        header_format: "{code} + \n",
        story_format: "\n{story}",
        auto_clean_ads: true
    },
    inputMode: "bulk", // 'bulk' or 'table'
    tableRows: [
        { code: "TRUYEN01", url: "https://dtruyen.com/nang-dau-cuc-pham/" },
        { code: "TRUYEN02", url: "https://dtruyen.com/nguoi-tinh-be-nho-cua-tong-tai/" }
    ],
    items: [],
    isProcessing: false
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
    await fetchTemplateAndSettings();
    renderTableRows();
});

// Toast notification helper
function showToast(message, isError = false) {
    const toast = document.getElementById("toastNotification");
    const toastMsg = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    toastMsg.textContent = message;
    if (isError) {
        toastIcon.setAttribute("data-lucide", "alert-circle");
        toastIcon.className = "w-4 h-4 text-rose-400";
    } else {
        toastIcon.setAttribute("data-lucide", "check-circle");
        toastIcon.className = "w-4 h-4 text-emerald-400";
    }
    lucide.createIcons();

    toast.classList.remove("translate-y-20", "opacity-0");
    setTimeout(() => {
        toast.classList.add("translate-y-20", "opacity-0");
    }, 2800);
}

// Fetch template & settings from backend
async function fetchTemplateAndSettings() {
    try {
        const res = await fetch("/api/template");
        if (res.ok) {
            const data = await res.json();
            state.template = data.template;
            state.settings = data.settings;

            // Update UI fields
            const editor = document.getElementById("templateEditor");
            if (editor) editor.value = state.template;

            const headerFmt = document.getElementById("settingHeaderFormat");
            if (headerFmt) headerFmt.value = state.settings.header_format || "{code} + \n";

            const storyFmt = document.getElementById("settingStoryFormat");
            if (storyFmt) storyFmt.value = state.settings.story_format || "\n{story}";

            // Sync dropdowns in generator
            syncDropdownsWithSettings();
        }
    } catch (err) {
        console.error("Failed to load template", err);
    }
}

function syncDropdownsWithSettings() {
    const hSelect = document.getElementById("headerFmtSelect");
    const sSelect = document.getElementById("storyFmtSelect");
    
    if (hSelect && state.settings.header_format) {
        let found = false;
        for (let opt of hSelect.options) {
            if (opt.value === state.settings.header_format) {
                hSelect.value = state.settings.header_format;
                found = true;
                break;
            }
        }
        if (!found) {
            const newOpt = new Option("Tùy chỉnh: " + state.settings.header_format, state.settings.header_format, true, true);
            hSelect.add(newOpt);
        }
    }

    if (sSelect && state.settings.story_format) {
        let found = false;
        for (let opt of sSelect.options) {
            if (opt.value === state.settings.story_format) {
                sSelect.value = state.settings.story_format;
                found = true;
                break;
            }
        }
        if (!found) {
            const newOpt = new Option("Tùy chỉnh: " + state.settings.story_format, state.settings.story_format, true, true);
            sSelect.add(newOpt);
        }
    }
}

// Tab navigation
function switchTab(tab) {
    const tabs = ["generator", "settings", "guide"];
    tabs.forEach(t => {
        const content = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (t === tab) {
            content.classList.remove("hidden");
            btn.classList.add("bg-white", "text-sky-700", "shadow-sm");
            btn.classList.remove("text-slate-600");
        } else {
            content.classList.add("hidden");
            btn.classList.remove("bg-white", "text-sky-700", "shadow-sm");
            btn.classList.add("text-slate-600");
        }
    });
    lucide.createIcons();
}

// Input Mode (Bulk vs Table)
function setInputMode(mode) {
    state.inputMode = mode;
    const bulkCont = document.getElementById("bulkInputContainer");
    const tableCont = document.getElementById("tableInputContainer");
    const bulkBtn = document.getElementById("modeBulkBtn");
    const tableBtn = document.getElementById("modeTableBtn");

    if (mode === "bulk") {
        bulkCont.classList.remove("hidden");
        tableCont.classList.add("hidden");
        bulkBtn.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-xs";
        tableBtn.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900";
        // Sync table rows into bulk text
        syncTableToBulk();
    } else {
        bulkCont.classList.add("hidden");
        tableCont.classList.remove("hidden");
        tableBtn.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-xs";
        bulkBtn.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900";
        // Sync bulk text into table rows
        syncBulkToTable();
    }
    lucide.createIcons();
}

function syncBulkToTable() {
    const raw = document.getElementById("rawInput").value.trim();
    if (!raw) return;
    const lines = raw.split("\n");
    state.tableRows = [];
    lines.forEach(line => {
        line = line.strip ? line.strip() : line.trim();
        if (!line) return;
        if ((line.startsWith("//") || line.startsWith("#")) && !line.includes("|") && !line.includes("http")) return;
        let parts = line.split("|");
        if (parts.length >= 2) {
            state.tableRows.push({ code: parts[0].trim(), url: parts[1].trim() });
        } else {
            state.tableRows.push({ code: line, url: "" });
        }
    });
    renderTableRows();
}

function syncTableToBulk() {
    if (state.tableRows && state.tableRows.length > 0) {
        const text = state.tableRows.map(r => `${r.code} | ${r.url}`).join("\n");
        document.getElementById("rawInput").value = text;
    }
}

// Render Table Rows
function renderTableRows() {
    const tbody = document.getElementById("tableRowsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (state.tableRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs">Chưa có dòng nào. Bấm "+ Thêm dòng mới" hoặc chuyển sang Dán hàng loạt.</td></tr>`;
        return;
    }

    state.tableRows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="py-2 px-3 text-center text-xs text-slate-400 font-mono">${idx + 1}</td>
            <td class="py-2 px-3">
                <input type="text" value="${escapeHtml(row.code)}" oninput="updateTableRow(${idx}, 'code', this.value)"
                    class="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none"
                    placeholder="VD: TRUYEN01">
            </td>
            <td class="py-2 px-3">
                <input type="text" value="${escapeHtml(row.url)}" oninput="updateTableRow(${idx}, 'url', this.value)"
                    class="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none"
                    placeholder="https://dtruyen.com/...">
            </td>
            <td class="py-2 px-3 text-center">
                <button onclick="removeTableRow(${idx})" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function addTableRow() {
    const nextIdx = state.tableRows.length + 1;
    const padNum = String(nextIdx).padStart(2, "0");
    state.tableRows.push({ code: `TRUYEN${padNum}`, url: "" });
    renderTableRows();
    syncTableToBulk();
}

function removeTableRow(idx) {
    state.tableRows.splice(idx, 1);
    renderTableRows();
    syncTableToBulk();
}

function updateTableRow(idx, field, val) {
    if (state.tableRows[idx]) {
        state.tableRows[idx][field] = val;
    }
}

// Sample Data helper
function fillSampleData() {
    const sample = `MT01 | https://dtruyen.com/nang-dau-cuc-pham/
MT02 | https://dtruyen.com/nguoi-tinh-be-nho-cua-tong-tai/
MT03 | https://dtruyen.com/cuoi-truoc-yeu-sau-tong-tai-that-ba-dao/`;
    document.getElementById("rawInput").value = sample;
    state.tableRows = [
        { code: "MT01", url: "https://dtruyen.com/nang-dau-cuc-pham/" },
        { code: "MT02", url: "https://dtruyen.com/nguoi-tinh-be-nho-cua-tong-tai/" },
        { code: "MT03", url: "https://dtruyen.com/cuoi-truoc-yeu-sau-tong-tai-that-ba-dao/" }
    ];
    renderTableRows();
    showToast("Đã điền dữ liệu mẫu!");
}

function clearAllData() {
    document.getElementById("rawInput").value = "";
    state.tableRows = [];
    renderTableRows();
    document.getElementById("resultsSection").classList.add("hidden");
    state.items = [];
    showToast("Đã xóa dữ liệu");
}

function handleBulkFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        document.getElementById("rawInput").value = text;
        syncBulkToTable();
        showToast(`Đã tải lên tệp: ${file.name}`);
    };
    reader.readAsText(file);
}

// Template Management
async function saveTemplateSettings() {
    const editor = document.getElementById("templateEditor");
    const headerFmt = document.getElementById("settingHeaderFormat").value;
    const storyFmt = document.getElementById("settingStoryFormat").value;

    const newTemplate = editor.value.trim();
    if (!newTemplate) {
        showToast("Nội dung prompt mẫu không được để trống!", true);
        return;
    }

    try {
        const res = await fetch("/api/template", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                template: newTemplate,
                header_format: headerFmt,
                story_format: storyFmt
            })
        });
        const data = await res.json();
        if (data.success) {
            state.template = data.template;
            state.settings = data.settings;
            syncDropdownsWithSettings();
            
            const status = document.getElementById("saveStatus");
            status.classList.remove("hidden");
            setTimeout(() => status.classList.add("hidden"), 3000);
            showToast("Đã lưu Prompt mẫu thành công!");
        }
    } catch (err) {
        showToast("Lỗi khi lưu cấu hình!", true);
    }
}

async function resetDefaultTemplate() {
    if (!confirm("Bạn có chắc chắn muốn khôi phục về prompt mẫu ban đầu?")) return;
    try {
        const res = await fetch("/api/template/reset", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            state.template = data.template;
            document.getElementById("templateEditor").value = state.template;
            showToast("Đã khôi phục prompt mẫu mặc định!");
        }
    } catch (err) {
        showToast("Lỗi khôi phục mẫu!", true);
    }
}

async function handleTemplateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        if (!text || !text.trim()) {
            showToast("File nội dung rỗng!", true);
            return;
        }

        try {
            const res = await fetch("/api/template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    template: text.trim(),
                    header_format: state.settings.header_format,
                    story_format: state.settings.story_format
                })
            });
            const data = await res.json();
            if (data.success) {
                state.template = data.template;
                document.getElementById("templateEditor").value = state.template;
                showToast(`Đã tải lên và lưu prompt mẫu từ: ${file.name}`);
            } else {
                showToast("Lỗi lưu prompt mẫu", true);
            }
        } catch (err) {
            showToast("Lỗi kết nối khi tải template!", true);
        }
    };
    reader.readAsText(file);
}

function onFormatChange() {
    const hSelect = document.getElementById("headerFmtSelect");
    const sSelect = document.getElementById("storyFmtSelect");
    state.settings.header_format = hSelect.value;
    state.settings.story_format = sSelect.value;
    
    // If results exist, live re-assemble all prompts!
    if (state.items.length > 0) {
        state.items.forEach(async (item, idx) => {
            await recalculatePrompt(idx);
        });
    }
}

// Batch Processing
async function startBatchProcessing() {
    let rawText = "";
    if (state.inputMode === "bulk") {
        rawText = document.getElementById("rawInput").value.trim();
    } else {
        rawText = state.tableRows.map(r => `${r.code} | ${r.url}`).join("\n").trim();
    }

    if (!rawText) {
        showToast("Vui lòng nhập ít nhất 1 dòng Mã truyện | Link truyện!", true);
        return;
    }

    const headerFmt = document.getElementById("headerFmtSelect").value;
    const storyFmt = document.getElementById("storyFmtSelect").value;

    // UI Loading state
    state.isProcessing = true;
    const btn = document.getElementById("startProcessBtn");
    btn.disabled = true;
    btn.classList.add("opacity-70", "cursor-not-allowed");
    
    const progCont = document.getElementById("progressContainer");
    const progBar = document.getElementById("progressBar");
    const progPercent = document.getElementById("progressPercent");
    progCont.classList.remove("hidden");
    progBar.style.width = "20%";
    progPercent.textContent = "20%";

    try {
        const res = await fetch("/api/generate-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                raw_text: rawText,
                header_format: headerFmt,
                story_format: storyFmt
            })
        });

        progBar.style.width = "80%";
        progPercent.textContent = "80%";

        const data = await res.json();
        state.items = data.items || [];

        progBar.style.width = "100%";
        progPercent.textContent = "100%";
        setTimeout(() => {
            progCont.classList.add("hidden");
        }, 500);

        renderResults();
        showToast(`Hoàn tất! Đã xử lý ${state.items.length} truyện.`);
    } catch (err) {
        console.error(err);
        showToast("Lỗi khi kết nối tới máy chủ!", true);
        progCont.classList.add("hidden");
    } finally {
        state.isProcessing = false;
        btn.disabled = false;
        btn.classList.remove("opacity-70", "cursor-not-allowed");
    }
}

// Render Results
function renderResults() {
    const section = document.getElementById("resultsSection");
    const list = document.getElementById("promptsList");
    
    if (state.items.length === 0) {
        section.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");

    // Stats
    const total = state.items.length;
    const success = state.items.filter(i => i.success).length;
    const errors = total - success;
    document.getElementById("statTotal").textContent = total;
    document.getElementById("statSuccess").textContent = success;
    document.getElementById("statError").textContent = errors;

    list.innerHTML = "";

    state.items.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 transition hover:border-slate-300 fade-in";
        card.id = `item-card-${idx}`;

        const isSuccess = item.success;
        const wordCount = (item.description || "").trim().split(/\s+/).filter(Boolean).length;
        const statusBadge = isSuccess
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <i data-lucide="check" class="w-3 h-3"></i> Đã lấy Chương 1 (${wordCount} từ)
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title="${escapeHtml(item.error || '')}">
                <i data-lucide="alert-triangle" class="w-3 h-3"></i> ${escapeHtml(item.error || 'Cần nhập tay')}
               </span>`;

        card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div class="flex items-center flex-wrap gap-2">
                    <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-xs flex items-center justify-center font-bold">${idx + 1}</span>
                    <span class="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-mono text-xs font-bold">${escapeHtml(item.code || 'NO-CODE')}</span>
                    ${item.url ? `
                        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1 transition max-w-xs truncate" title="${escapeHtml(item.url)}">
                            <i data-lucide="external-link" class="w-3 h-3 shrink-0"></i>
                            <span class="truncate">${escapeHtml(item.url)}</span>
                        </a>
                    ` : ''}
                    ${statusBadge}
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="toggleCardExpand(${idx})" id="expandBtn-${idx}" class="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1">
                        <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                        <span>Xem nội dung Chương 1</span>
                    </button>
                    <button onclick="copySinglePrompt(${idx}, this)" class="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        <span>Copy Prompt</span>
                    </button>
                </div>
            </div>

            <!-- Editable Description Accordion (Collapsed or visible) -->
            <div id="descContainer-${idx}" class="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div class="flex items-center justify-between">
                    <label class="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <i data-lucide="file-text" class="w-3 h-3 text-slate-400"></i>
                        Nội Dung Chương 1 (~500 Chữ - Có Thể Sửa Trực Tiếp)
                    </label>
                    <span class="text-[10px] text-slate-400">Prompt tự động cập nhật tức thì</span>
                </div>
                <textarea rows="4" oninput="onDescriptionEdit(${idx}, this.value)"
                    class="w-full text-xs font-mono p-2.5 bg-white rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500 outline-none leading-relaxed"
                    placeholder="Nội dung khoảng 500 chữ ở Chương 1...">${escapeHtml(item.description || '')}</textarea>
            </div>

            <!-- Prompt Preview Container -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                    <label class="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <i data-lucide="terminal" class="w-3 h-3 text-sky-600"></i>
                        Prompt Cuối Cùng Để Copy
                    </label>
                    <span class="text-[11px] text-slate-400 font-mono" id="charCount-${idx}">${(item.final_prompt || '').length} ký tự</span>
                </div>
                <div class="relative group">
                    <pre id="promptText-${idx}" class="w-full max-h-56 overflow-y-auto text-xs font-mono p-3.5 bg-slate-900 text-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap select-all selection:bg-sky-500 selection:text-white border border-slate-800">${escapeHtml(item.final_prompt || '')}</pre>
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    lucide.createIcons();
    // Scroll smoothly to results
    setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
}

function toggleCardExpand(idx) {
    const cont = document.getElementById(`descContainer-${idx}`);
    const btn = document.getElementById(`expandBtn-${idx}`);
    if (cont.classList.contains("hidden")) {
        cont.classList.remove("hidden");
        btn.querySelector("span").textContent = "Thu gọn mô tả";
        btn.querySelector("i").setAttribute("data-lucide", "chevron-up");
    } else {
        cont.classList.add("hidden");
        btn.querySelector("span").textContent = "Chi tiết mô tả";
        btn.querySelector("i").setAttribute("data-lucide", "chevron-down");
    }
    lucide.createIcons();
}

// Live update prompt when description is edited
let debounceTimers = {};
function onDescriptionEdit(idx, newDesc) {
    if (!state.items[idx]) return;
    state.items[idx].description = newDesc;
    
    // Debounce recalculation
    clearTimeout(debounceTimers[idx]);
    debounceTimers[idx] = setTimeout(() => {
        recalculatePrompt(idx);
    }, 250);
}

async function recalculatePrompt(idx) {
    const item = state.items[idx];
    if (!item) return;

    const headerFmt = document.getElementById("headerFmtSelect").value;
    const storyFmt = document.getElementById("storyFmtSelect").value;

    try {
        const res = await fetch("/api/assemble", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: item.code,
                description: item.description,
                template: state.template,
                header_format: headerFmt,
                story_format: storyFmt
            })
        });
        const data = await res.json();
        item.final_prompt = data.final_prompt;
        
        // Update DOM
        const pre = document.getElementById(`promptText-${idx}`);
        if (pre) pre.textContent = item.final_prompt;
        const count = document.getElementById(`charCount-${idx}`);
        if (count) count.textContent = `${item.final_prompt.length} ký tự`;
    } catch (e) {
        console.error("Failed to recalculate prompt", e);
    }
}

// Copy single prompt
async function copySinglePrompt(idx, btn) {
    const item = state.items[idx];
    if (!item || !item.final_prompt) return;

    try {
        await navigator.clipboard.writeText(item.final_prompt);
        const originalHtml = btn.innerHTML;
        btn.classList.add("copy-btn-success");
        btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i><span>✓ Đã copy!</span>`;
        lucide.createIcons();

        showToast(`Đã chép Prompt [${item.code || idx + 1}] vào clipboard!`);

        setTimeout(() => {
            btn.classList.remove("copy-btn-success");
            btn.innerHTML = originalHtml;
            lucide.createIcons();
        }, 2000);
    } catch (err) {
        // Fallback for clipboard
        fallbackCopyText(item.final_prompt);
        showToast("Đã chép Prompt!");
    }
}

// Copy ALL Prompts
async function copyAllPrompts() {
    if (state.items.length === 0) return;
    const allPrompts = state.items
        .map(i => i.final_prompt)
        .filter(p => p && p.trim())
        .join("\n\n" + "=".repeat(40) + "\n\n");

    try {
        await navigator.clipboard.writeText(allPrompts);
        const btn = document.getElementById("copyAllBtn");
        const originalHtml = btn.innerHTML;
        btn.classList.add("copy-btn-success");
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>✓ Đã copy toàn bộ ${state.items.length} Prompts!</span>`;
        lucide.createIcons();

        showToast(`Đã sao chép tất cả ${state.items.length} Prompts vào bộ nhớ tạm!`);

        setTimeout(() => {
            btn.classList.remove("copy-btn-success");
            btn.innerHTML = originalHtml;
            lucide.createIcons();
        }, 2200);
    } catch (err) {
        fallbackCopyText(allPrompts);
        showToast(`Đã sao chép tất cả ${state.items.length} Prompts!`);
    }
}

// Export as TXT file
function exportAsTxt() {
    if (state.items.length === 0) return;
    const content = state.items
        .map((i, idx) => `=== PROMPT #${idx + 1} [${i.code}] ===\n\n${i.final_prompt}\n\n`)
        .join("\n" + "-".repeat(50) + "\n\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story_prompts_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Đã tải xuống tệp .txt!");
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
