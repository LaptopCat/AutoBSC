// ==UserScript==
// @name         AutoBSC++
// @namespace    https://github.com/LaptopCat
// @homepageURL  https://github.com/LaptopCat/AutoBSC
// @supportURL   https://github.com/LaptopCat/AutoBSC/issues
// @license      MIT
// @version      0.2.2
// @description  Auto completes Brawl Stars Championship live stream events
// @author       laptopcat
// @match        https://event.supercell.com/brawlstars/*
// @icon         https://event.supercell.com/brawlstars/page-icon.ico
// @grant        none
// ==/UserScript==

function load(key, def) {
    let res = localStorage.getItem("autobsc-" + key)

    if (res === null) {
        store(key, def)
        return def
    } else {
        return JSON.parse(res)
    }
}

function store(key, val) {
    localStorage.setItem("autobsc-"+key, JSON.stringify(val))
}

// ==================== Begin AutoBSC Configuration ====================
// This is the default configuration
// load(config_key, default_value)
// Do not change the config key unless you know what you are doing

// Auto send cheer, +5 points
let cheerEnabled = load("cheer", true);

// Auto send poll (choosing MVP), always choose the first option, +100 points
let pollEnabled = load("poll", true);

// Auto send quiz, always choose correct option
let quizEnabled = load("quiz", true);

// Auto send match prediction
let matchPredictionEnabled = load("matchPrediction", false);

// Team selection strategy
// Can be 1 (select first team), 2 (select second team), rand (select random), maj (follow majority)
// This setting will only be used if match prediction is enabled
let matchPredictionStrategy = load("predictionStrategy", "maj")

// Auto collect lootdrops (randomly appearing 10 point drops)
let dropEnabled = load("drop", true);

// Auto collect sliders
let sliderEnabled = load("slider", true);

// Log events (such as sending cheer) to the feed
let feedLoggingEnabled = load("feedLogging", true);

// Remove cheer graphics (improves performance? haven't tested but pretty sure it does)
let lowDetail = load("lowDetail", false);

// Debug logging of websocket messages to console
let debug = false;

// ===================== End AutoBSC Configuration =====================

let feed;

function log(msg) {
  if (!feedLoggingEnabled) {
    return
  }
  if (!feed) {
    feed = document.getElementsByClassName("Feed__content")[0];
    if (!feed) {return}
  }
  
  feed.children[feed.children.length - 2].insertAdjacentHTML("afterend", `<div data-v-3dcc93da="" data-v-8a7cf7d7="" class="Container" style="translate: none; rotate: none; scale: none; transform: translate(0px);">
    <div data-v-de4b4abb="" data-v-3dcc93da="" class="BaseCard BaseCard--rmedium">
        <div data-v-3dcc93da="" class="ContentCard ContentCard--disabled ContentCard--inactive ContentCard--isFullWidth ContentCard--isCelebration">
            <div data-v-3dcc93da="" class="ContentCard__celebration">
                <div data-v-3dcc93da="" class="ContentCard__celebration__background"></div>
                <div data-v-3dcc93da="" class="ContentCard__celebration__bottomContainer"></div>
                <div data-v-8a7cf7d7="" class="RewardCard">
                    <div data-v-8a7cf7d7="" class="RewardCard__rewardContainer">
                        <div data-v-8a7cf7d7="" class="RewardCard__infoContainer">
                            <div data-v-8a7cf7d7="" class="RewardCard__textContainer">
                                <div data-v-8a7cf7d7="" class="RewardCard__textContainer__title">${msg}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`)
};

function purge(elements) {
    for (let elem of elements) {
        try {
            elem.remove()
        } catch (e) {
            console.warn("[AutoBSC] Failed to remove element", elem, e)
        }
    }
}

// The rest of the code is not recommended to modify unless you know what you are doing
(function() {
  "use strict";

  let loaded = false;
  let conn
  let matchpredblue
  let matchpredred
  let predictions

  let lastCheerId = "";
  let lastPollId = "";
  let lastQuizId = "";
  let lastDropId = "";
  let lastMatchPredictionId = "";
  let lastSliderId = "";

  const OriginalWebSocket = window.WebSocket;

  class PatchedWebSocket extends OriginalWebSocket {
    constructor(...args) {
      super(...args);

      const originalGet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").get;

      const originalSet = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, "onmessage").set;

      Object.defineProperty(this, "onmessage", {
        configurable: true,
        enumerable: true,
        get() {
          return originalGet.call(this);
        },
        set(newOnMessage) {
          const onMessage = (event) => {
            parse(event.data, this);
            newOnMessage(event);
          };
          originalSet.call(this, onMessage);
        },
      });

      const originalSend = this.send;

      this.send = function(data) {
        if (debug) {
          const parsed = JSON.parse(data);

          console.log("[AutoBSC] Sending message:", data, parsed);
        }
        originalSend.call(this, data);
      };
    }
  }

  window.WebSocket = PatchedWebSocket;

  function parse(data, ws) {
    const msg = JSON.parse(data)
    if (debug) {
      console.log("[AutoBSC] Received message:", msg, data);
    }

    msg.forEach(event => {
      const messageType = event.messageType;
      if (messageType === "global_state" && !loaded) {
        setupAutoBsc();
      }

      if (messageType === "cheer") {
        if (conn) {
          conn.textContent = event.payload.connectedClients
        }

        if (lowDetail) {
            purge(document.getElementsByClassName("Cheer__gradient"))
            purge(document.getElementsByClassName("Cheer__canvas"))
        }

        if (cheerEnabled && event.payload.typeId !== lastCheerId) {
          log("Sending cheer");

          setTimeout(() => {
            for (let btn of document.getElementsByClassName("cheer-btn-container__cheer-btn")) {
              btn.click()
            }
          }, 500)
          lastCheerId = event.payload.typeId
        }
      }

      if (messageType === "poll" && pollEnabled) {
        if (event.payload.typeId !== lastPollId) {
          log("Sending poll");

          setTimeout(() => {
            try {
              for (let que of document.getElementsByClassName("MultiChoiceQuestionCard")) {
                que.getElementsByTagName("button")[0].click()
              }
            } catch (e) {
              console.error("[AutoBSC]", e)
            }
          }, 3500);
          lastPollId = event.payload.typeId;
        }
      }

      if (messageType === "quiz" && quizEnabled) {
        if (event.payload.typeId !== lastQuizId) {
          log("Sending quiz");

          setTimeout(() => {
            for (let que of document.getElementsByClassName("BaseCard")) {
              try {
                if (que.getElementsByClassName("Points__correctAnswer").length === 0) {
                  continue
                }

                que.getElementsByClassName("MultiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
          }, 3500);
          lastQuizId = event.payload.typeId;
        }
      }

      if (messageType === "match_prediction") {
        predictions = event.payload.answers
        if (matchpredblue) {
          matchpredblue.textContent = predictions["0"]
        }
        if (matchpredred) {
          matchpredred.textContent = predictions["1"]
        }
        if (matchPredictionEnabled && event.payload.typeId !== lastMatchPredictionId) {
          log("Sending match prediction");
          let team = 0
          setTimeout(() => {
            switch (matchPredictionStrategy) {
              case "2":
                team = 1
                break
              case "rand":
                team = Math.floor(Math.random() * 2)
                break
              case "maj":
                if (predictions["0"] > predictions["1"]) {
                  team = 0
                } else {
                  team = 1
                }
                break
              default:
                break
            }
            log(`Placing prediction for ${team === 0 ? "blue" : "red"}`)
            for (let a of document.getElementsByClassName("MatchPredictionQuestionCard__buttonGroup")) {
              try {
                a.getElementsByTagName("button")[team].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
          }, 10000);

          lastMatchPredictionId = event.payload.typeId
        }
      }

      if (messageType === "loot_drop" && dropEnabled) {
        if (event.payload.typeId !== lastDropId) {
          log("Collecting loot drop")

          setTimeout(() => {
            for (let drop of document.getElementsByClassName("LootDropCard")) {
              try {
                drop.getElementsByClassName("RectangleButton")[0].click()
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
            lastDropId = event.payload.typeId
          }, 2000)
        }
      }

      if (messageType === "slider" && sliderEnabled) {
        if (event.payload.typeId !== lastSliderId) {
          log("Collecting slider")

          setTimeout(() => {
            for (let drop of document.getElementsByClassName("SliderQuestionCard")) {
              try {
                let elem = drop.getElementsByTagName("input")[0]
                elem.value = "100"
                elem.dispatchEvent(new InputEvent("input"))
                elem.dispatchEvent(new Event("change"))
              } catch (e) {
                console.error("[AutoBSC]", e)
              }
            }
            lastSliderId = event.payload.typeId
          }, 2000)
        }
      }
    })
  }

  function setupAutoBsc() {
    loaded = true;

    console.log("[AutoBSC] AutoBSC loaded");

    const interval = setInterval(() => {
      const div = document.getElementsByClassName("Feed__content")[0];
      if (div) {
        div.insertAdjacentHTML("afterbegin", loadedMessageHtml);
        clearInterval(interval);
      }
    }, 500);

    const reconnectButtonContainer = document.querySelector("#__layout > div > div:nth-child(5)");
    const reconnectButton = document.querySelector(
      "#__layout > div > div:nth-child(5) > div > div > div > div.baseModal__scroll > div > div > button > div.RectangleButton.RectangleButton--cta > div > div"
    );

    setInterval(() => {
      if (reconnectButtonContainer.style.display !== "none") {
        console.log("[AutoBSC] Reconnecting");
        reconnectButton.click();
      }
    }, 1000);

    document.body.insertAdjacentHTML("afterbegin", `
<style>
#autobsc-overlay > details[open] {
   width: 20rem;
}

.autobsc-config-container {
    width: 15rem;
    padding-bottom: 0.15rem;
}

.autobsc-config-container > input[type=checkbox] {
    float: right;
    position: relative;
    top: 0.15rem;
}

.Video__InteractionBlocker, .VideoCover.VideoCover--hidden {
    all: unset !important;
    display: none;
}
</style>
<div id="autobsc-overlay" style="position: absolute; top: 20%; z-index: 99999999; background: antiquewhite">
<details>
<summary style="list-style: none;" id="autobsc-overlayheader" onclick="if (getAttribute('drag') === '') event.preventDefault()">
  <div style="padding: 1rem;">AutoBSC++</div>
</summary>

<div style="display: grid; justify-content: center; margin-bottom: .5rem;">
<div>
  <div style="margin-bottom: .5rem">
    <h1>Data</h1>
    Connected: <span id="autobsc-connected">unknown</span>
  </div>

  <div style="margin-bottom: .5rem;">
    <h3>Predictions</h3>
    Blue: <span id="autobsc-pick-blue">unknown</span><br>
    Red: <span id="autobsc-pick-red">unknown</span>
  </div>

  <h1>Config</h1>
  <div class="autobsc-config-container">Autocheer <input type="checkbox" id="autobsc-cheer"></div>

  <div class="autobsc-config-container">Answer polls <input type="checkbox" id="autobsc-poll"></div>

  <div class="autobsc-config-container">Answer quiz <input type="checkbox" id="autobsc-quiz"></div>

  <div class="autobsc-config-container">Answer slider <input type="checkbox" id="autobsc-slider"></div>

  <div class="autobsc-config-container">Collect lootdrop <input type="checkbox" id="autobsc-lootdrop"></div>

  <div class="autobsc-config-container">Autopredict <input type="checkbox" id="autobsc-predict"></div>

  <div class="autobsc-config-container">Autopredict strategy <select style="width: 3.825rem;" id="autobsc-predict-strat">
  <option value="1">Blue</option>
  <option value="2">Red</option>
  <option value="rand">Random</option>
  <option value="maj">Follow majority</option>
</select></div>

  <div class="autobsc-config-container">Feed logging <input type="checkbox" id="autobsc-feedlogging"></div>
  <div class="autobsc-config-container">Low Detail Mode <input type="checkbox" id="autobsc-lowdetail"></div>

  <button style="background-color: red; border: none; color: white;" onclick='if (confirm("Are you sure? You will only be able to open the overlay again by reloading the page")) document.getElementById("autobsc-overlay").remove()'>Destroy overlay</button>

</div>
</div>
</details></div>
    `)
    dragElement(document.getElementById("autobsc-overlay"))

    const elems = {
      cheer: document.getElementById("autobsc-cheer"),
      poll: document.getElementById("autobsc-poll"),
      quiz: document.getElementById("autobsc-quiz"),
      slider: document.getElementById("autobsc-slider"),
      lootdrop: document.getElementById("autobsc-lootdrop"),
      predict: document.getElementById("autobsc-predict"),
      predictstrat: document.getElementById("autobsc-predict-strat"),
      feedlogging: document.getElementById("autobsc-feedlogging"),
      lowdetail: document.getElementById("autobsc-lowdetail")
    }

    elems.cheer.checked = cheerEnabled
    elems.poll.checked = pollEnabled
    elems.quiz.checked = quizEnabled
    elems.slider.checked = sliderEnabled
    elems.predict.checked = matchPredictionEnabled
    elems.lootdrop.checked = dropEnabled
    elems.feedlogging.checked = feedLoggingEnabled

    elems.predictstrat.value = matchPredictionStrategy
    elems.lowdetail.checked = lowDetail

    elems.cheer.onchange = function(e) {
      cheerEnabled = e.target.checked
      store("cheer", cheerEnabled)
    }
    elems.poll.onchange = function(e) {
      pollEnabled = e.target.checked
      store("poll", pollEnabled)
    }
    elems.quiz.onchange = function(e) {
      quizEnabled = e.target.checked
      store("quiz", quizEnabled)
    }

    elems.slider.onchange = function(e) {
      sliderEnabled = e.target.checked
      store("slider", sliderEnabled)
    }
    elems.predict.onchange = function(e) {
      matchPredictionEnabled = e.target.checked
      store("matchPrediction", matchPredictionEnabled)
    }
    elems.lootdrop.onchange = function(e) {
      dropEnabled = e.target.checked
      store("drop", dropEnabled)
    }
    elems.feedlogging.onchange = function(e) {
      feedLoggingEnabled = e.target.checked
      store("feedLogging", feedLoggingEnabled)
    }

    elems.predictstrat.onchange = function(e) {
      matchPredictionStrategy = e.target.value
      store("predictionStrategy", matchPredictionStrategy)
    }

    elems.lowdetail.onchange = function(e) {
        lowDetail = e.target.checked
        store("lowDetail", lowDetail)
        if (!lowDetail) {
            return
        }
        purge(document.getElementsByClassName("Cheer__gradient"))
        purge(document.getElementsByClassName("Cheer__canvas"))
    }

    conn = document.getElementById("autobsc-connected")
    matchpredblue = document.getElementById("autobsc-pick-blue")
    matchpredred = document.getElementById("autobsc-pick-red")
  }

  const loadedMessageHtml = `<div data-v-3dcc93da="" data-v-8a7cf7d7="" class="Container Container--extraTopMargin" style="translate: none; rotate: none; scale: none; transform: translate(0px);">
    <div data-v-de4b4abb="" data-v-3dcc93da="" class="BaseCard BaseCard--rmedium">
        <div data-v-3dcc93da="" class="ContentCard ContentCard--disabled ContentCard--inactive ContentCard--isFullWidth ContentCard--isCelebration">
            <div data-v-3dcc93da="" class="ContentCard__celebration">
                <div data-v-3dcc93da="" class="ContentCard__celebration__background"></div>
                <div data-v-3dcc93da="" class="ContentCard__celebration__bottomContainer"></div>
                <div data-v-8a7cf7d7="" class="RewardCard">
                    <div data-v-8a7cf7d7="" class="RewardCard__rewardContainer">
                        <div data-v-8a7cf7d7="" class="RewardCard__reward">
                            <picture data-v-afed0133="" data-v-8a7cf7d7="" class="cms-image cms-image--fullWidth cms-image--loaded cms-image--fullWidth"><img data-v-afed0133="" src="https://event.supercell.com/brawlstars/assets/rewards/images/emoji_starr.svg" class="cms-image cms-image--fullWidth cms-image--loaded cms-image--fullWidth"></picture>
                        </div>
                        <div data-v-8a7cf7d7="" class="RewardCard__infoContainer">
                            <div data-v-8a7cf7d7="" class="RewardCard__textContainer">
                                <div data-v-8a7cf7d7="" class="RewardCard__textContainer__title">AutoBSC++ loaded</div>
                                <div data-v-8a7cf7d7="" class="RewardCard__textContainer__subTitle">made by laptopcat (based on AutoBSC by catme0w)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;
})();

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  let dragger = document.getElementById(elmnt.id + "header") ?? elmnt
  dragger.onmousedown = dragMouseDown

  function dragMouseDown(e) {
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    dragger.setAttribute("drag", "")
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    setTimeout(() => dragger.removeAttribute("drag"), 100)
    document.onmouseup = null
    document.onmousemove = null
  }
}
