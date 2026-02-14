// ====== CONFIG ======
const API_URL = "https://script.google.com/macros/s/AKfycbx51cpeTeES9rv244ve1CAN1yFNDbANb4Ovyy5hFPpctmNFskSvZrBvtM1jIWkxWWM/exec"; // <- cole a URL do Apps Script

let TOKEN = "";

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);

function setStatus(ok, text) {
  const el = $("status");
  el.textContent = text;
  el.style.background = ok ? "#1b5e20" : "#2a3242";
}

async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("token", TOKEN);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));

  const r = await fetch(url.toString());
  return r.json();
}

async function apiPost(payload) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token: TOKEN })
  });
  return r.json();
}

function norm(s){ return String(s||"").toLowerCase().trim(); }

function money(v){
  const n = Number(String(v).replace(",", "."));
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

// ====== UI RENDER ======
let PRODUCTS = [];

function renderProducts(list) {
  const tb = $("tbl").querySelector("tbody");
  tb.innerHTML = "";

  list.forEach(p => {
    const tr = document.createElement("tr");

    const estoque = Number(p.estoque || 0);
    const minimo  = Number(p.minimo || 0);

    if (estoque <= minimo) tr.classList.add("low");
    if (estoque <= 0) tr.classList.add("bad");

    tr.innerHTML = `
      <td>${p.sku ?? ""}</td>
      <td>${p.nome ?? ""}</td>
      <td>${p.categoria ?? ""}</td>
      <td>${p.estoque ?? 0}</td>
      <td>${p.minimo ?? 0}</td>
      <td>${money(p.preco)}</td>
    `;

    tr.addEventListener("click", () => fillProductForm(p));
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
  $("p_ativo").value = p.ativo || "SIM";
  $("m_sku").value = p.sku || "";
}

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

// ====== LOADERS ======
async function ping(){
  const r = await apiGet("ping");
  setStatus(r.ok, r.ok ? "online" : "offline");
  return r.ok;
}

async function loadProducts(){
  const r = await apiGet("listProducts");
  if (!r.ok) return alert(r.error);

  PRODUCTS = r.products || [];
  applyFilter();
}

function applyFilter(){
  const q = norm($("search").value);
  const filtered = !q ? PRODUCTS : PRODUCTS.filter(p => {
    const bag = `${p.sku} ${p.nome} ${p.categoria} ${p.marca}`.toLowerCase();
    return bag.includes(q);
  });
  renderProducts(filtered);
}

async function saveProduct(){
  const product = {
    sku: $("p_sku").value.trim(),
    nome: $("p_nome").value.trim(),
    categoria: $("p_categoria").value.trim(),
    marca: $("p_marca").value.trim(),
    custo: $("p_custo").value.trim(),
    preco: $("p_preco").value.trim(),
    estoque: $("p_estoque").value.trim(),
    minimo: $("p_minimo").value.trim(),
    local: $("p_local").value.trim(),
    ativo: $("p_ativo").value
  };

  const r = await apiPost({ action: "upsertProduct", product });
  if (!r.ok) return alert(r.error);

  alert(r.message);
  await loadProducts();
}

async function moveStock(){
  const move = {
    tipo: $("m_tipo").value,
    sku: $("m_sku").value.trim(),
    quantidade: $("m_qtd").value.trim(),
    obs: $("m_obs").value.trim(),
    usuario: $("m_usuario").value.trim() || "JB"
  };

  const r = await apiPost({ action: "moveStock", move });
  if (!r.ok) return alert(r.error);

  alert(`${r.message}\nSKU: ${r.sku}\nAntes: ${r.estoque_anterior}\nAgora: ${r.estoque_novo}`);
  await loadProducts();
}

async function loadMoves(){
  const limit = $("movLimit").value || "50";
  const r = await apiGet("listMoves", { limit });
  if (!r.ok) return alert(r.error);
  renderMoves(r.moves || []);
}

// ====== EVENTS ======
$("btnLogin").addEventListener("click", async () => {
  TOKEN = $("token").value.trim();
  if (!TOKEN) return alert("Digite a senha");
  const ok = await ping();
  if (ok) {
    await loadProducts();
    await loadMoves();
  } else {
    alert("Senha inválida ou API offline");
  }
});

$("btnReload").addEventListener("click", loadProducts);
$("search").addEventListener("input", applyFilter);

$("btnSaveProduct").addEventListener("click", saveProduct);
$("btnMove").addEventListener("click", moveStock);
$("btnLoadMoves").addEventListener("click", loadMoves);

