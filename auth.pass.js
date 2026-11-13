 Inicialização centralizada dos serviços do Estúdio Karyna Santos. */
(function () {
  "use strict";

  function initialize() {
    if (!window.ESTUDIO_ENV) throw new Error("env.js não foi carregado.");
    if (!window.firebase) throw new Error("SDK do Firebase não foi carregado.");

    if (!firebase.apps.length) firebase.initializeApp(window.ESTUDIO_ENV.firebase);
    const db = firebase.database();
    const cloud = window.ESTUDIO_ENV.cloudinary;

    window.estudioService = Object.freeze({
      db,
      uploadImage: async function (file) {
        if (!file) throw new Error("Selecione uma imagem.");
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", cloud.uploadPreset);
        const response = await fetch(
          "https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud.cloudName) + "/image/upload",
          { method: "POST", body: form }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "Falha no envio da imagem.");
        return result.secure_url;
      }
    });

    window.dispatchEvent(new Event("estudio-service-ready"));
  }

  try {
    initialize();
  } catch (error) {
    window.estudioServiceError = error;
    console.error("Falha ao iniciar os serviços do Estúdio:", error);
  }
})();
