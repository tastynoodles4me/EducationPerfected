// ==UserScript==
// @name         Education Perfectionist
// @namespace    http://tampermonkey.net/
// @version      0.0.0
// @description  Auto-answer Education Perfect Tasks at HIGH-er Speeds
// @author       KEN_2000, Garv
// @match        *://*.educationperfect.com/app/*
// @grant        none
// ==/UserScript==

let fullDict = {};
let cutDict = {};
let msg = '';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function ifExistsDo(selector, func) {
    const element = document.querySelector(selector);
    if (element) await func(element);
    return Boolean(element);
}

function untilElement(selector, timeout) {
    return Promise.race([
            new Promise((res, _rej) => {
                const el = document.querySelector(selector);
                if (el) res(el);
                new MutationObserver((mutationRecords, observer) => {
                    Array.from(document.querySelectorAll(selector)).forEach((el) => {
                        res(el);
                        observer.disconnect();
                    });
                }).observe(document.documentElement, {childList: true, subtree: true});
            }),
            new Promise((_res, rej) => setTimeout(rej, timeout))
        ]
    );
}

function cleanString(string) {
    string = String(string.replace(/ *\([^()]*\) */g, '').split('; ')[0]);
    string = string.split(', ')[0];
    return string;
}

function wordList(selector) {
    const words = [];
    document.querySelectorAll(selector).forEach(i => words.push(i.innerText));
    return words;
}

function mergeLists(l1, l2) {
    for (let i = 0; i < l1.length; i++) {
        fullDict[l2[i]] = cleanString(l1[i]);
        fullDict[l1[i]] = cleanString(l2[i]);
        cutDict[cleanString(l2[i])] = cleanString(l1[i]);
        cutDict[cleanString(l1[i])] = cleanString(l2[i]);
    }
}

function submitButton() {
    if (!ifExistsDo('button#explanation-button', (el) => {el.click()}) ) {
        document.querySelector('button.submit-button').click();
    }
}

function deleteModals() {
    document.querySelectorAll('div[uib-modal-window=modal-window]').forEach(i => i.remove());
    document.querySelectorAll('div[uib-modal-backdrop=modal-backdrop]').forEach(i => i.remove());
}

function findAnswer(question) {
    let answer = fullDict[question];
    if (answer === undefined) answer = fullDict[question.replace(',', ';')];
    if (answer === undefined) answer = cutDict[cleanString(question)];
    return answer;
}

async function correctAnswer(question) {
    msg = msg + `Extracted Question: ${question}\n`;
    for (let i = 0; i < 300; i++) {
        if (document.querySelector('td#question-field').innerText !== 'blau') break;
        await sleep(10);
    }
    msg = msg + `Correct question: ${document.querySelector('td#question-field').innerText}\n`;

    const answer = document.querySelector('td#correct-answer-field').innerText;
    document.querySelector('button#continue-button').disabled = false;
    document.querySelector('button#continue-button').click();

    fullDict[question] = answer;
    msg = msg + `Correct answer: ${answer}\n`;
    console.log(msg);
    deleteModals();
}

async function answerLoop() {
    let started = false;
    while (true) {
        try {
            let question = document.querySelector('#question-text').innerText;
            let answer = findAnswer(question);

            msg = `Extracted answer: ${answer}\n`;
            submitButton();
            document.querySelector('input#answer-text').value = answer;

            await ifExistsDo('td#correct-answer-field', async (_el) => {await correctAnswer(question)});
            await ifExistsDo('button.continue-button', (el) => {el.click()});
            started = true;
        } catch (err) {
            console.log(err);
            if (started) break;
        }
        await sleep(0);
    }
    for (let i = 0; i < 30; i++) {
        await sleep(100);
        let continueButton = document.querySelector('#start-button-main');
        if (continueButton !== null && continueButton.innerText === 'Continue' ) break;
    }
    document.querySelector('#start-button-main').disabled = false;
    document.querySelector('#start-button-main').click();

    deleteModals();
}


async function startAnswer() {
    await ifExistsDo('#full-list-switcher', async (el) => {el.click(); await sleep(200)});

    await mergeLists(wordList('div.targetLanguage'), wordList('div.baseLanguage')); await sleep(200);
    console.log(fullDict, cutDict);

    document.querySelector('.main-text.ng-binding.infinity').click();

    document.querySelector('#start-button-main').click(); await sleep(100);

    if (document.querySelector('.modal-header.ng-scope') !== null && document.querySelector('.modal-header.ng-scope').innerText === 'No more stars available') {
        await sleep(200);
        document.querySelector('#modal-close-button').click();
        deleteModals();
        return;
    }
    await answerLoop();
    await untilElement('li.mode-0', 5000).catch((_) => {});
}

async function answerAll() {
    await ifExistsDo('li.mode-0', async (el) => {
        el.click();
        await startAnswer();
    });
    await ifExistsDo('li.mode-1', async (el) => {
        el.click();
        await startAnswer();
    });
    console.log('Answered All');
}


(async function () {
    document.addEventListener('keydown', async (event) => {
        if (event.altKey && event.key.toLowerCase() === 's') {
            if (window.location.href.includes('/list-starter')) await answerAll();
        }
    });
})();