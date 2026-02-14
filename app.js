// ==========================================
// JB ACESSÓRIOS - Front (GitHub Pages)
// Funções: menu superior, filtros, cadastros, movimentações, relatórios
// Backend: Google Apps Script (Web App)
// ==========================================

// COLE A URL DO SEU WEB APP AQUI:
const API_URL = "https://script.google.com/macros/s/AKfycbwxLABExh5-KwzmzZU8HAF6wj6gbiqVW0pgu8haA9YXvRmGZnezmXzWOses0iirwlU/exec";

let TOKEN = "";
let PRODUCTS = [];
let MOVES_ALL = [];
let selectedSku = "";

// Helpers
const $ = (id) => document.getElementById(id);
const skuUp = (s) => String(s || "").trim().toUpperCase();
const norm  = (s) => String(s || "").toLowerCase().trim();

function setStatus(ok, text) {
  const el = $("status");
  el.textContent = text;
  el.style.color = ok ? "#1b5e20" : "rgba(20,24,35,.65)";
  el.style.borderColor = ok ? "rgba(27,94,32,.35)" : "rgba(20,24,35,.12)";
}

function money(v){
  const n = Number(String(v ?? "").replace(",", "."));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

// API
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("token", TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  return r.json();
}

async function apiPost(payload) {
  const r = await fetch(API_URL, {
    method: "POST",
    // NÃO coloque headers aqui (isso evita o preflight/CORS)
    body: JSON.stringify({ ...payload, token: TOKEN }),
  });

  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error("Resposta não-JSON da API (verifique o Web App do Apps Script).");
  }
}

// =====================
// MENU (botões de cima)
// =====================
function setView(view) {
  document.querySelectorAll(".iconbtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add("active");

  const titles = {
    estoque: "Controle de estoque",
    cadastros: "Cadastros",
    movimentacoes: "Movimentações",
    relatorios: "Relatórios"
  };
  $("viewTitle").textContent = titles[view] || "Sistema";

  // Ações automáticas por tela (fica mais “ERP”)
  if (TOKEN) {
    if (view === "estoque") {
      // nada obrigatório, só garante que a lista existe
      renderProducts(PRODUCTS);
    }
    if (view === "relatorios") {
      // mostra vazio até gerar
      // (não gera automático pra não confundir)
      renderRel([]);
    }
  }
}

function wireMenu() {
  document.querySelectorAll(".iconbtn").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
}

// =====================
// RENDER PRODUTOS
// =====================
function renderProducts(list) {
  const tb = $("tblProdutos").querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(p => {
    const tr = document.createElement("tr");

    const est = Number(p.estoque || 0);
    const min = Number(p.minimo || 0);

    if (est <= min) tr.classList.add("low");
    if (est <= 0) tr.classList.add("bad");

    tr.innerHTML = `
      <td>${p.sku ?? ""}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.marca ?? ""}</td>
      <td>${p.estoque ?? 0}</td>
      <td>${p.minimo ?? 0}</td>
      <td>${money(p.preco)}</td>
      <td>${p.local ?? ""}</td>
      <td>${p.ativo ?? ""}</td>
    `;

    tr.addEventListener("click", () => {
      selectedSku = skuUp(p.sku || "");
      $("selectedSku").textContent = selectedSku || "---";

      // preenche o SKU na tela de movimentações
      $("m_sku").value = selectedSku;

      // preenche no cadastro (pra editar rápido)
      fillProductForm(p);

      // já mostra os movimentos filtrados
      renderMovesFiltered();
    });

    tb.appendChild(tr);
  });
}

// =====================
// FILTROS
// =====================
function applyFilters() {
  const fsku = skuUp($("f_sku").value);
  const fnome = norm($("f_nome").value);
  const fcat = norm($("f_categoria").value);

  let list = PRODUCTS;

  if (fsku) list = list.filter(p => skuUp(p.sku).includes(fsku));
  if (fnome) list = list.filter(p => norm(p.nome).includes(fnome));
  if (fcat) list = list.filter(p => norm(p.categoria).includes(fcat));

  renderProducts(list);
}

function clearFilters() {
  $("f_sku").value = "";
  $("f_nome").value = "";
  $("f_categoria").value = "";
  renderProducts(PRODUCTS);
}

// =====================
// MOVIMENTOS
// =====================
function renderMoves(list) {
  const tb = $("tblMoves").querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.data || ""}</td>
      <td>${m.tipo || ""}</td>
      <td>${m.sku || ""}</td>
      <td>${m.quantidade || ""}</td>
      <td>${m.obs || ""}</td>
      <td>${m.usuario || ""}</td>
    `;
    tb.appendChild(tr);
  });
}

function renderMovesFiltered() {
  const sku = skuUp(selectedSku);
  if (!sku) return renderMoves([]);
  const filtered = (MOVES_ALL || []).filter(m => skuUp(m.sku) === sku);
  renderMoves(filtered);
}

// =====================
// CADASTRO
// =====================
function fillProductForm(p){
  $("p_sku").value = p.sku || "";
  $("p_nome").value = p.nome || "";
  $("p_categoria").value = p.categoria || "";
  $("p_marca").value = p.marca || "";
  $("p_custo").value = p.custo || "";
  $("p_preco").value = p.preco || "";
  $("p_estoque").value = p.estoque || "";
  $("p_minimo").value = p.minimo || "";
  $("p_local").value = p.local || "";
  $("p_ativo").value = (p.ativo || "SIM").toUpperCase();
}

function clearProductForm(){
  ["p_sku","p_nome","p_categoria","p_marca","p_custo","p_preco","p_estoque","p_minimo","p_local"].forEach(id => $(id).value = "");
  $("p_ativo").value = "SIM";
}

async function saveProduct(){
  const product = {
    sku: skuUp($("p_sku").value),
    nome: $("p_nome").value.trim(),
    categoria: $("p_categoria").value.trim(),
    marca: $("p_marca").value.trim(),
    custo: $("p_custo").value.trim(),
    preco: $("p_preco").value.trim(),
    estoque: $("p_estoque").value.trim(),
    minimo: $("p_minimo").value.trim(),
    local: $("p_local").value.trim(),
    ativo: ($("p_ativo").value || "SIM").toUpperCase()
  };

  if (!product.sku) return alert("SKU é obrigatório.");

  const r = await apiPost({ action:"upsertProduct", product });
  if (!r.ok) return alert(r.error);

  alert(r.message);
  await refreshAll();
  setView("estoque");
}

// =====================
// MOVIMENTAR (entrada/saída/ajuste)
// =====================
async function moveStock(){
  const move = {
    tipo: $("m_tipo").value,
    sku: skuUp($("m_sku").value),
    quantidade: $("m_qtd").value.trim(),
    obs: $("m_obs").value.trim(),
    usuario: $("m_usuario").value.trim() || "JB"
  };

  if (!move.sku) return alert("SKU é obrigatório.");
  if (!move.quantidade) return alert("Quantidade é obrigatória.");

  const r = await apiPost({ action:"moveStock", move });
  if (!r.ok) return alert(r.error);

  alert(`${r.message}\nSKU: ${r.sku}\nAntes: ${r.estoque_anterior}\nAgora: ${r.estoque_novo}`);

  selectedSku = move.sku;
  $("selectedSku").textContent = selectedSku;

  $("m_qtd").value = "";
  $("m_obs").value = "";

  await refreshAll();
  setView("estoque");
}

// =====================
// RELATÓRIOS
// =====================
function renderRel(list){
  const tb = $("tblRel").querySelector("tbody");
  tb.innerHTML = "";
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.sku ?? ""}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.estoque ?? 0}</td>
      <td>${p.minimo ?? 0}</td>
      <td>${money(p.preco)}</td>
      <td>${p.local ?? ""}</td>
    `;
    tb.appendChild(tr);
  });
}

function relMinimo(){
  const list = PRODUCTS.filter(p => Number(p.estoque||0) <= Number(p.minimo||0));
  renderRel(list);
  setView("relatorios");
}

function relZerados(){
  const list = PRODUCTS.filter(p => Number(p.estoque||0) <= 0);
  renderRel(list);
  setView("relatorios");
}

// =====================
// LOADERS
// =====================
async function ping(){
  const r = await apiGet("ping");
  setStatus(r.ok, r.ok ? "online" : "offline");
  return r.ok;
}

async function loadProducts(){
  const r = await apiGet("listProducts");
  if (!r.ok) throw new Error(r.error);
  PRODUCTS = r.products || [];
  renderProducts(PRODUCTS);
}

async function loadMoves(){
  const limit = $("movLimit").value || "50";
  const r = await apiGet("listMoves", { limit });
  if (!r.ok) throw new Error(r.error);
  MOVES_ALL = r.moves || [];
  renderMovesFiltered();
}

async function refreshAll(){
  await loadProducts();
  await loadMoves();
}

// =====================
// EVENTOS
// =====================
function wireActions(){
  $("btnLogin").addEventListener("click", async () => {
    TOKEN = $("token").value.trim();
    if (!TOKEN) return alert("Digite a senha.");

    const ok = await ping();
    if (!ok) return alert("Senha inválida ou API offline.");

    try{
      await refreshAll();
      setView("estoque");
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $("btnRefreshAll").addEventListener("click", async () => {
    if (!TOKEN) return alert("Entre primeiro.");
    try{ await refreshAll(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnFiltrar").addEventListener("click", () => {
    if (!TOKEN) return alert("Entre primeiro.");
    applyFilters();
  });

  $("btnLimparFiltro").addEventListener("click", () => {
    clearFilters();
  });

  $("btnItensEmFalta").addEventListener("click", () => {
    if (!TOKEN) return alert("Entre primeiro.");
    const list = PRODUCTS.filter(p => Number(p.estoque||0) <= Number(p.minimo||0));
    renderProducts(list);
  });

  $("btnVerTodos").addEventListener("click", () => {
    renderProducts(PRODUCTS);
  });

  $("btnLoadMoves").addEventListener("click", async () => {
    if (!TOKEN) return alert("Entre primeiro.");
    try{ await loadMoves(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnSalvarProduto").addEventListener("click", async () => {
    if (!TOKEN) return alert("Entre primeiro.");
    try{ await saveProduct(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnLimparProduto").addEventListener("click", clearProductForm);

  $("btnNovoProduto").addEventListener("click", () => {
    clearProductForm();
    $("p_sku").focus();
  });

  $("btnRegistrarMov").addEventListener("click", async () => {
    if (!TOKEN) return alert("Entre primeiro.");
    try{ await moveStock(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnLimparMov").addEventListener("click", () => {
    $("m_tipo").value = "ENTRADA";
    $("m_sku").value = selectedSku || "";
    $("m_qtd").value = "";
    $("m_obs").value = "";
    $("m_usuario").value = "";
  });

  $("btnRelMinimo").addEventListener("click", () => {
    if (!TOKEN) return alert("Entre primeiro.");
    relMinimo();
  });

  $("btnRelZerados").addEventListener("click", () => {
    if (!TOKEN) return alert("Entre primeiro.");
    relZerados();
  });

  $("btnRelLimpar").addEventListener("click", () => {
    renderRel([]);
  });
}

// Init
wireMenu();
wireActions();
setView("estoque");
