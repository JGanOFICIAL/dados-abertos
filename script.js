// script.js
const firebaseConfig = {
  apiKey:"AIzaSyBs2GrFPGib7Nz02F03Eeo5DTW-8OTJmFI",
  authDomain:"san7-2b351.firebaseapp.com",
  databaseURL:"https://san7-2b351-default-rtdb.firebaseio.com",
  projectId:"san7-2b351",
  storageBucket:"san7-2b351.appspot.com",
  messagingSenderId:"511547914036",
  appId:"1:511547914036:web:0595e39aef88258c649761"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(), db = firebase.database();

const errorBox = document.getElementById('errorBox'),
  loadingOverlay = document.getElementById('loadingOverlay'),
  loginForm = document.getElementById('loginForm'),
  registerForm = document.getElementById('registerForm'),
  app = document.getElementById('app'),
  fileList = document.getElementById('fileList'),
  previewOverlay = document.getElementById('previewOverlay'),
  previewFrame = document.getElementById('previewFrame'),
  previewList = document.getElementById('previewList'),
  uploadBtn = document.getElementById('uploadBtn'),
  realFileInput = document.getElementById('realFileInput'),
  searchInput = document.getElementById('search'),
  toggleUserInfoBtn = document.getElementById('toggleUserInfoBtn'),
  userNameSpan = document.getElementById('userName'),
  userCPFSpan = document.getElementById('userCPF'),
  userEmailSpan = document.getElementById('userEmail'),
  downloadDocBtn = document.getElementById('downloadDocBtn'),
  deleteDocBtn = document.getElementById('deleteDocBtn'),
  closePreviewBtn = document.getElementById('closePreview'),
  loginBtn = document.getElementById('loginBtn'),
  registerBtn = document.getElementById('registerBtn'),
  logoutBtn = document.getElementById('logoutBtn');

let currentUserId = null;
let currentDocKey = null;
let currentFileData = null;
let userVisible = true;
let filesToUpload = [];

function showError(msg){
  errorBox.innerText = msg;
  errorBox.style.display = 'block';
  setTimeout(() => errorBox.style.display = 'none', 4000);
}

function toggleForms(view){
  if(view === 'login'){
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    app.style.display = 'none';
  } else if(view === 'register'){
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    app.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    app.style.display = 'block';
  }
}

function togglePassword(){
  let pwInput = document.getElementById('registerPassword');
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
}

document.getElementById('registerCPF').addEventListener('input', function(){
  let v = this.value.replace(/\D/g,"");
  v = v.replace(/(\d{3})(\d)/,"$1.$2");
  v = v.replace(/(\d{3})(\d)/,"$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
  this.value = v;
});

toggleUserInfoBtn.onclick = () => {
  userVisible = !userVisible;
  if(userVisible){
    showUserData(currentUserId);
    toggleUserInfoBtn.innerText = 'Ocultar Dados';
  } else {
    userNameSpan.innerText = '********';
    userCPFSpan.innerText = '********';
    userEmailSpan.innerText = '********';
    toggleUserInfoBtn.innerText = 'Ver Dados';
  }
};

function showUserData(uid){
  if(!uid) return;
  db.ref(`users/${uid}`).once('value').then(snapshot => {
    const d = snapshot.val();
    if(d){
      userNameSpan.innerText = d.nome || '---';
      userCPFSpan.innerText = d.cpf || '---';
      userEmailSpan.innerText = d.email || '---';
    }
  });
}

registerBtn.onclick = () => {
  const nome = document.getElementById('registerName').value.trim(),
    cpf = document.getElementById('registerCPF').value.trim(),
    email = document.getElementById('registerEmail').value.trim(),
    senha = document.getElementById('registerPassword').value.trim();

  if(!nome || !cpf || !email || !senha){
    showError("Preencha todos os campos.");
    return;
  }
  loadingOverlay.style.display = 'flex';
  auth.createUserWithEmailAndPassword(email, senha)
    .then(userCredential => {
      return db.ref(`users/${userCredential.user.uid}`).set({nome, cpf, email});
    })
    .then(() => {
      toggleForms('login');
      showError("Cadastro efetuado com sucesso. Faça login.");
    })
    .catch(e => showError(e.message))
    .finally(() => loadingOverlay.style.display = 'none');
};

loginBtn.onclick = () => {
  const email = document.getElementById('loginEmail').value.trim(),
    senha = document.getElementById('loginPassword').value.trim();

  if(!email || !senha){
    showError("Informe email e senha.");
    return;
  }
  loadingOverlay.style.display = 'flex';
  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      toggleForms('');
    })
    .catch(e => showError(e.message))
    .finally(() => loadingOverlay.style.display = 'none');
};

logoutBtn.onclick = () => {
  auth.signOut().then(() => {
    toggleForms('login');
    fileList.innerHTML = '';
    previewList.innerHTML = '';
    filesToUpload = [];
    uploadBtn.disabled = true;
  });
};

function resetUploadState(){
  previewList.innerHTML = '';
  filesToUpload = [];
  uploadBtn.disabled = true;
  realFileInput.value = '';
}

realFileInput.addEventListener('change', () => {
  const files = Array.from(realFileInput.files);
  previewList.innerHTML = '';
  filesToUpload = [];
  if(files.length === 0){
    uploadBtn.disabled = true;
    return;
  }
  let invalidFile = false;
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if(!['pdf','doc','docx','txt'].includes(ext)){
      invalidFile = true;
      return;
    }
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.textContent = file.name;
    previewList.appendChild(previewItem);
    filesToUpload.push(file);
  });
  if(invalidFile){
    showError("Apenas arquivos PDF, DOC, DOCX ou TXT são permitidos.");
    resetUploadState();
    return;
  }
  uploadBtn.disabled = filesToUpload.length === 0;
});

uploadBtn.onclick = () => {
  if(filesToUpload.length === 0) {
    showError("Selecione arquivos para enviar.");
    return;
  }
  loadingOverlay.style.display = 'flex';
  let uploadCount = 0;
  filesToUpload.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = {
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        conteudo: e.target.result,
        uid: currentUserId,
        timestamp: Date.now()
      };
      const key = db.ref('docs').push().key;
      db.ref('docs/' + key).set(data).then(() => {
        uploadCount++;
        if(uploadCount === filesToUpload.length){
          resetUploadState();
          loadFiles(searchInput.value.trim());
          loadingOverlay.style.display = 'none';
        }
      }).catch(err => {
        showError("Erro ao enviar arquivo: " + err.message);
        loadingOverlay.style.display = 'none';
      });
    };
    reader.readAsDataURL(file);
  });
};

function loadFiles(filter = ""){
  fileList.innerHTML = "";
  db.ref('docs').orderByChild('uid').equalTo(currentUserId).once('value').then(snapshot => {
    const files = [];
    snapshot.forEach(child => {
      const doc = child.val();
      if(doc.nome.toLowerCase().includes(filter.toLowerCase())){
        files.push({key: child.key, data: doc});
      }
    });
    files.sort((a,b) => b.data.timestamp - a.data.timestamp);
    if(files.length === 0){
      fileList.innerHTML = '<p style="font-weight:bold; text-align:center; color:#555; margin-top:15px;">Nenhum documento encontrado.</p>';
      return;
    }
    files.forEach(({key, data}) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML = `
        <div class="file-header">
          <input type="checkbox" data-key="${key}" />
          <div class="file-name" title="${data.nome}">#${new Date(data.timestamp).toLocaleString()} - ${data.nome}</div>
        </div>
        <div class="file-meta">Tipo: ${data.tipo || 'Desconhecido'}</div>
        <div class="file-actions">
          <img src="https://images.vexels.com/media/users/3/223479/isolated/preview/8ecc75c9d0cf6d942cce96e196d4953f-icone-da-lixeira-plana.png" title="Excluir" alt="Excluir" class="icon-btn" data-key="${key}" />
        </div>
      `;
      // Open preview on clicking file name
      card.querySelector('.file-name').onclick = () => openPreview(key);
      // Delete on clicking trash icon
      card.querySelector('.icon-btn').onclick = e => {
        e.stopPropagation();
        confirmDelete(key);
      };
      fileList.appendChild(card);
    });
  });
}

function openPreview(key){
  db.ref('docs/' + key).once('value').then(snap => {
    if(!snap.exists()) {
      showError("Documento não encontrado.");
      return;
    }
    currentDocKey = key;
    currentFileData = snap.val();
    previewFrame.src = currentFileData.conteudo;
    previewOverlay.style.display = 'flex';
  });
}

function confirmDelete(key){
  if(confirm("Deseja excluir este arquivo?")){
    db.ref('docs/' + key).remove().then(() => {
      if(currentDocKey === key){
        previewOverlay.style.display = 'none';
        currentDocKey = null;
        currentFileData = null;
      }
      loadFiles(searchInput.value.trim());
    }).catch(err => {
      showError("Erro ao excluir: " + err.message);
    });
  }
}

closePreviewBtn.onclick = () => {
  previewOverlay.style.display = 'none';
};

deleteDocBtn.onclick = () => {
  if(currentDocKey){
    confirmDelete(currentDocKey);
    previewOverlay.style.display = 'none';
  }
};

downloadDocBtn.onclick = () => {
  if(!currentFileData) return;
  const a = document.createElement('a');
  a.href = currentFileData.conteudo;
  a.download = currentFileData.nome;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

function buscarAgora(){
  loadFiles(searchInput.value.trim());
}

searchInput.addEventListener('keyup', () => {
  loadFiles(searchInput.value.trim());
});

auth.onAuthStateChanged(user => {
  if(user){
    currentUserId = user.uid;
    toggleForms('');
    showUserData(currentUserId);
    loadFiles();
  } else {
    currentUserId = null;
    toggleForms('login');
  }
});
