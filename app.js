// ==========================================
// JB ACESSÓRIOS - Front (GitHub Pages)
// Login + sistema
// Backend: Google Apps Script (Web App)
// Suporte a PEÇA repetida usando ID único
// ==========================================

// COLE A URL DO SEU WEB APP AQUI:
const API_URL = "https://script.google.com/macros/s/AKfycbzRcfn0x1Zx1WeBidlX6pDgWBK_ZB5achzInLFRyrj0p9Bs8-CuyMH8Bo4bgBgYXwL9/exec";

let TOKEN = "";
let PRODUCTS = [];
let MOVES_ALL = [];

// Seleção do item (AGORA por ID)
let selectedId = "";
let selectedPeca = "";

// Helpers
const $ = (id) => document.getElementById(id);
const up = (s) => String(s || "").trim().toUpperCase();
const norm = (s) => String(s || "").toLowerCase().trim();

function saveTokenSession(token){ sessionStorage.setItem("jb_token", token); }
function loadTokenSession(){ return sessionStorage.getItem("jb_token") || ""; }
function clearTokenSession(){ sessionStorage.removeItem("jb_token"); }

function showOnly(view){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add("active");
}

function setStatus(ok, text) {
  const el = $("status");
  if (!el) return;
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
    body: JSON.stringify({ ...payload, token: TOKEN }),
  });

  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch { throw new Error("Resposta não-JSON da API (verifique o Web App do Apps Script)."); }
}

// =====================
// MENU (botões de cima)
// =====================
function setView(view) {
  document.querySelectorAll(".iconbtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  document.querySelectorAll(".view2").forEach(v => v.classList.remove("active"));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add("active");

  const titles = {
    estoque: "Controle de estoque",
    cadastros: "Cadastros",
    movimentacoes: "Movimentações",
    relatorios: "Relatórios"
  };
  const t = $("viewTitle");
  if (t) t.textContent = titles[view] || "Sistema";

  if (TOKEN) {
    if (view === "estoque") renderProducts(PRODUCTS);
    if (view === "relatorios") renderRel([]);
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
  const table = $("tblProdutos");
  if (!table) return;

  const tb = table.querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(p => {
    const tr = document.createElement("tr");

    const est = Number(p.estoque || 0);
    const min = Number(p.minimo || 0);

    if (est <= min) tr.classList.add("low");
    if (est <= 0) tr.classList.add("bad");

    const peca = (p.peca ?? p.sku ?? "");
    const id = (p.id ?? "");

    tr.innerHTML = `
      <td>${peca}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.marca ?? ""}</td>
      <td>${p.modelo ?? ""}</td>
      <td>${p.estado ?? ""}</td>
      <td>${p.estoque ?? 0}</td>
      <td>${p.minimo ?? 0}</td>
      <td>${money(p.preco)}</td>
      <td>${p.local ?? ""}</td>
      <td>${p.ativo ?? ""}</td>
    `;

    tr.addEventListener("click", () => {
      selectedId = String(id || "").trim();
      selectedPeca = up(peca);

      // Mostra seleção (agora por ID)
      const s = $("selectedSku");
      if (s) s.textContent = selectedPeca ? `${selectedPeca} (${selectedId})` : "---";

      // Preenche movimentação (ID é o principal!)
      if ($("m_id")) $("m_id").value = selectedId;
      if ($("m_sku")) $("m_sku").value = selectedPeca;
      if ($("m_peca")) $("m_peca").value = selectedPeca;

      // Preenche cadastro (vai carregar p_id pra editar este registro)
      fillProductForm(p);

      // Filtra movimentos do item (por ID)
      renderMovesFiltered();
    });

    tb.appendChild(tr);
  });
}

// =====================
// FILTROS
// =====================
function applyFilters() {
  const fpeca = up(($("f_peca")?.value ?? $("f_sku")?.value) || "");
  const fnome = norm($("f_nome")?.value);
  const fcat  = norm($("f_categoria")?.value);

  let list = PRODUCTS;

  if (fpeca) list = list.filter(p => up(p.peca ?? p.sku).includes(fpeca));
  if (fnome) list = list.filter(p => norm(p.nome).includes(fnome));
  if (fcat)  list = list.filter(p => norm(p.categoria).includes(fcat));

  renderProducts(list);
}

function clearFilters() {
  if ($("f_peca")) $("f_peca").value = "";
  if ($("f_sku")) $("f_sku").value = "";
  if ($("f_nome")) $("f_nome").value = "";
  if ($("f_categoria")) $("f_categoria").value = "";
  renderProducts(PRODUCTS);
}

// =====================
// MOVIMENTOS
// =====================
function renderMoves(list) {
  const table = $("tblMoves");
  if (!table) return;

  const tb = table.querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(m => {
    const tr = document.createElement("tr");
    const id = m.id || "";
    const peca = m.peca || m.sku || "";

    tr.innerHTML = `
      <td>${m.data || ""}</td>
      <td>${m.tipo || ""}</td>
      <td>${peca}</td>
      <td>${id}</td>
      <td>${m.quantidade || ""}</td>
      <td>${m.obs || ""}</td>
      <td>${m.usuario || ""}</td>
    `;
    tb.appendChild(tr);
  });
}

function renderMovesFiltered() {
  if (!selectedId) return renderMoves([]);
  const filtered = (MOVES_ALL || []).filter(m => String(m.id || "").trim() === selectedId);
  renderMoves(filtered);
}

// =====================
// CADASTRO
// =====================
function fillProductForm(p){
  const peca = (p.peca ?? p.sku ?? "");
  const id = (p.id ?? "");

  // ID do registro (edita quando preenchido)
  if ($("p_id")) $("p_id").value = String(id || "").trim();

  // campo peça (compat)
  if ($("p_peca")) $("p_peca").value = peca || "";
  if ($("p_sku")) $("p_sku").value = peca || "";

  if ($("p_nome")) $("p_nome").value = p.nome || "";
  if ($("p_categoria")) $("p_categoria").value = p.categoria || "";
  if ($("p_marca")) $("p_marca").value = p.marca || "";
  if ($("p_modelo")) $("p_modelo").value = p.modelo || "";
  if ($("p_estado")) $("p_estado").value = up(p.estado || "NOVA");
  if ($("p_custo")) $("p_custo").value = p.custo || "";
  if ($("p_preco")) $("p_preco").value = p.preco || "";
  if ($("p_estoque")) $("p_estoque").value = p.estoque || "";
  if ($("p_minimo")) $("p_minimo").value = p.minimo || "";
  if ($("p_local")) $("p_local").value = p.local || "";
  if ($("p_ativo")) $("p_ativo").value = up(p.ativo || "SIM");
}

function clearProductForm(){
  // zera ID = modo criar novo
  if ($("p_id")) $("p_id").value = "";

  ["p_peca","p_sku","p_nome","p_categoria","p_marca","p_modelo","p_custo","p_preco","p_estoque","p_minimo","p_local"]
    .forEach(id => { if ($(id)) $(id).value = ""; });

  if ($("p_ativo")) $("p_ativo").value = "SIM";
  if ($("p_estado")) $("p_estado").value = "NOVA";
}

async function saveProduct(){
  const pecaValue = up(($("p_peca")?.value ?? $("p_sku")?.value) || "");
  const idValue = String($("p_id")?.value || "").trim(); // se existir, edita; se vazio, cria novo
  const wasCreating = !idValue;

  const product = {
    id: idValue || "", // se vazio -> CRIA NOVO
    peca: pecaValue,
    nome: ($("p_nome")?.value || "").trim(),
    categoria: ($("p_categoria")?.value || "").trim(),
    marca: ($("p_marca")?.value || "").trim(),
    modelo: ($("p_modelo")?.value || "").trim(),
    estado: up(($("p_estado")?.value || "NOVA")),
    custo: ($("p_custo")?.value || "").trim(),
    preco: ($("p_preco")?.value || "").trim(),
    estoque: ($("p_estoque")?.value || "").trim(),
    minimo: ($("p_minimo")?.value || "").trim(),
    local: ($("p_local")?.value || "").trim(),
    ativo: up(($("p_ativo")?.value || "SIM"))
  };

  if (!product.peca) return alert("Peça é obrigatória.");

  const r = await apiPost({ action:"upsertProduct", product });
  if (!r.ok) return alert(r.error);

  alert(r.message);

  // Se estava criando, NÃO mantém o p_id preenchido (pra não sobrescrever no próximo salvar)
  if (wasCreating) {
    if ($("p_id")) $("p_id").value = "";
  } else {
    // se estava editando, mantém o ID
    if (r.id && $("p_id")) $("p_id").value = String(r.id);
  }

  await refreshAll();
  setView("estoque");
}

// =====================
// MOVIMENTAR (entrada/saída/ajuste)
// =====================
async function moveStock(){
  const idFromForm = String($("m_id")?.value || "").trim();
  const pecaFromForm = up(($("m_peca")?.value ?? $("m_sku")?.value) || "");

  const move = {
    tipo: $("m_tipo")?.value,
    id: idFromForm || selectedId,             // ID sempre manda
    peca: pecaFromForm || selectedPeca,       // só para log/visual
    quantidade: ($("m_qtd")?.value || "").trim(),
    obs: ($("m_obs")?.value || "").trim(),
    usuario: ($("m_usuario")?.value || "").trim() || "JB"
  };

  if (!move.id) return alert("Selecione uma peça na lista primeiro (para pegar o ID).");
  if (!move.quantidade) return alert("Quantidade é obrigatória.");

  const r = await apiPost({ action:"moveStock", move });
  if (!r.ok) return alert(r.error);

  alert(`${r.message}\nPeça: ${r.peca}\nID: ${r.id}\nAntes: ${r.estoque_anterior}\nAgora: ${r.estoque_novo}`);

  selectedId = String(r.id || move.id);
  selectedPeca = up(r.peca || move.peca);

  if ($("selectedSku")) $("selectedSku").textContent = `${selectedPeca} (${selectedId})`;

  if ($("m_qtd")) $("m_qtd").value = "";
  if ($("m_obs")) $("m_obs").value = "";

  await refreshAll();
  setView("estoque");
}

// =====================
// RELATÓRIOS
// =====================
function renderRel(list){
  const table = $("tblRel");
  if (!table) return;

  const tb = table.querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(p => {
    const peca = (p.peca ?? p.sku ?? "");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${peca}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.modelo ?? ""}</td>
      <td>${p.estado ?? ""}</td>
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
  const limit = ($("movLimit")?.value || "50");
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
// LOGIN (TELA INICIAL)
// =====================
async function doLoginFromPage(){
  const input = $("login_password");
  const msg = $("login_msg");

  const token = (input?.value || "").trim();
  if (!token) {
    if (msg) msg.textContent = "Digite a senha.";
    return;
  }

  TOKEN = token;
  if (msg) msg.textContent = "Verificando...";

  try{
    const ok = await ping();
    if (!ok) {
      if (msg) msg.textContent = "Senha inválida.";
      TOKEN = "";
      return;
    }

    saveTokenSession(TOKEN);

    showOnly("app");
    await refreshAll();
    setView("estoque");

  } catch(err){
    TOKEN = "";
    clearTokenSession();
    if (msg) msg.textContent = "Erro ao conectar.";
    alert(err.message || String(err));
  }
}

function doLogout(){
  TOKEN = "";
  PRODUCTS = [];
  MOVES_ALL = [];
  selectedId = "";
  selectedPeca = "";

  clearTokenSession();

  renderProducts([]);
  renderMoves([]);
  renderRel([]);
  clearProductForm();

  showOnly("login");
  const msg = $("login_msg");
  if (msg) msg.textContent = "Digite a senha para acessar.";
  if ($("login_password")) $("login_password").value = "";
}

// =====================
// EVENTOS
// =====================
function wireActions(){
  $("btnLoginPage")?.addEventListener("click", doLoginFromPage);
  $("login_password")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLoginFromPage();
  });

  $("btnLogout")?.addEventListener("click", doLogout);

  $("btnRefreshAll")?.addEventListener("click", async () => {
    if (!TOKEN) return;
    try{ await refreshAll(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnFiltrar")?.addEventListener("click", () => {
    if (!TOKEN) return;
    applyFilters();
  });

  $("btnLimparFiltro")?.addEventListener("click", () => {
    clearFilters();
  });

  $("btnItensEmFalta")?.addEventListener("click", () => {
    if (!TOKEN) return;
    const list = PRODUCTS.filter(p => Number(p.estoque||0) <= Number(p.minimo||0));
    renderProducts(list);
  });

  $("btnVerTodos")?.addEventListener("click", () => {
    renderProducts(PRODUCTS);
  });

  $("btnLoadMoves")?.addEventListener("click", async () => {
    if (!TOKEN) return;
    try{ await loadMoves(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnSalvarProduto")?.addEventListener("click", async () => {
    if (!TOKEN) return;
    try{ await saveProduct(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnLimparProduto")?.addEventListener("click", clearProductForm);

  // ✅ AJUSTE PRINCIPAL: botão NOVO zera seleção + zera IDs
  $("btnNovoProduto")?.addEventListener("click", () => {
    // desmarca item selecionado
    selectedId = "";
    selectedPeca = "";

    if ($("selectedSku")) $("selectedSku").textContent = "---";

    // limpa cadastro (zera p_id)
    clearProductForm();

    // limpa movimentação (zera m_id)
    if ($("m_id")) $("m_id").value = "";
    if ($("m_peca")) $("m_peca").value = "";
    if ($("m_sku")) $("m_sku").value = "";

    ($("p_peca") || $("p_sku"))?.focus();
  });

  $("btnRegistrarMov")?.addEventListener("click", async () => {
    if (!TOKEN) return;
    try{ await moveStock(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnLimparMov")?.addEventListener("click", () => {
    if ($("m_tipo")) $("m_tipo").value = "ENTRADA";
    if ($("m_id")) $("m_id").value = selectedId || "";
    if ($("m_peca")) $("m_peca").value = selectedPeca || "";
    if ($("m_sku")) $("m_sku").value = selectedPeca || "";
    if ($("m_qtd")) $("m_qtd").value = "";
    if ($("m_obs")) $("m_obs").value = "";
    if ($("m_usuario")) $("m_usuario").value = "";
  });

  $("btnRelMinimo")?.addEventListener("click", () => {
    if (!TOKEN) return;
    relMinimo();
  });

  $("btnRelZerados")?.addEventListener("click", () => {
    if (!TOKEN) return;
    relZerados();
  });

  $("btnRelLimpar")?.addEventListener("click", () => {
    renderRel([]);
  });
}

// Init
wireMenu();
wireActions();

// tenta auto-login
TOKEN = loadTokenSession();
if (TOKEN) {
  showOnly("app");
  ping().then(async (ok) => {
    if (ok) {
      await refreshAll();
      setView("estoque");
    } else {
      doLogout();
    }
  }).catch(() => doLogout());
} else {
  showOnly("login");
}
