(() => {
  const A = window.UniaoApp;
  const $ = id => document.getElementById(id);
  let settings = A.clone(A.defaults);
  let currentReceipt = null;
  let receiptSource = $("receiptPaper");
  const views = ["homeView","registerView","receiptView","lookupView","paymentView","publicConsultView"];
  function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove("show"),3000); }
  function showView(name) { views.forEach(id=>$(id)?.classList.toggle("hidden",id!==name)); $("navMenu").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"}); }
  function setImage(el,url) { if(url){el.src=url;el.classList.remove("hidden");}else{el.removeAttribute("src"); if(el.tagName==="IMG") el.classList.add("hidden");} }
  function renderSettings() {
    document.title = `${settings.title || "Academia União Fitness"} | Inscrições`;
    $("brandName").textContent = settings.title || "Academia União Fitness";
    setImage($("headerLogo"),settings.logo);
    setImage($("welcomeImage"),settings.welcomeImage);
    $("welcomeBanner").style.background = settings.welcomeImage ? "#222" : "linear-gradient(125deg,#2c2c2c,#555)";
    $("welcomeTitle").textContent = settings.welcomeTitle || "Sua próxima conquista começa aqui.";
    $("welcomeDescription").textContent = settings.welcomeDescription || "";
    $("welcomeBanner").querySelector(".welcome-copy").style.fontFamily = settings.font || "DM Sans";
    $("homeContent").innerHTML = (settings.sections||[]).filter(s=>s.enabled!==false).map(s=>{
      if(s.type==="image") return `<section><img src="${A.safeText(s.image||"")}" alt=""></section>`;
      if(s.type==="imageText") return `<section>${s.image?`<img src="${A.safeText(s.image)}" alt="">`:""}<h2>${A.safeText(s.title||"")}</h2><p>${A.safeText(s.text||"")}</p></section>`;
      if(s.type==="video") return `<section><video controls playsinline style="max-width:100%;width:100%" src="${A.safeText(s.video||"")}"></video></section>`;
      if(s.type==="embed") return `<section>${s.code||""}</section>`;
      if(s.type==="news") return `<section><h2>${A.safeText(s.title||"Notícia")}</h2><p>${A.safeText(s.text||"")}</p></section>`;
      return `<section><h2>${A.safeText(s.title||"")}</h2><p>${A.safeText(s.text||"")}</p></section>`;
    }).join("");
    $("benefitsList").innerHTML=(settings.benefits||[]).filter(Boolean).map(b=>`<div class="benefit-chip">${A.safeText(b)}</div>`).join("");
    $("benefitsSection").classList.toggle("hidden",!(settings.benefits||[]).filter(Boolean).length);
    $("developerNameFooter").textContent=settings.developerName||"SAN7DOC";
    $("developerNameReceipt").textContent=settings.developerName||"SAN7DOC";
    setImage($("developerLogoFooter"),settings.developerLogo);
    setImage($("developerLogoReceipt"),settings.developerLogo);
    $("receiptWatermark").style.backgroundImage=settings.logo?`url("${settings.logo}")`:"none";
    setImage($("receiptLogo"),settings.logo);
    document.documentElement.style.setProperty("--font",`"${settings.font||"DM Sans"}",Arial,sans-serif`);
  }
  function fieldMarkup(f,i) {
    const type=["text","email","tel","number","date","url"].includes(f.type)?f.type:"text";
    const required=f.required!==false;
    if(f.type==="textarea") return `<label class="floating-field ${f.wide?"field-wide":""}" data-field="${A.safeText(f.key)}"><textarea id="field_${i}" name="${A.safeText(f.key)}" placeholder=" " ${required?"required":""} rows="2"></textarea><span>${A.safeText(f.label)}${required?" *":""}</span></label>`;
    if(f.type==="select") return `<label class="floating-field ${f.wide?"field-wide":""}" data-field="${A.safeText(f.key)}"><select id="field_${i}" name="${A.safeText(f.key)}" ${required?"required":""}><option value="" selected disabled></option>${(f.options||[]).map(o=>`<option>${A.safeText(o)}</option>`).join("")}</select><span>${A.safeText(f.label)}${required?" *":""}</span></label>`;
    if(f.type==="file") return `<label class="floating-field ${f.wide?"field-wide":""}" data-field="${A.safeText(f.key)}"><input id="field_${i}" name="${A.safeText(f.key)}" type="file" ${required?"required":""} accept="image/*"><span>${A.safeText(f.label)}${required?" *":""}</span></label>`;
    return `<label class="floating-field ${f.wide?"field-wide":""}" data-field="${A.safeText(f.key)}"><input id="field_${i}" name="${A.safeText(f.key)}" type="${type}" placeholder=" " ${required?"required":""} ${type==="number"?'min="1"':''}><span>${A.safeText(f.label)}${required?" *":""}</span></label>`;
  }
  function renderFields() {
    $("formFields").innerHTML=(settings.fields||A.defaults.fields).map(fieldMarkup).join("");
    $("formFields").querySelectorAll("input,select,textarea").forEach(el=>{
      el.addEventListener("blur",()=>validateField(el));
      el.addEventListener("input",()=>{if(el.closest(".floating-field").classList.contains("invalid"))validateField(el);});
      el.addEventListener("change",()=>{if(el.closest(".floating-field").classList.contains("invalid"))validateField(el);});
    });
  }
  function validateField(el) {
    const wrap=el.closest(".floating-field"); if(!wrap)return true;
    const valid=el.checkValidity() && (el.type!=="email" || !el.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value));
    wrap.classList.toggle("invalid",!valid);
    let error=wrap.querySelector(".field-error");
    if(!valid){if(!error){error=document.createElement("small");error.className="field-error";wrap.append(error);}error.textContent=el.value?"Confira este campo.":"Este campo é obrigatório.";}
    else if(error)error.remove();
    return valid;
  }
  function newReceiptNumber() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 100000000).padStart(8,"0"); }
  function checkDigit(num) { let sum=0; for(let i=0;i<num.length;i++)sum+=Number(num[i])*(i%2?3:1);return String((100-sum%100)%100).padStart(2,"0"); }
  function renderReceipt(record) {
    currentReceipt=record;
    $("receiptNumber").textContent="#"+record.number;
    $("receiptCheck").textContent=record.check;
    $("receiptToken").textContent=record.token;
    $("receiptDetails").innerHTML=Object.entries(record.data||{}).map(([label,value])=>`<div class="detail-item"><small>${A.safeText(label)}</small><strong>${A.safeText(value)}</strong></div>`).join("");
    $("receiptQr").innerHTML="";
    if(window.QRCode) new QRCode($("receiptQr"),{text:JSON.stringify({id:record.token,registration:record.number,check:record.check}),width:112,height:112,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
    showView("receiptView");
  }
  function createReceipt(record) {
    $("receiptWatermark").style.backgroundImage=settings.logo?`url("${settings.logo}")`:"none";
    renderReceipt(record);
  }
  async function downloadReceipt(kind, element=$("receiptPaper")) {
    if(!window.html2canvas){toast("Não foi possível preparar a imagem.");return;}
    try {
      const canvas=await html2canvas(element,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
      if(kind==="png"){const a=document.createElement("a");a.download=`comprovante-${currentReceipt?.number||"inscricao"}.png`;a.href=canvas.toDataURL("image/png");a.click();}
      else {const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});const img=canvas.toDataURL("image/png");const width=190;const height=canvas.height*width/canvas.width;pdf.addImage(img,"PNG",10,10,width,Math.min(height,277));pdf.save(`comprovante-${currentReceipt?.number||"inscricao"}.pdf`);}
    } catch(e){toast("Falha ao gerar o arquivo. Tente novamente.");}
  }
  function openReceiptModal(record) {
    const clone=$("receiptPaper").cloneNode(true);clone.id="modalReceiptPaper";
    $("modalReceiptMount").innerHTML="";$("modalReceiptMount").appendChild(clone);
    clone.querySelector("#receiptNumber").textContent="#"+record.number;
    clone.querySelector("#receiptCheck").textContent=record.check;
    clone.querySelector("#receiptToken").textContent=record.token;
    clone.querySelector("#receiptDetails").innerHTML=Object.entries(record.data||{}).map(([k,v])=>`<div class="detail-item"><small>${A.safeText(k)}</small><strong>${A.safeText(v)}</strong></div>`).join("");
    clone.querySelector("#receiptQr").innerHTML="";if(window.QRCode)new QRCode(clone.querySelector("#receiptQr"),{text:JSON.stringify({id:record.token,registration:record.number,check:record.check}),width:112,height:112});
    $("receiptModal").classList.remove("hidden");
    $("modalDownloadPng").onclick=()=>downloadReceipt("png",clone);
    $("modalDownloadPdf").onclick=()=>downloadReceipt("pdf",clone);
  }
  async function loadSettings() {
    const remote=await A.read("unionFitness/settings",null);
    if(remote)settings={...A.clone(A.defaults),...remote,fields:remote.fields||A.clone(A.defaults.fields)};
    renderSettings();renderFields();
  }
  $("menuToggle").addEventListener("click",()=>$("navMenu").classList.toggle("open"));
  document.addEventListener("click",e=>{const nav=e.target.closest("[data-view]");if(nav){e.preventDefault();const v=nav.dataset.view;showView(({home:"homeView",register:"registerView",lookup:"lookupView"})[v]||"homeView");}});
  $("brandHome").addEventListener("click",e=>{e.preventDefault();showView("homeView");});
  $("registrationForm").addEventListener("submit",async e=>{
    e.preventDefault();$("formError").textContent="";
    const els=[...$("formFields").querySelectorAll("input,select,textarea")];let valid=true;
    els.forEach(el=>{if(!validateField(el))valid=false;});
    if(!valid){$("formError").textContent="Confira os campos destacados antes de continuar.";const first=$("formFields").querySelector(".invalid input,.invalid select,.invalid textarea");first?.focus();return;}
    const btn=$("submitRegistration");btn.disabled=true;btn.querySelector(".spinner").classList.remove("hidden");btn.querySelector(".btn-label").textContent="Processando";
    try {
      const data={};const labels={};
      for(const el of els){const f=(settings.fields||[]).find(x=>x.key===el.name);let value=el.value.trim();if(el.type==="file"&&el.files?.[0])value=await A.upload(el.files[0]);data[f?.label||el.name]=value;labels[el.name]=value;}
      const number=newReceiptNumber();const record={number,check:checkDigit(number),token:A.token46(),data,labels,phone:labels.phone||labels.tel||"",name:labels.fullName||labels.nomeCompleto||"",createdAt:Date.now(),status:settings.payment?.enabled?"aguardando_pagamento":"confirmada"};
      const key=await A.push("unionFitness/registrations",record);record.key=key;
      if(settings.payment?.enabled){window._pendingUnionRecord=record;showPayment(record);}
      else createReceipt(record);
      $("registrationForm").reset();$("formFields").querySelectorAll(".invalid").forEach(el=>el.classList.remove("invalid"));
    } catch(err){$("formError").textContent=err.message||"Não foi possível concluir a inscrição.";toast("Não foi possível concluir a inscrição.");}
    finally{btn.disabled=false;btn.querySelector(".spinner").classList.add("hidden");btn.querySelector(".btn-label").textContent="Concluir inscrição";}
  });
  function showPayment(record) {
    showView("paymentView");const p=settings.payment||{};
    $("paymentAmount").textContent=p.amount?`Valor da inscrição: ${p.amount}`:"";
    $("paymentKey").textContent=p.pixKey?`Chave Pix: ${p.pixKey}`:"";
    setImage($("paymentQr"),p.qr);
    $("confirmWhatsapp").onclick=()=>{const phone=A.digits(p.whatsapp||"");const msg=encodeURIComponent(`Olá! Quero confirmar o pagamento da inscrição. Nome: ${record.name||"não informado"}. Número de referência: ${record.number}.`);if(phone)window.open(`https://wa.me/${phone}?text=${msg}`,"_blank","noopener");else toast("O WhatsApp de confirmação ainda não foi configurado.");};
  }
  async function searchRecords(name,phone) {
    const all=await A.read("unionFitness/registrations",{});
    return Object.entries(all||{}).map(([key,r])=>({...r,key})).filter(r=>(r.name||Object.values(r.data||{}).find((v)=>String(v).toLowerCase()===name.toLowerCase()))?.toLowerCase()===name.toLowerCase()&&A.phoneMatch(r.phone||Object.entries(r.data||{}).find(([k])=>/telefone|tel/i.test(k))?.[1]||"",phone)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  }
  function resultMarkup(records) {
    if(!records.length)return '<p>Não encontramos inscrição com esses dados. Confira o nome e o telefone.</p>';
    return records.map(r=>`<div class="lookup-card"><div><h3>Inscrição #${A.safeText(r.number)}</h3><p>${A.safeText(r.name||"Participante")} · ${new Date(r.createdAt||Date.now()).toLocaleDateString("pt-BR")} · ${A.safeText(r.status||"confirmada")}</p></div><button class="btn btn-outline" data-open-receipt="${A.safeText(r.key)}">Ver comprovante</button></div>`).join("");
  }
  async function doLookup(name,phone,target) {
    target.textContent="Pesquisando...";
    try {const records=await searchRecords(name.trim(),phone.trim());target.innerHTML=resultMarkup(records);target.querySelectorAll("[data-open-receipt]").forEach(btn=>btn.addEventListener("click",async()=>{const r=records.find(x=>x.key===btn.dataset.openReceipt);if(r){settings=await A.read("unionFitness/settings",settings)||settings;renderSettings();openReceiptModal(r);}}));}
    catch(e){target.textContent="Não foi possível consultar agora. Tente novamente.";}
  }
  $("lookupForm").addEventListener("submit",e=>{e.preventDefault();doLookup($("lookupName").value,$("lookupPhone").value,$("lookupResults"));});
  $("publicConsultForm").addEventListener("submit",e=>{e.preventDefault();doLookup($("consultName").value,$("consultPhone").value,$("publicConsultResults"));});
  $("backHome").onclick=()=>showView("homeView");
  $("downloadPng").onclick=()=>downloadReceipt("png");
  $("downloadPdf").onclick=()=>downloadReceipt("pdf");
  $("closeReceiptModal").onclick=()=>$("receiptModal").classList.add("hidden");
  $("receiptModal").addEventListener("click",e=>{if(e.target===$("receiptModal"))$("receiptModal").classList.add("hidden");});
  $("languageSelect").addEventListener("change",()=>toast("A opção de idioma é demonstrativa."));
  loadSettings();
})();