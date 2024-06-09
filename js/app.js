let ERROR_DIV = document.getElementById("errors");

let input = document.getElementById("input");
let output = document.getElementById("output");

const translationSpeed = 1000;

let translateTiemout = null;

let history = document.querySelector(".history .card-content");
let historyTimeout = null;
let historyEmpty = true;
let historyEnabled = false;

const DEBUG = false;

// const TRANSLATOR_API_URL = "http://localhost:3000";
const TRANSLATOR_API_URL = "http://91.121.75.14:5000";

console.log("SERVER URL", TRANSLATOR_API_URL);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "’");
}

let loading = document.getElementById("translateLoading");
let loadingTimeout = null;

let lastErrorTS = 0;

function clearError() {
  ERROR_DIV.innerHTML = "";
  ERROR_DIV.classList.remove("visible");
}

function displayError(error) {
  let nowTS = Date.now();
  lastErrorTS = nowTS;
  ERROR_DIV.innerHTML = error;
  ERROR_DIV.classList.add("visible");
  translateLoading.classList.remove("visible");

  setTimeout(() => {
    if (nowTS === lastErrorTS) {
      clearError();
    }
  }, 3000);
}

function fetchTranslation(from, text, to) {
  if (!text.trim()) {
    output.innerHTML = "";
    return;
  }
  let url = `${TRANSLATOR_API_URL}/translate`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from,
      to: to,
      text: text,
    }),
  })
    .then((response) => response.json())
    .then((response) => {
      // Error handling
      if (response.error) {
        displayError(
          "<p>Le serveur de traduction est actuellement indisponible, veuillez réessayer plus tard.</p>"
        );
        return;
      }

      clearTimeout(loadingTimeout);
      loadingTimeout = setTimeout(() => {
        translateLoading.classList.remove("visible");
      }, 500);

      DEBUG && console.log(text, response);

      let newWords = [];
      let details = response.detail_reponse;

      for (let detail of details) {
        let word = detail.word.trim();
        let score = detail.score;

        // generate id
        let wordID =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);

        if (score == -1) {
          // le mot correspond pas
          newWords.push(
            `<span id="notice_${wordID}" class="word unknown-word" onmouseover="showWord('${escapeHtml(
              word
            )}', 'notice_${wordID}', 0)">${word}</span>`
          );
        } else if (score < 1) {
          // le mot correspond pas totalement
          newWords.push(
            `<span id="notice_${wordID}" class="word unexact-word" onmouseover="showWord('${escapeHtml(
              word
            )}', 'notice_${wordID}', ${score})">${word}</span>`
          );
        } else {
          // le mot correspond
          newWords.push(
            `<span id="notice_${wordID}" class="word perfect-word" onmouseover="showWord('${escapeHtml(
              word
            )}', 'notice_${wordID}', ${score})">${word}</span>`
          );
        }
      }

      let translation = newWords.join(" ");

      // affiche la trad
      if (document.getElementsByClassName("placeholder").length !== 0) {
        document.getElementsByClassName("placeholder")[0].remove();
      }

      output.innerHTML = translation;

      // détermine la langue
      let lang = "Français";
      if (to == "lis") {
        lang = "Listenbourgeois";
      }

      // error handling
      if (translation == "Error during translation processing") {
        ERROR_DIV.innerHTML =
          `<h3>La traduction ne s'est pas effectuée correctement !</h3>\n` +
          `<p>${translation}</p>`;
        ERROR_DIV.classList.add("visible");
      }

      // historique
      clearTimeout(historyTimeout);

      historyTimeout = setTimeout(() => {
        if (!historyEnabled) {
          history.innerHTML =
            '<div class="history-line"><div class="history-result">Historique vide, vous n\'avez pas encore traduit quelque chose !</div></div>';
          historyEnabled = true;
          historyEmpty = true;
        }

        if (input.value.trim() !== "") {
          history.innerHTML =
            `
                        <div class="history-line">
                    <div class="history-source">${escapeHtml(
                      input.value
                    )} - EN ${lang.toUpperCase().trim()}</div>
                    <div class="history-result">${escapeHtml(
                      output.innerText
                    )}</div>
                </div>` + (historyEmpty ? "" : history.innerHTML);

          historyEmpty = false;
        }
      }, 1000);
    })
    .catch((error) => {
      console.error(error);
      displayError(
        `
          <h3>Une erreur est survenue !</h3>
          <p>${error}</p>
        `
      );
    });
}

let frenchSelect = document.getElementById("frenchSelect");
let listenishSelect = document.getElementById("listenishSelect");

input.addEventListener("input", function () {
  let from = "fr";
  let to = "lis";

  clearTimeout(historyTimeout);

  if (frenchSelect.checked !== true) {
    from = "lis";
    to = "fr";
  }

  let text = escapeHtml(input.value);

  clearTimeout(translateTiemout);
  translateLoading.classList.add("visible");
  translateTiemout = setTimeout(() => {
    fetchTranslation(from, text, to);
  }, translationSpeed);
});

function Speak() {
  var msg = new SpeechSynthesisUtterance();
  var voices = window.speechSynthesis.getVoices();
  msg.text = output.innerText;
  msg.lang = "de-DE";
  msg.voice = voices[1];
  window.speechSynthesis.speak(msg);
}

function showWord(word, span, score) {
  let str = `"${word}" correspond à <b>${Math.round(score * 100)}%</b>`;

  let theme = "tomato";
  if (score == 0) {
    theme = "wrong";
  } else if (score == 1) {
    theme = "default";
  }

  tippy(document.getElementById(span), {
    theme: theme,
    content: str,
    placement: "bottom",
    arrow: false,
    allowHTML: true,
  });
}
