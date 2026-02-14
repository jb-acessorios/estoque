// ===============================
// JB ACESSÓRIOS - Sistema básico com ABAS
// ===============================

const API_URL = "COLE_AQUI_A_URL_DO_WEB_APP";

let TOKEN = "";
let PRODUCTS = [];

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

// ===== ABAS =====
function setTab(tabName){
  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.add("active");
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

// ===== PRODUTOS =====
function renderProducts(list){
  const tb = $("tbl").querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(p => {
    const tr = document.createElement("tr");

    const estoque = Number(p.estoque || 0);
    const minimo  = Number(p.minimo  || 0);

    if (estoque <= minimo) tr.classList.add("low");
    if (estoque <= 0) tr.classList.add("bad");

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
      fillProductForm(p);
      setTab("produtos");
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

  // já joga sku pra movimentar
  $("m_sku").value = p.sku || "";
}

function clearProductForm(){
  ["p_sku","p_nome","p_categoria","p_marca","p_custo","p_preco","p_estoque","p_minimo","p_local"].forEach(id => $(id).value = "");
  $("p_ativo").value = "SIM";
}

function applyFilter(){
  const q = norm($("search").value);
  const filtered = !q ? PRODUCTS : PRODUCTS.filter(p => {
    const bag = `${p.sku} ${p.nome} ${p.categoria} ${p.marca} ${p.local} ${p.ativo}`.toLowerCase();
    return bag.includes(q);
  });
  renderProducts(filtered);
}

async function loadProducts(){
  const r = await apiGet("listProducts");
  if (!r.ok) return alert(r.error);
  PRODUCTS = r.products || [];
  applyFilter();
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
  await loadProducts();
}

// ===== MOVIMENTAR =====
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

  $("m_qtd").value = "";
  $("m_obs").value = "";

  await loadProducts();
}

// ===== MOVIMENTOS =====
function renderMoves(moves){
  const tb = $("tblMoves").querySelector("tbody");
  tb.innerHTML = "";

  moves.forEach(m => {
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

async function loadMoves(){
  const limit = $("movLimit").value || "50";
  const r = await apiGet("listMoves", { limit });
  if (!r.ok) return alert(r.error);
  renderMoves(r.moves || []);
}

// ===== LOGIN =====
async function ping(){
  const r = await apiGet("ping");
  setStatus(r.ok, r.ok ? "online" : "offline");
  return r.ok;
}

$("btnLogin").addEventListener("click", async () => {
  TOKEN = $("token").value.trim();
  if (!TOKEN) return alert("Digite a senha.");

  const ok = await ping();
  if (!ok) return alert("Senha inválida ou API offline.");

  await loadProducts();
  await loadMoves();
});

// ===== EVENTOS UI =====
$("btnReload").addEventListener("click", loadProducts);
$("btnQuickReload").addEventListener("click", loadProducts);
$("search").addEventListener("input", applyFilter);

$("btnSaveProduct").addEventListener("click", saveProduct);
$("btnClearProduct").addEventListener("click", clearProductForm);

$("btnMove").addEventListener("click", moveStock);
$("btnLoadMoves").addEventListener("click", loadMoves);

// inicia na aba Produtos
setTab("produtos");
