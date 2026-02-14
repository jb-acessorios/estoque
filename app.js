// ==========================================
// JB ACESSÓRIOS - Front (GitHub Pages)
// Tela de login inicial + sistema após login
// Backend: Google Apps Script (Web App)
// ==========================================

// COLE A URL DO SEU WEB APP AQUI:
const API_URL = "https://script.google.com/macros/s/AKfycbyscJsQlwKtm9vkEW2-5tz4CVTemwMaMAB7rF_vc7F5SW3RnaY42QkbbVT5vz2jh-e5/exec";

let TOKEN = "";
let PRODUCTS = [];
let MOVES_ALL = [];
let selectedSku = "";

// Helpers
const $ = (id) => document.getElementById(id);
const skuUp = (s) => String(s || "").trim().toUpperCase();
const norm  = (s) => String(s || "").toLowerCase().trim();

function saveTokenSession(token){ sessionStorage.setItem("jb_token", token); }
function loadTokenSession(){ return sessionStorage.getItem("jb_token") || ""; }
function clearTokenSession(){ sessionStorage.removeItem("jb_token"); }

function showOnly(view){
  // view: "login" ou "app"
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
    // sem headers para evitar preflight/CORS
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

    tr.innerHTML = `
      <td>${p.sku ?? ""}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.marca ?? ""}</td>
      <td>${p.estado ?? ""}</td>
      <td>${p.estoque ?? 0}</td>
      <td>${p.minimo ?? 0}</td>
      <td>${money(p.preco)}</td>
      <td>${p.local ?? ""}</td>
      <td>${p.ativo ?? ""}</td>
    `;

    tr.addEventListener("click", () => {
      selectedSku = skuUp(p.sku || "");
      const s = $("selectedSku");
      if (s) s.textContent = selectedSku || "---";

      if ($("m_sku")) $("m_sku").value = selectedSku;

      fillProductForm(p);
      renderMovesFiltered();
    });

    tb.appendChild(tr);
  });
}

// =====================
// FILTROS
// =====================
function applyFilters() {
  const fsku = skuUp($("f_sku")?.value);
  const fnome = norm($("f_nome")?.value);
  const fcat = norm($("f_categoria")?.value);

  let list = PRODUCTS;

  if (fsku) list = list.filter(p => skuUp(p.sku).includes(fsku));
  if (fnome) list = list.filter(p => norm(p.nome).includes(fnome));
  if (fcat) list = list.filter(p => norm(p.categoria).includes(fcat));

  renderProducts(list);
}

function clearFilters() {
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
  if ($("p_sku")) $("p_sku").value = p.sku || "";
  if ($("p_nome")) $("p_nome").value = p.nome || "";
  if ($("p_categoria")) $("p_categoria").value = p.categoria || "";
  if ($("p_marca")) $("p_marca").value = p.marca || "";
  if ($("p_estado")) $("p_estado").value = (p.estado || "NOVA").toUpperCase();
  if ($("p_custo")) $("p_custo").value = p.custo || "";
  if ($("p_preco")) $("p_preco").value = p.preco || "";
  if ($("p_estoque")) $("p_estoque").value = p.estoque || "";
  if ($("p_minimo")) $("p_minimo").value = p.minimo || "";
  if ($("p_local")) $("p_local").value = p.local || "";
  if ($("p_ativo")) $("p_ativo").value = (p.ativo || "SIM").toUpperCase();
}

function clearProductForm(){
  ["p_sku","p_nome","p_categoria","p_marca","p_custo","p_preco","p_estoque","p_minimo","p_local"]
    .forEach(id => { if ($(id)) $(id).value = ""; });

  if ($("p_ativo")) $("p_ativo").value = "SIM";
  if ($("p_estado")) $("p_estado").value = "NOVA";
}

async function saveProduct(){
  const product = {
    sku: skuUp($("p_sku")?.value),
    nome: ($("p_nome")?.value || "").trim(),
    categoria: ($("p_categoria")?.value || "").trim(),
    marca: ($("p_marca")?.value || "").trim(),
    estado: ($("p_estado")?.value || "NOVA").toUpperCase(),
    custo: ($("p_custo")?.value || "").trim(),
    preco: ($("p_preco")?.value || "").trim(),
    estoque: ($("p_estoque")?.value || "").trim(),
    minimo: ($("p_minimo")?.value || "").trim(),
    local: ($("p_local")?.value || "").trim(),
    ativo: (($("p_ativo")?.value || "SIM")).toUpperCase()
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
    tipo: $("m_tipo")?.value,
    sku: skuUp($("m_sku")?.value),
    quantidade: ($("m_qtd")?.value || "").trim(),
    obs: ($("m_obs")?.value || "").trim(),
    usuario: ($("m_usuario")?.value || "").trim() || "JB"
  };

  if (!move.sku) return alert("SKU é obrigatório.");
  if (!move.quantidade) return alert("Quantidade é obrigatória.");

  const r = await apiPost({ action:"moveStock", move });
  if (!r.ok) return alert(r.error);

  alert(`${r.message}\nSKU: ${r.sku}\nAntes: ${r.estoque_anterior}\nAgora: ${r.estoque_novo}`);

  selectedSku = move.sku;
  if ($("selectedSku")) $("selectedSku").textContent = selectedSku;

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
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.sku ?? ""}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
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
  selectedSku = "";
  clearTokenSession();

  // limpa telas
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

  $("btnNovoProduto")?.addEventListener("click", () => {
    clearProductForm();
    $("p_sku")?.focus();
  });

  $("btnRegistrarMov")?.addEventListener("click", async () => {
    if (!TOKEN) return;
    try{ await moveStock(); } catch(e){ alert(e.message || String(e)); }
  });

  $("btnLimparMov")?.addEventListener("click", () => {
    if ($("m_tipo")) $("m_tipo").value = "ENTRADA";
    if ($("m_sku")) $("m_sku").value = selectedSku || "";
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
  // mostra app e valida token
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
