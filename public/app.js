const $ = s => document.querySelector(s);
let currentUser = null;
async function api(url, options={}) {
  const res = await fetch(url,{headers:{"Content-Type":"application/json"},...options});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
function message(text){const el=$("#message");el.textContent=text;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3000);}
function showPanel(id){["shopPanel","cartPanel","ordersPanel","adminPanel"].forEach(p=>$("#"+p).classList.toggle("hidden",p!==id));}
function money(v){return "₹"+Number(v).toFixed(2);}
async function loadProducts(){
 const q=encodeURIComponent($("#search").value||"");const products=await api("/api/products?q="+q);
 $("#products").innerHTML=products.map(p=>`<article class="product"><h3>${escapeHtml(p.name)}</h3><p class="muted">${escapeHtml(p.description)}</p><p class="price">${money(p.price)}</p><p class="muted">Stock: ${p.stock}</p><button onclick="addCart(${p.id})" ${p.stock===0?"disabled":""}>Add to Cart</button></article>`).join("");
 if(currentUser?.role==="admin") loadAdmin();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function refreshCart(){
 if(!currentUser){$("#cartCount").textContent="0";return;}
 const cart=await api("/api/cart");$("#cartCount").textContent=cart.reduce((a,i)=>a+i.quantity,0);
 $("#cart").innerHTML=cart.length?cart.map(i=>`<div class="cartrow"><span>${escapeHtml(i.name)} — ${money(i.price)}</span><input type="number" min="0" value="${i.quantity}" onchange="updateQty(${i.productId},this.value)"><strong>${money(i.price*i.quantity)}</strong><button onclick="updateQty(${i.productId},0)">Remove</button></div>`).join("")+`<h3>Total: ${money(cart.reduce((a,i)=>a+i.price*i.quantity,0))}</h3>`:"Your cart is empty.";
}
async function addCart(id){try{await api("/api/cart",{method:"POST",body:JSON.stringify({productId:id,quantity:1})});await refreshCart();message("Product added to cart");}catch(e){message(e.message);}}
async function updateQty(id,q){try{await api("/api/cart/"+id,{method:"PATCH",body:JSON.stringify({quantity:Number(q)})});await refreshCart();}catch(e){message(e.message);}}
async function loadOrders(){const orders=await api("/api/orders");$("#orders").innerHTML=orders.length?orders.reverse().map(o=>`<div class="orderrow"><div><b>Order #${o.id}</b><p class="muted">${new Date(o.createdAt).toLocaleString()} · ${o.status}</p><p>${o.items.map(i=>escapeHtml(i.name)+" × "+i.quantity).join(", ")}</p></div><strong>${money(o.total)}</strong></div>`).join(""):"No orders yet.";}
async function loadAdmin(){const ps=await api("/api/products");$("#adminProducts").innerHTML=ps.map(p=>`<div class="adminrow"><span><b>${escapeHtml(p.name)}</b> · ${money(p.price)} · stock ${p.stock}</span><span><button onclick="editProduct(${p.id},${p.price},${p.stock})">Update</button> <button onclick="deleteProduct(${p.id})">Delete</button></span></div>`).join("");}
async function editProduct(id,price,stock){const newPrice=prompt("New price:",price);if(newPrice===null)return;const newStock=prompt("New stock:",stock);if(newStock===null)return;try{await api("/api/admin/products/"+id,{method:"PUT",body:JSON.stringify({price:Number(newPrice),stock:Number(newStock)})});await loadProducts();message("Product updated");}catch(e){message(e.message);}}
async function deleteProduct(id){if(!confirm("Delete this product?"))return;try{await api("/api/admin/products/"+id,{method:"DELETE"});await loadProducts();message("Product deleted");}catch(e){message(e.message);}}
$("#loginForm").onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/login",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});currentUser=d.user;await init();message("Login successful");}catch(err){message(err.message);}};
$("#registerForm").onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/register",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});currentUser=d.user;await init();message("Registration successful");}catch(err){message(err.message);}};
$("#productForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/admin/products",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});e.target.reset();await loadProducts();message("Product created");}catch(err){message(err.message);}};
$("#checkout").onclick=async()=>{try{const d=await api("/api/checkout",{method:"POST",body:"{}"});await refreshCart();await loadOrders();message("Order #"+d.order.id+" placed successfully");showPanel("ordersPanel");}catch(e){message(e.message);}};
$("#search").oninput=loadProducts;
$("#shopTab").onclick=()=>showPanel("shopPanel");
$("#cartTab").onclick=async()=>{showPanel("cartPanel");await refreshCart();};
$("#ordersTab").onclick=async()=>{if(!currentUser)return message("Please login first");showPanel("ordersPanel");await loadOrders();};
$("#adminTab").onclick=async()=>{if(currentUser?.role!=="admin")return message("Admin login required");showPanel("adminPanel");await loadAdmin();};
async function init(){const d=await api("/api/me");currentUser=d.user;$("#account").innerHTML=currentUser?`Hello, ${escapeHtml(currentUser.name)} <button id="logout">Logout</button>`:"Guest";if(currentUser){$("#authPanel").classList.add("hidden");$("#logout").onclick=async()=>{await api("/api/logout",{method:"POST"});currentUser=null;$("#authPanel").classList.remove("hidden");$("#account").textContent="Guest";await refreshCart();};}else $("#authPanel").classList.remove("hidden");await loadProducts();await refreshCart();}
init().catch(e=>message(e.message));
