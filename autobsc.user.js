// ==UserScript==
// @name         AutoBSC++
// @namespace    https://github.com/LaptopCat
// @homepageURL  https://github.com/LaptopCat/AutoBSC
// @supportURL   https://github.com/LaptopCat/AutoBSC/issues
// @license      MIT
// @version      4.0.0
// @description  Auto completes Brawl Stars Championship live stream events
// @author       laptopcat
// @match        https://event.supercell.com/brawlstars/*
// @icon         https://event.supercell.com/brawlstars/page-icon.ico
// @grant        none
// ==/UserScript==

function load(key, def) {
    let res = localStorage.getItem("autobsc-" + key);
    if (res === null) {
        store(key, def);
        return def;
    } else {
        return JSON.parse(res);
    }
}

function store(key, val) {
    localStorage.setItem("autobsc-" + key, JSON.stringify(val));
}

let cheerEnabled = load("cheer", true);
let pollEnabled = load("poll", true);
let quizEnabled = load("quiz", true);
let matchPredictionEnabled = load("matchPrediction", false);
let matchPredictionStrategy = load("predictionStrategy", "maj");
let dropEnabled = load("drop", true);
let sliderEnabled = load("slider", true);
let feedLoggingEnabled = load("feedLogging", true);
let dynamicLogging = load("dynamicLogging", true);
let lowDetail = load("lowDetail", false);
let noPlayer = load("noPlayer", false)
let debug = false;
let feed;

function log(msg, id) {
    if (!feedLoggingEnabled) return;

    setTimeout(() => {
        if (!feed) {
            feed = document.getElementsByClassName("feed__content")[0];
            if (!feed) return;
        }

        if (id) {
            let existing = document.getElementById(id);
            if (existing) {
                let title = existing.getElementsByClassName("rewardCard__textContainer__title")[0];
                if (title) {
                    title.textContent = msg;
                    return;
                }
            }
        }

        let cardIdAttr = id ? `id="${id}"` : '';
        let htmlStr = `<div data-v-6ab4ab95="" data-v-e989f123="" ${cardIdAttr}>
        <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
            <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
                <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
                <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                    <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                    <div data-v-307c1ac7="" class="contentCard__slot">
                        <div data-v-6ab4ab95="" class="rewardCard">
                            <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                        <div data-v-6ab4ab95="" class="rewardCard__textContainer__title">${msg}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
                <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
            </div>
        </div>
    </div>`;

        if (feed.children.length >= 2) {
            feed.children[feed.children.length - 2].insertAdjacentHTML("afterend", htmlStr);
            feed.children[feed.children.length - 2].scrollIntoView();
        } else if (feed.children.length > 0) {
            feed.children[feed.children.length - 1].insertAdjacentHTML("afterend", htmlStr);
            feed.children[feed.children.length - 1].scrollIntoView();
        }
    }, 1000);
}

function purge(elements) {
    for (let elem of elements) {
        try {
            elem.remove();
        } catch (e) {}
    }
}

function checkMainDataSection() {
    const users = document.getElementById("autobsc-users-wrap");
    const teams = document.getElementById("autobsc-teams-wrap");
    const mainSec = document.getElementById("autobsc-data-section");
    const configTitle = document.getElementById("autobsc-config-title");

    if (users && teams && mainSec) {
        if (users.classList.contains("autobsc-hidden-block") &&
            teams.classList.contains("autobsc-hidden-block")) {
            mainSec.classList.add("autobsc-hidden-block");
            if (configTitle) configTitle.style.marginTop = "0px";
        } else {
            if (configTitle) configTitle.style.marginTop = "20px";
        }
    }
}

function showDataSubSection(id) {
    const mainSec = document.getElementById("autobsc-data-section");
    const subSec = document.getElementById(id);
    const configTitle = document.getElementById("autobsc-config-title");

    if (subSec && subSec.classList.contains("autobsc-hidden-block")) {
        subSec.classList.remove("autobsc-hidden-block");
    }
    if (mainSec && mainSec.classList.contains("autobsc-hidden-block")) {
        mainSec.classList.remove("autobsc-hidden-block");
    }

    if (configTitle) configTitle.style.marginTop = "20px";
}

function updateDependencies() {
    const stratRow = document.getElementById("autobsc-strat-row");
    const dynRow = document.getElementById("autobsc-dyn-row");

    if (matchPredictionEnabled) stratRow.classList.remove("autobsc-disabled");
    else stratRow.classList.add("autobsc-disabled");

    if (feedLoggingEnabled) dynRow.classList.remove("autobsc-disabled");
    else dynRow.classList.add("autobsc-disabled");
}

(function() {
    "use strict";

    let loaded = false;
    let conn;
    let matchpredblue;
    let matchpredred;
    let predictions;

    let lastCheerId = "";
    let lastPollId = "";
    let lastImagePollId = "";
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
        const msg = JSON.parse(data);
        msg.forEach(event => {
            const messageType = event.messageType;
            if (messageType === "global_state") {
                if (!loaded) setupAutoBsc();
                if (noPlayer) {
                    purge(document.getElementsByTagName("iframe"))
                    setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
                }
            }

            if (messageType === "cheer") {
                if (conn) {
                    conn.textContent = event.payload.connectedClients;
                    showDataSubSection("autobsc-users-wrap");
                }

                if (lowDetail) {
                    purge(document.getElementsByClassName("cheer__gradient"));
                    purge(document.getElementsByClassName("cheer__canvas"));
                }

                if (cheerEnabled && event.payload.typeId !== lastCheerId) {
                    let cardId = "autobsc-log-cheer-" + Date.now();
                    if (dynamicLogging) {
                        log("Sending cheer...", cardId);
                        setTimeout(() => {
                            for (let btn of document.getElementsByClassName("cheerButtonContainer__cheerButton")) btn.click();
                            log("Cheer sent", cardId);
                        }, 1500);
                    } else {
                        log("Sending cheer");
                        setTimeout(() => {
                            for (let btn of document.getElementsByClassName("cheerButtonContainer__cheerButton")) btn.click();
                        }, 1500);
                    }
                    lastCheerId = event.payload.typeId;
                }
            }

            if (messageType === "poll" && pollEnabled) {
                if (event.payload.typeId !== lastPollId) {
                    let cardId = "autobsc-log-poll-" + Date.now();
                    if (dynamicLogging) {
                        log("Answering poll...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) que.getElementsByTagName("button")[0].click();
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                            log("Poll answered", cardId);
                        }, 3500);
                    } else {
                        log("Sending poll");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("multiChoiceQuestionCard")) que.getElementsByTagName("button")[0].click();
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                        }, 3500);
                    }
                    lastPollId = event.payload.typeId;
                }
            }

            if (messageType === "image_poll" && pollEnabled) {
                if (event.payload.typeId !== lastImagePollId) {
                    let cardId = "autobsc-log-imgpoll-" + Date.now();
                    if (dynamicLogging) {
                        log("Answering image poll...", cardId);
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                            log("Image poll answered", cardId);
                        }, 3500);
                    } else {
                        log("Sending image poll");
                        setTimeout(() => {
                            try {
                                for (let que of document.getElementsByClassName("cardImagePoll")) que.getElementsByTagName("button")[0].click();
                            } catch (e) {}
                        }, 3500);
                    }
                    lastImagePollId = event.payload.typeId;
                }
            }

            if (messageType === "quiz" && quizEnabled) {
                if (event.payload.typeId !== lastQuizId) {
                    let cardId = "autobsc-log-quiz-" + Date.now();
                    if (dynamicLogging) {
                        log("Answering quiz...", cardId);
                        setTimeout(() => {
                            for (let que of document.getElementsByClassName("baseCard")) {
                                try {
                                    if (que.getElementsByClassName("cardRules__extraPointsLabel").length === 0) continue;
                                    que.getElementsByClassName("multiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click();
                                } catch (e) {}
                            }
                            log("Quiz answered", cardId);
                        }, 3500);
                    } else {
                        log("Sending quiz");
                        setTimeout(() => {
                            for (let que of document.getElementsByClassName("baseCard")) {
                                try {
                                    if (que.getElementsByClassName("cardRules__extraPointsLabel").length === 0) continue;
                                    que.getElementsByClassName("multiChoiceQuestionCard__button")[event.payload.correctAnswer.alternative].click();
                                } catch (e) {}
                            }
                        }, 3500);
                    }
                    lastQuizId = event.payload.typeId;
                }
            }

            if (messageType === "match_prediction") {
                predictions = event.payload.answers;
                if (matchpredblue) matchpredblue.textContent = predictions["0"];
                if (matchpredred) matchpredred.textContent = predictions["1"];

                showDataSubSection("autobsc-teams-wrap");

                if (matchPredictionEnabled && event.payload.typeId !== lastMatchPredictionId) {
                    let cardId = "autobsc-log-predict-" + Date.now();
                    if (dynamicLogging) {
                        log("Placing match prediction...", cardId);
                        let team = 0;
                        setTimeout(() => {
                            switch (matchPredictionStrategy) {
                                case "2":
                                    team = 1;
                                    break;
                                case "rand":
                                    team = Math.floor(Math.random() * 2);
                                    break;
                                case "maj":
                                    team = predictions["0"] > predictions["1"] ? 0 : 1;
                                    break;
                            }
                            log(`Placed prediction for ${team === 0 ? "Blue" : "Red"} team`, cardId);
                            for (let a of document.getElementsByClassName("matchPredictionQuestionCard__buttonGroup")) {
                                try {
                                    a.getElementsByTagName("button")[team].click();
                                } catch (e) {}
                            }
                        }, 10000);
                    } else {
                        log("Sending match prediction");
                        let team = 0;
                        setTimeout(() => {
                            switch (matchPredictionStrategy) {
                                case "2":
                                    team = 1;
                                    break;
                                case "rand":
                                    team = Math.floor(Math.random() * 2);
                                    break;
                                case "maj":
                                    team = predictions["0"] > predictions["1"] ? 0 : 1;
                                    break;
                            }
                            log(`Placing prediction for ${team === 0 ? "Blue" : "Red"}`);
                            for (let a of document.getElementsByClassName("matchPredictionQuestionCard__buttonGroup")) {
                                try {
                                    a.getElementsByTagName("button")[team].click();
                                } catch (e) {}
                            }
                        }, 10000);
                    }
                    lastMatchPredictionId = event.payload.typeId;
                }
            }

            if (messageType === "loot_drop" && dropEnabled) {
                if (event.payload.typeId !== lastDropId) {
                    let cardId = "autobsc-log-drop-" + Date.now();
                    if (dynamicLogging) {
                        log("Collecting loot drop...", cardId);
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("lootDropCard")) {
                                try {
                                    drop.getElementsByClassName("rectangleButton")[0].click();
                                } catch (e) {}
                            }
                            log("Loot drop collected", cardId);
                        }, 2000);
                    } else {
                        log("Collecting loot drop");
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("lootDropCard")) {
                                try {
                                    drop.getElementsByClassName("rectangleButton")[0].click();
                                } catch (e) {}
                            }
                        }, 2000);
                    }
                    lastDropId = event.payload.typeId;
                }
            }

            if (messageType === "slider" && sliderEnabled) {
                if (event.payload.typeId !== lastSliderId) {
                    let cardId = "autobsc-log-slider-" + Date.now();
                    if (dynamicLogging) {
                        log("Answering slider...", cardId);
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {}
                            }
                            log("Slider answered", cardId);
                        }, 2000);
                    } else {
                        log("Collecting slider");
                        setTimeout(() => {
                            for (let drop of document.getElementsByClassName("sliderQuestionCard")) {
                                try {
                                    let elem = drop.getElementsByTagName("input")[0];
                                    elem.value = "100";
                                    elem.dispatchEvent(new InputEvent("input"));
                                    elem.dispatchEvent(new Event("change"));
                                } catch (e) {}
                            }
                        }, 2000);
                    }
                    lastSliderId = event.payload.typeId;
                }
            }
        });
    }

    function setupAutoBsc() {
        loaded = true;

        const interval = setInterval(() => {
            const div = document.getElementsByClassName("feed__content")[0];
            if (div) {
                div.insertAdjacentHTML("afterbegin", loadedMessageHtml);
                clearInterval(interval);
            }
        }, 500);

        document.body.insertAdjacentHTML("afterbegin", `
    <style>
    #autobsc-overlay, #autobsc-overlay *, [id^="autobsc-log-"] * {
        box-sizing: border-box;
    }
    #autobsc-overlay {
        position: fixed;
        top: 15%;
        left: 10px;
        z-index: 99999999;
        direction: ltr !important;
        text-align: left !important;
        background: rgba(26, 27, 38, 0.65);
        backdrop-filter: blur(12px);
        color: #e0e2ea;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        width: 140px;
        transition: width 0.3s ease, border-radius 0.3s ease, left 0.3s ease, top 0.3s ease;
        overflow: hidden;
    }
    #autobsc-overlay.open {
        width: 300px;
    }
    #autobsc-header {
        padding: 12px 16px;
        font-weight: 700;
        font-size: 1.15rem;
        cursor: grab;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        border-bottom: 1px solid transparent;
        white-space: nowrap;
        touch-action: none;
    }
    #autobsc-header:active {
        cursor: grabbing;
    }
    #autobsc-overlay.open #autobsc-header {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .autobsc-chevron {
        transition: transform 0.3s ease;
        font-size: 0.8rem;
        margin-left: .5rem;
    }
    #autobsc-overlay.open .autobsc-chevron {
        transform: rotate(180deg);
    }

    #autobsc-body {
        max-height: 0;
        opacity: 0;
        padding: 0;
        visibility: hidden;
        overflow-y: hidden;
        transition: max-height 0.3s ease, opacity 0.2s ease, padding 0.3s ease;
        direction: ltr;
        scrollbar-gutter: stable;
    }
    #autobsc-overlay.open #autobsc-body {
        max-height: 75vh;
        opacity: 1;
        padding: 16px 16px 16px 8px;
        visibility: visible;
        transition: max-height 0.4s ease, opacity 0.4s ease, padding 0.3s ease;
    }

    #autobsc-body.allow-scroll {
        overflow-y: auto;
    }

    .autobsc-inner-content {
        direction: ltr;
        padding-left: 8px;
    }

    .autobsc-hidden-block {
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        overflow: hidden !important;
        border: none !important;
    }

    #autobsc-data-section, #autobsc-users-wrap, #autobsc-teams-wrap {
        transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease, padding 0.4s ease;
    }

    #autobsc-data-section { max-height: 200px; margin-bottom: 8px; opacity: 1; overflow: hidden; }
    #autobsc-users-wrap { max-height: 40px; margin-bottom: 12px; opacity: 1; }
    #autobsc-teams-wrap { max-height: 80px; opacity: 1; }

    .autobsc-section-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #7aa2f7;
        margin-bottom: 12px;
        margin-top: 20px;
        border-bottom: 1px solid rgba(122, 162, 247, 0.2);
        padding-bottom: 6px;
        white-space: nowrap;
        transition: margin-top 0.4s ease;
    }
    .autobsc-section-title:first-child { margin-top: 0; }

    .autobsc-stat-row {
        font-size: 0.9rem;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        white-space: nowrap;
    }

    .autobsc-config-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.9rem;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        gap: 12px;
    }

    .autobsc-disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    .autobsc-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
        flex-shrink: 0;
    }
    .autobsc-switch input { opacity: 0; width: 0; height: 0; }
    .autobsc-slider-btn {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #414868;
        transition: .3s;
        border-radius: 20px;
    }
    .autobsc-slider-btn:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
    }
    .autobsc-switch input:checked + .autobsc-slider-btn { background-color: #7aa2f7; }
    .autobsc-switch input:checked + .autobsc-slider-btn:before { transform: translateX(18px); }

    .autobsc-select {
        background: #24283b;
        color: #e0e2ea;
        border: 1px solid #414868;
        border-radius: 6px;
        padding: 4px 8px;
        font-family: inherit;
        outline: none;
        width: 100%;
    }
    .autobsc-btn-danger {
        width: 100%;
        background: rgba(247, 118, 142, 0.2);
        color: #f7768e;
        border: 1px solid rgba(247, 118, 142, 0.4);
        padding: 8px;
        border-radius: 6px;
        font-family: inherit;
        font-weight: 600;
        cursor: pointer;
        margin-top: 14px;
        transition: background 0.2s;
        white-space: nowrap;
    }
    .autobsc-btn-danger:hover { background: rgba(247, 118, 142, 0.4); }
    #autobsc-body::-webkit-scrollbar { width: 6px; }
    #autobsc-body::-webkit-scrollbar-track { background: transparent; }
    #autobsc-body::-webkit-scrollbar-thumb { background: #414868; border-radius: 4px; }
    .Video__InteractionBlocker, .VideoCover.VideoCover--hidden { all: unset !important; display: none; }
    </style>

    <div id="autobsc-overlay">
        <div id="autobsc-header">
            <span dir="ltr" style="display:inline-block;">Auto<span style="color:#ff4444;">B</span><span style="color:#ffffff;">S</span><span style="color:#ffaa00;">C</span>++</span>
            <span class="autobsc-chevron">▼</span>
        </div>

        <div id="autobsc-body">
            <div class="autobsc-inner-content">
                <div id="autobsc-data-section" class="autobsc-hidden-block">
                    <div class="autobsc-section-title">Data</div>
                    <div id="autobsc-users-wrap" class="autobsc-hidden-block">
                        <div class="autobsc-stat-row">
                            <span>Connected users:</span>
                            <strong id="autobsc-connected" style="color:#e0af68">unknown</strong>
                        </div>
                    </div>

                    <div id="autobsc-teams-wrap" class="autobsc-hidden-block">
                        <div class="autobsc-stat-row">
                            <span>Blue team:</span> <strong id="autobsc-pick-blue" style="color:#7dcfff">unknown</strong>
                        </div>
                        <div class="autobsc-stat-row">
                            <span>Red team:</span> <strong id="autobsc-pick-red" style="color:#f7768e">unknown</strong>
                        </div>
                    </div>
                </div>

                <div class="autobsc-section-title" id="autobsc-config-title" style="margin-top: 0px;">Config</div>
                <div class="autobsc-config-row">
                    <span>Autocheer</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-cheer"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Answer polls</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-poll"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Answer quiz</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-quiz"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Answer slider</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-slider"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Collect lootdrops</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-lootdrop"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Autopredict</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-predict"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row" id="autobsc-strat-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <span>Prediction strategy</span>
                    <select class="autobsc-select" id="autobsc-predict-strat">
                        <option value="1">Blue only</option>
                        <option value="2">Red only</option>
                        <option value="rand">Random</option>
                        <option value="maj">Follow majority</option>
                    </select>
                </div>
                <div class="autobsc-config-row">
                    <span>Feed logging</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-feedlogging"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row" id="autobsc-dyn-row">
                    <span>Dynamic logging</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-dynamiclogging"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>No Cheer Graphics</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-lowdetail"><span class="autobsc-slider-btn"></span></label>
                </div>
                <div class="autobsc-config-row">
                    <span>Disable stream player</span>
                    <label class="autobsc-switch"><input type="checkbox" id="autobsc-noplayer"><span class="autobsc-slider-btn"></span></label>
                </div>

                <button class="autobsc-btn-danger" onclick='if(confirm("Are you sure?")) document.getElementById("autobsc-overlay").remove()'>
                    Hide Menu
                </button>
            </div>
        </div>
    </div>
        `);

        dragElement(document.getElementById("autobsc-overlay"));

        const elems = {
            cheer: document.getElementById("autobsc-cheer"),
            poll: document.getElementById("autobsc-poll"),
            quiz: document.getElementById("autobsc-quiz"),
            slider: document.getElementById("autobsc-slider"),
            lootdrop: document.getElementById("autobsc-lootdrop"),
            predict: document.getElementById("autobsc-predict"),
            predictstrat: document.getElementById("autobsc-predict-strat"),
            feedlogging: document.getElementById("autobsc-feedlogging"),
            dynamiclogging: document.getElementById("autobsc-dynamiclogging"),
            lowdetail: document.getElementById("autobsc-lowdetail"),
            noplayer: document.getElementById("autobsc-noplayer")
        };

        elems.cheer.checked = cheerEnabled;
        elems.poll.checked = pollEnabled;
        elems.quiz.checked = quizEnabled;
        elems.slider.checked = sliderEnabled;
        elems.predict.checked = matchPredictionEnabled;
        elems.lootdrop.checked = dropEnabled;
        elems.feedlogging.checked = feedLoggingEnabled;
        elems.dynamiclogging.checked = dynamicLogging;
        elems.predictstrat.value = matchPredictionStrategy;
        elems.lowdetail.checked = lowDetail;
        elems.noplayer.checked = noPlayer

        updateDependencies();

        elems.cheer.onchange = function(e) {
            cheerEnabled = e.target.checked;
            store("cheer", cheerEnabled);
        };
        elems.poll.onchange = function(e) {
            pollEnabled = e.target.checked;
            store("poll", pollEnabled);
        };
        elems.quiz.onchange = function(e) {
            quizEnabled = e.target.checked;
            store("quiz", quizEnabled);
        };
        elems.slider.onchange = function(e) {
            sliderEnabled = e.target.checked;
            store("slider", sliderEnabled);
        };
        elems.predict.onchange = function(e) {
            matchPredictionEnabled = e.target.checked;
            store("matchPrediction", matchPredictionEnabled);
            updateDependencies();
        };
        elems.lootdrop.onchange = function(e) {
            dropEnabled = e.target.checked;
            store("drop", dropEnabled);
        };
        elems.feedlogging.onchange = function(e) {
            feedLoggingEnabled = e.target.checked;
            store("feedLogging", feedLoggingEnabled);
            updateDependencies();
        };
        elems.dynamiclogging.onchange = function(e) {
            dynamicLogging = e.target.checked;
            store("dynamicLogging", dynamicLogging);
        };
        elems.predictstrat.onchange = function(e) {
            matchPredictionStrategy = e.target.value;
            store("predictionStrategy", matchPredictionStrategy);
        };
        elems.lowdetail.onchange = function(e) {
            lowDetail = e.target.checked;
            store("lowDetail", lowDetail);
            if (!lowDetail) return;
            purge(document.getElementsByClassName("cheer__gradient"));
            purge(document.getElementsByClassName("cheer__canvas"));
        };
        elems.noplayer.onchange = function(e) {
            noPlayer = e.target.checked;
            store("noPlayer", noPlayer);
            if (!noPlayer) return;
            purge(document.getElementsByTagName("iframe"))
            setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
        }

        conn = document.getElementById("autobsc-connected");
        matchpredblue = document.getElementById("autobsc-pick-blue");
        matchpredred = document.getElementById("autobsc-pick-red");
        if (noPlayer) {
          purge(document.getElementsByTagName("iframe"))
          setTimeout(() => purge(document.getElementsByTagName("iframe")), 1000)
        }
    }

    const loadedMessageHtml = `<div data-v-6ab4ab95="" data-v-e989f123="" id="autobsc-log-startup">
    <div data-v-307c1ac7="" data-v-6ab4ab95="" class="contentCardContainer" with-extra-top-margin="" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, 0px, 0px); opacity: 1; --v3ee5afce: #245fc1;">
        <div data-v-615f3480="" data-v-307c1ac7="" class="baseCard baseCard--paper" radius="medium">
            <div data-v-615f3480="" class="baseCard__cardBackground baseCard__cardBackground--paper-3"></div>
            <div data-v-307c1ac7="" class="contentCard contentCard--paper contentCard--isFullWidth contentCard--enabled">
                <div data-v-307c1ac7="" class="contentCard__gameBackground"></div>
                <div data-v-307c1ac7="" class="contentCard__slot">
                    <div data-v-6ab4ab95="" class="rewardCard">
                        <div data-v-6ab4ab95="" class="rewardCard__rewardContainer">
                            <div data-v-6ab4ab95="" class="rewardCard__reward" style="translate: none; rotate: none; scale: none; transform: translate3d(0px, -1.3431px, 0px);">
                                <picture data-v-58643600="" data-v-6ab4ab95="" class="cmsImage cmsImage--loaded cmsImage--fullWidth"><img data-v-58643600="" class="cmsImage cmsImage--loaded cmsImage--fullWidth" src="https://event.supercell.com/brawlstars/assets/rewards/images/7emETQCs7gjPr7rg1VJyFa.svg" loading="lazy"></picture>
                            </div>
                            <div data-v-6ab4ab95="" class="rewardCard__infoContainer">
                                <div data-v-6ab4ab95="" class="rewardCard__textContainer" style="opacity: 1;">
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__title">AutoBSC++ Loaded</div>
                                    <div data-v-6ab4ab95="" class="rewardCard__textContainer__subTitle">made by laptopcat<br>UI by 123SONIC321<br>based on AutoBSC by catme0w</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--topLeft"></figure>
            <figure data-v-615f3480="" class="baseCard__corner baseCard__corner--bottomRight"></figure>
        </div>
    </div>
</div>`;
})();

function dragElement(elmnt) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    let dragger = document.getElementById("autobsc-header");
    let isDragging = false;

    if (dragger) {
        dragger.onmousedown = dragStart;
        dragger.ontouchstart = dragStart;
    }

    window.addEventListener('resize', () => enforceBounds(elmnt));

    function dragStart(e) {
        isDragging = false;

        let clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

        pos3 = clientX;
        pos4 = clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;

        elmnt.style.transition = "width 0.3s ease, border-radius 0.3s ease";
    }

    function elementDrag(e) {
        let clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        let clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

        if (Math.abs(pos3 - clientX) > 4 || Math.abs(pos4 - clientY) > 4) {
            isDragging = true;
        }

        if (!isDragging) return;

        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;

        let newTop = elmnt.offsetTop - pos2;
        let newLeft = elmnt.offsetLeft - pos1;

        let maxLeft = window.innerWidth - elmnt.offsetWidth;
        let maxTop = window.innerHeight - elmnt.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        elmnt.style.top = newTop + "px";
        elmnt.style.left = newLeft + "px";
    }

    function closeDragElement(e) {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;

        elmnt.style.transition = "width 0.3s ease, border-radius 0.3s ease, left 0.3s ease, top 0.3s ease";

        if (!isDragging) {
            if (e && e.type === "touchend") {
                e.preventDefault();
            }

            let willBeOpen = !elmnt.classList.contains('open');

            if (willBeOpen) {
                elmnt.classList.add('open');

                setTimeout(() => {
                    if (elmnt.classList.contains('open')) {
                        document.getElementById("autobsc-body").classList.add("allow-scroll");
                    }
                }, 400);

                let targetWidth = 300;
                let currentLeft = elmnt.offsetLeft;
                if (currentLeft + targetWidth > window.innerWidth) {
                    elmnt.style.left = Math.max(0, window.innerWidth - targetWidth - 10) + "px";
                }
                setTimeout(() => enforceBounds(elmnt), 350);
            } else {
                document.getElementById("autobsc-body").classList.remove("allow-scroll");
                elmnt.classList.remove('open');
            }
        }
    }

    function enforceBounds(el) {
        let maxLeft = window.innerWidth - el.offsetWidth;
        let maxTop = window.innerHeight - el.offsetHeight;

        let correctedLeft = Math.max(0, Math.min(el.offsetLeft, maxLeft - 10));
        let correctedTop = Math.max(0, Math.min(el.offsetTop, maxTop - 10));

        el.style.left = correctedLeft + "px";
        el.style.top = correctedTop + "px";
    }
}
