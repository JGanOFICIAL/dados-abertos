window.UniaoApp = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyCVdKIP6jl-mLaqHNMW-IwK3pVkvhuSvSI",
    databaseURL: "https://san7-brasil-default-rtdb.firebaseio.com",
    projectId: "san7-brasil",
    authDomain: "san7-brasil.firebaseapp.com"
  };
  const CLOUD_NAME = "dzmjto17f";
  const UPLOAD_PRESET = "ml_default";
  const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  let db = null;
  try {
    if (window.firebase && !firebase.apps.length) firebase.initializeApp(firebaseConfig);
    if (window.firebase) db = firebase.database();
  } catch (e) { console.error(e); }
  const defaults = {
    title:"Academia União Fitness",
    welcomeTitle:"Sua próxima conquista começa aqui.",
    welcomeDescription:"Faça sua inscrição e venha fazer parte da nossa equipe.",
    welcomeImage:"",
    logo:"",
    developerLogo:"",
    developerName:"SAN7DOC",
    font:"DM Sans",
    fields:[
      {key:"fullName",label:"Nome completo",type:"text",required:true},
      {key:"address",label:"Endereço",type:"text",required:true},
      {key:"email",label:"E-mail",type:"email",required:true},
      {key:"phone",label:"Telefone",type:"tel",required:true},
      {key:"city",label:"Cidade",type:"text",required:true},
      {key:"age",label:"Idade",type:"number",required:true},
      {key:"advisory",label:"Acessória",type:"text",required:true},
      {key:"team",label:"Equipe",type:"text",required:true},
      {key:"coupon",label:"Cupom de desconto",type:"text",required:false}
    ],
    sections:[],
    benefits:[],
    payment:{enabled:false,amount:"",pixKey:"",qr:"",whatsapp:""},
    event:{name:"Inscrições abertas",description:""}
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  async function read(path, fallback=null) {
    if (!db) return fallback;
    try { const snap = await db.ref(path).once("value"); return snap.exists() ? snap.val() : fallback; } catch(e) { return fallback; }
  }
  async function write(path, value) {
    if (!db) throw new Error("Não foi possível conectar ao Firebase. Verifique a conexão e as regras do banco.");
    await db.ref(path).set(value);
  }
  async function push(path, value) {
    if (!db) throw new Error("Não foi possível conectar ao Firebase. Verifique a conexão e as regras do banco.");
    const ref = db.ref(path).push();
    await ref.set(value);
    return ref.key;
  }
  async function update(path, value) {
    if (!db) throw new Error("Não foi possível conectar ao Firebase.");
    await db.ref(path).update(value);
  }
  async function upload(file) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, {method:"POST",body:form});
    const data = await res.json();
    if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Falha ao enviar imagem para o Cloudinary.");
    return data.secure_url;
  }
  function token46() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint8Array(46);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>chars[b % chars.length]).join("").replace(/(.{8})(?=.)/g,"$1-").slice(0,56);
  }
  function digits(n) { return String(n).replace(/\D/g,""); }
  function phoneMatch(a,b) { return digits(a) === digits(b); }
  function safeText(value) { return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  return {db,defaults,clone,read,write,push,update,upload,token46,digits,phoneMatch,safeText};
})();