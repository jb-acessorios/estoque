// ==========================================
// JB ACESSÓRIOS - UI estilo “sistema” + abas por ícone
// Google Sheets (Apps Script) como backend
// ==========================================

// 1) COLE A URL DO SEU WEB APP AQUI
const API_URL = "COLE_AQUI_A_URL_DO_WEB_APP";

let TOKEN = "";
let PRODUCTS = [];
let MOVES_ALL = [];
let selectedSku = "";

// helpers
const $ = (id) => document.getElementById(id);
const skuUp = (s) => String(s||"").trim().toUpperCase();
const norm  = (s) => String(s||"").toLowerCase().trim();

function setStatus(ok, text){
  const el = $("status");
  el.textContent = text;
  el.style.background = ok ? "#1b5e20" : "rgba(45,43,50,.8)";
}

function money(v){
  const n = Number(String(v ?? "").replace(",", "."));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

async function apiGet(action, params = {}){
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("token", TOKEN);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  return r.json();
}

async function apiPost(payload){
  const r = await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ ...payload, token: TOKEN })
  });
  return r.json();
}

// ===== Navegação por “abas” (ícones) =====
function setView(view){
  document.querySelectorAll(".iconbtn").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
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
}

document.querySelectorAll(".iconbtn").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

// ===== Render Produtos =====
function renderProducts(list){
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
      <td>${money(p.preco)}</td>
      <td>${p.local ?? ""}</td>
      <td>${p.ativo ?? ""}</td>
    `;

    tr.addEventListener("click", () => {
      selectedSku = skuUp(p.sku || "");
      $("selectedSku").textContent = selectedSku || "---";
      // preenche também a movimentação
      $("m_sku").value = selectedSku;
      // preenche também o cadastro
      fillProductForm(p);
      // carrega movimentos filtrados
      renderMovesFiltered();
      // mantém na tela estoque
      setView("estoque");
    });

    tb.appendChild(tr);
  });
}

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

// ===== Filtros =====
function applyFilters(){
  const fsku = skuUp($("f_sku").value);
  const fnome = norm($("f_nome").value);
  const fcat = norm($("f_categoria").value);

  let list = PRODUCTS;

  if (fsku) list = list.filter(p => skuUp(p.sku).includes(fsku));
  if (fnome) list = list.filter(p => norm(p.nome).includes(fnome));
  if (fcat) list = list.filter(p => norm(p.categoria).includes(fcat));

  renderProducts(list);
}

function clearFilters(){
  $("f_sku").value = "";
  $("f_nome").value = "";
  $("f_categoria").value = "";
  renderProducts(PRODUCTS);
}

// ===== Movimentos =====
function renderMoves(list){
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

function renderMovesFiltered(){
  if (!MOVES_ALL.length) return renderMoves([]);
  const sku = skuUp(selectedSku);
  const filtered = sku ? MOVES_ALL.filter(m => skuUp(m.sku) === sku) : MOVES_ALL;
  renderMoves(filtered);
}

// ===== Relatórios =====
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

// ===== Loaders =====
async function ping(){
  const r = await apiGet("ping");
  setStatus(r.ok, r.ok ? "online" : "offline");
  return r.ok;
}

async function loadProducts(){
  const r = await apiGet("listProducts");
  if (!r.ok) return alert(r.error);
  PRODUCTS = r.products || [];
  renderProducts(PRODUCTS);
}

async function loadMoves(){
  const limit = $("movLimit").value || "50";
  const r = await apiGet("listMoves", { limit });
  if (!r.ok) return alert(r.error);
  MOVES_ALL = r.moves || [];
  renderMovesFiltered();
}

async function refreshAll(){
  await loadProducts();
  await loadMoves();
}

// ===== Ações: Cadastros =====
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
  await loadProducts();
}

// ===== Ações: Movimentações =====
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
}

// ===== Eventos =====
$("btnLogin").addEventListener("click", async () => {
  TOKEN = $("token").value.trim();
  if (!TOKEN) return alert("Digite a senha.");

  const ok = await ping();
  if (!ok) return alert("Senha inválida ou API offline.");

  await refreshAll();
});

$("btnRefreshAll").addEventListener("click", refreshAll);

$("btnFiltrar").addEventListener("click", applyFilters);
$("btnLimparFiltro").addEventListener("click", clearFilters);

$("btnItensEmFalta").addEventListener("click", () => {
  const list = PRODUCTS.filter(p => Number(p.estoque||0) <= Number(p.minimo||0));
  renderProducts(list);
});

$("btnLoadMoves").addEventListener("click", loadMoves);

$("btnSalvarProduto").addEventListener("click", saveProduct);
$("btnLimparProduto").addEventListener("click", clearProductForm);
$("btnNovoProduto").addEventListener("click", () => {
  clearProductForm();
  $("p_sku").focus();
});

$("btnRegistrarMov").addEventListener("click", moveStock);
$("btnLimparMov").addEventListener("click", () => {
  $("m_tipo").value = "ENTRADA";
  $("m_sku").value = selectedSku || "";
  $("m_qtd").value = "";
  $("m_obs").value = "";
  $("m_usuario").value = "";
});

$("btnRelMinimo").addEventListener("click", () => {
  const list = PRODUCTS.filter(p => Number(p.estoque||0) <= Number(p.minimo||0));
  renderRel(list);
  setView("relatorios");
});

$("btnRelZerados").addEventListener("click", () => {
  const list = PRODUCTS.filter(p => Number(p.estoque||0) <= 0);
  renderRel(list);
  setView("relatorios");
});

// inicia
setView("estoque");
