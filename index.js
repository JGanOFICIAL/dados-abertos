const firebaseConfig = {
  apiKey: "AIzaSyCAlWxc7YxTMcTLCECUDuYfomO6QapreqY",
  authDomain: "login-you-see.firebaseapp.com",
  databaseURL: "https://login-you-see-default-rtdb.firebaseio.com",
  projectId: "login-you-see",
  storageBucket: "login-you-see.appspot.com",
  messagingSenderId: "524877259374",
  appId: "1:524877259374:web:9ff66b67c9c5bf0bb07c7f",
  measurementId: "G-K7E00VXYHG"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let peerConnection, localStream, remoteStream;
let configRTC = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

//////////////////// PLAYER.HTML ////////////////////
if (location.pathname.includes("player.html")) {
  const video = document.getElementById("streamVideo");
  const descEl = document.getElementById("desc");
  const searchOverlay = document.getElementById("searchOverlay");

  window.toggleSearch = function () {
    searchOverlay.style.display = searchOverlay.style.display === "block" ? "none" : "block";
  };

  window.buscar = async function (termo) {
    const snapshot = await db.ref("blogs").once("value");
    const results = document.getElementById("results");
    results.innerHTML = "";
    snapshot.forEach(blog => {
      const data = blog.val();
      if (
        data.nome?.toLowerCase().includes(termo.toLowerCase()) ||
        data.site?.toLowerCase().includes(termo.toLowerCase())
      ) {
        const div = document.createElement("div");
        div.className = "result-item";
        div.innerText = `${data.nome} (${data.site || "sem site"})`;
        div.onclick = () => iniciarPlayer(blog.key);
        results.appendChild(div);
      }
    });
  };

  function iniciarPlayer(blogId) {
    descEl.innerText = "Conectando...";
    db.ref("transmissoes/" + blogId).on("value", async (snap) => {
      const data = snap.val();
      if (data && data.ativo) {
        descEl.innerText = data.descricao || "Sem descrição";

        peerConnection = new RTCPeerConnection(configRTC);
        remoteStream = new MediaStream();
        video.srcObject = remoteStream;

        peerConnection.ontrack = event => {
          remoteStream.addTrack(event.track);
        };

        const offerSnap = await db.ref(`sinal/${blogId}/offer`).once("value");
        const offer = offerSnap.val();
        if (!offer) {
          descEl.innerText = "Transmissão offline";
          return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await db.ref(`sinal/${blogId}/answer`).set(answer.toJSON());

        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            db.ref(`sinal/${blogId}/candidates/viewer`).push(event.candidate.toJSON());
          }
        };

        db.ref(`sinal/${blogId}/candidates/broadcaster`).on("child_added", (snap) => {
          const candidate = new RTCIceCandidate(snap.val());
          peerConnection.addIceCandidate(candidate);
        });

        searchOverlay.style.display = "none";
        carregarAnuncios(blogId);
      } else {
        descEl.innerText = "Transmissão não disponível";
        video.srcObject = null;
      }
    });
  }

  let anuncios = [], anuncioIndex = 0;
  function carregarAnuncios(blogId) {
    db.ref("anuncios/" + blogId).once("value").then(snap => {
      anuncios = [];
      snap.forEach(item => anuncios.push(item.val()));
      setInterval(() => {
        if (anuncios.length > 0) {
          const img = document.createElement("img");
          img.src = anuncios[anuncioIndex];
          img.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;object-fit:cover;transition:opacity 1s;opacity:1";
          document.body.appendChild(img);
          setTimeout(() => {
            img.style.opacity = "0";
            setTimeout(() => img.remove(), 1000);
          }, 6000);
          anuncioIndex = (anuncioIndex + 1) % anuncios.length;
        }
      }, 480000);
    });
  }
}

//////////////////// ADMIN.HTML ////////////////////
if (location.pathname.includes("admin.html")) {
  window.cadastrarBlog = function () {
    const nome = document.getElementById("blogName").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("password").value;
    const site = document.getElementById("siteUrl").value;

    auth.createUserWithEmailAndPassword(email, senha)
      .then(user => {
        const uid = user.user.uid;
        db.ref("blogs/" + uid).set({ nome, site });
        alert("Blog cadastrado com sucesso!");
      })
      .catch(e => alert("Erro: " + e.message));
  };

  const adInputs = document.getElementById("adInputs");
  for (let i = 0; i < 20; i++) {
    const input = document.createElement("input");
    input.placeholder = `URL do anúncio ${i + 1}`;
    adInputs.appendChild(input);
  }

  window.salvarAnuncios = function () {
    const blogId = document.getElementById("editBlogId").value;
    const urls = [...adInputs.querySelectorAll("input")].map(el => el.value).filter(Boolean);
    const ref = db.ref("anuncios/" + blogId);
    ref.remove().then(() => {
      urls.forEach(url => ref.push(url));
      alert("Anúncios atualizados.");
    });
  };

  window.excluirBlog = function () {
    const blogId = document.getElementById("deleteBlogId").value;
    db.ref("blogs/" + blogId).remove();
    db.ref("anuncios/" + blogId).remove();
    db.ref("transmissoes/" + blogId).remove();
    db.ref("sinal/" + blogId).remove();
    alert("Blog excluído.");
  };
}

//////////////////// BLOG.HTML ////////////////////
if (location.pathname.includes("blog.html")) {
  const overlay = document.getElementById("loginOverlay");
  const video = document.getElementById("videoPreview");
  const descInput = document.getElementById("descricao");
  const status = document.getElementById("status");
  const timer = document.getElementById("timer");
  let tempoInicio, transmitindo = false;

  window.fazerLogin = function () {
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginPassword").value;
    auth.signInWithEmailAndPassword(email, senha)
      .then(() => {
        overlay.style.display = "none";
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
          localStream = stream;
          video.srcObject = stream;
          video.play();
        });
      })
      .catch(e => alert("Erro: " + e.message));
  };

  window.iniciarTransmissao = async function () {
    if (!auth.currentUser) return;

    status.innerText = "Transmitindo em 3 minutos...";
    let segundos = 180;
    const intervalo = setInterval(() => {
      timer.innerText = `Faltam ${segundos--} segundos...`;
      if (segundos < 0) {
        clearInterval(intervalo);
        iniciarAgora();
      }
    }, 1000);
  };

  async function iniciarAgora() {
    const uid = auth.currentUser.uid;
    const descricao = descInput.value;

    peerConnection = new RTCPeerConnection(configRTC);
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        db.ref(`sinal/${uid}/candidates/broadcaster`).push(event.candidate.toJSON());
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await db.ref(`sinal/${uid}/offer`).set(offer.toJSON());

    db.ref(`sinal/${uid}/answer`).on("value", async snap => {
      const answer = snap.val();
      if (answer && peerConnection.signalingState !== "closed") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    db.ref(`sinal/${uid}/candidates/viewer`).on("child_added", snap => {
      const candidate = new RTCIceCandidate(snap.val());
      peerConnection.addIceCandidate(candidate);
    });

    await db.ref("transmissoes/" + uid).set({
      ativo: true,
      descricao
    });

    tempoInicio = Date.now();
    transmitindo = true;
    status.innerText = "Transmissão ao vivo!";
    atualizarTempo();
  }

  function atualizarTempo() {
    if (!transmitindo) return;
    const dif = Date.now() - tempoInicio;
    const min = Math.floor(dif / 60000);
    const seg = Math.floor((dif % 60000) / 1000);
    timer.innerText = `Tempo de transmissão: ${min}m ${seg}s`;
    setTimeout(atualizarTempo, 1000);
  }

  window.pararTransmissao = function () {
    if (confirm("Deseja parar a transmissão?")) {
      const uid = auth.currentUser.uid;
      transmitindo = false;
      if (peerConnection) peerConnection.close();
      db.ref("transmissoes/" + uid).remove();
      db.ref("sinal/" + uid).remove();
      status.innerText = "Transmissão encerrada.";
      timer.innerText = "";
    }
  };

  descInput.addEventListener("input", () => {
    if (auth.currentUser && transmitindo) {
      db.ref("transmissoes/" + auth.currentUser.uid).update({
        descricao: descInput.value
      });
    }
  });
}
