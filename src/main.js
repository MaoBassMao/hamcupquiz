// main.js の一番上
import quiz from './quiz.js';
import ui from './ui.js';
import { supabase } from './supabaseClient.js';

// === DOM Elements ===
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
// Start Screen Buttons
const startPracticeSequentialBtn = document.getElementById('start-practice-sequential-btn');
const startPracticeRandomBtn = document.getElementById('start-practice-random-btn');
// ↓↓↓ キャラ別練習用の要素を追加 ↓↓↓
const characterSelect = document.getElementById('character-select'); // キャラ選択ドロップダウン
const startPracticeCharSequentialBtn = document.getElementById('start-practice-character-sequential-btn'); // キャラ別練習(順番)ボタン
const startPracticeCharRandomBtn = document.getElementById('start-practice-character-random-btn'); // キャラ別練習(ランダム)ボタン
// ↑↑↑ ここまで追加 ↑↑↑
const mainQuizButtons = document.querySelectorAll('.main-quiz-btn');
const startTimeAttackBtn = document.getElementById('start-timeattack-btn');
// Quiz Screen Buttons
const nextQuestionBtn = document.getElementById('next-question-btn');
const backToStartBtn = document.getElementById('back-to-start-btn');
// Results Screen Buttons
const restartBtn = document.getElementById('restart-btn');
// High Score Display Area
const highScoresArea = document.getElementById('high-scores-area');

// === Global Variables ===
let allHamCupData = [];
let allPossibleQuestions = []; // Generate once on load
let currentQuizMode = ''; // 'practice', 'main', 'timeAttack', 'practiceCharacter' を追加
let currentQuizLength = 0;
let currentQuizTimeLimit = 0;

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    setupEventListeners();
    loadHamCupData().then(() => {
        if (typeof ui.displayHighScores === 'function') {
             ui.displayHighScores(fetchOnlineHighScores); // オンラインランキング表示
        } else {
             console.error("ui.displayHighScores is not available or not a function.");
        }
    }).catch(error => {
        console.error("Error during initial data load:", error);
    });
});

// === Event Listeners Setup ===
function setupEventListeners() {
    // 通常の練習モード
    startPracticeSequentialBtn.addEventListener('click', () => handlePracticeStart(false));
    startPracticeRandomBtn.addEventListener('click', () => handlePracticeStart(true));

    // ↓↓↓ キャラ別練習のリスナーを追加 ↓↓↓
    // キャラクター選択ドロップダウンの変更を監視
    characterSelect.addEventListener('change', () => {
        // キャラクターが選択されたら（空の値でなければ）ボタンを有効化
        if (characterSelect.value) {
            startPracticeCharSequentialBtn.disabled = false;
            startPracticeCharRandomBtn.disabled = false;
        } else {
            // "--選択してください--" が選ばれたらボタンを無効化
            startPracticeCharSequentialBtn.disabled = true;
            startPracticeCharRandomBtn.disabled = true;
        }
    });
    // キャラ別練習 (順番) ボタン
    startPracticeCharSequentialBtn.addEventListener('click', () => handleCharacterPracticeStart(false));
    // キャラ別練習 (ランダム) ボタン
    startPracticeCharRandomBtn.addEventListener('click', () => handleCharacterPracticeStart(true));
    // ↑↑↑ ここまで追加 ↑↑↑

    // 本番クイズモード
    mainQuizButtons.forEach(button => {
        button.addEventListener('click', () => {
            const numQuestions = parseInt(button.dataset.questions, 10);
            handleMainQuizStart(numQuestions);
        });
    });

    // タイムアタックモード
    startTimeAttackBtn.addEventListener('click', () => {
        const timeLimit = parseInt(startTimeAttackBtn.dataset.time, 10);
        handleTimeAttackStart(timeLimit);
    });

    // 結果画面のボタン
    restartBtn.addEventListener('click', () => {
        quiz.resetQuizState();
        ui.showScreen('start-screen');
        if (typeof ui.displayHighScores === 'function') {
            ui.displayHighScores(fetchOnlineHighScores);
        }
    });

    // main.js の setupEventListeners 関数内 (置き換えるコード)

    nextQuestionBtn.addEventListener('click', () => {
        // ボタンのテキスト内容で処理を分岐
        if (nextQuestionBtn.textContent === '結果を見る') {
            // 「結果を見る」ボタンが押された場合 (練習モードの最後)
            console.log("Showing practice results...");
            // ui.displayResults を呼び出して結果を表示 (timeTaken は 0 を渡す)
            if (typeof ui.displayResults === 'function') {
                // quiz オブジェクトから必要な情報を取得して渡す
                ui.displayResults(quiz.score, quiz.userAnswers.length, quiz.mode, 0, quiz.userAnswers, quiz.timeLimit);
            } else {
                 console.error("displayResults function is not available in uiUtils"); // uiUtils ではなく ui を直接使うので修正
             }
            // 結果画面に遷移
            if (typeof ui.showScreen === 'function') {
                ui.showScreen('results-screen');
            } else {
                 console.error("showScreen function is not provided via uiUtils."); // uiUtils ではなく ui を直接使うので修正
             }
        } else {
            // 通常の「次の問題へ」ボタンが押された場合
            quiz.moveToNextQuestion();
        }
    }); // ← ここまでが置き換える範囲
    backToStartBtn.addEventListener('click', () => {
        let confirmMessage = "クイズを中断してトップに戻りますか？";
        if (currentQuizMode === 'main' || currentQuizMode === 'timeAttack') {
            confirmMessage += "\n（中断したクイズのスコアは記録されません）";
        }
        if (confirm(confirmMessage)) {
             quiz.resetQuizState();
             ui.showScreen('start-screen');
             if (typeof ui.displayHighScores === 'function') {
                 ui.displayHighScores(fetchOnlineHighScores);
             }
        }
    });
}

// === Data Loading ===
async function loadHamCupData() {
    // 省略 (変更なし) ...
    const allStartButtons = document.querySelectorAll('#start-screen button');
    allStartButtons.forEach(btn => btn.disabled = true); // キャラ別ボタンも初期は disabled

    try {
        console.log("Fetching hamcups.json...");
        const response = await fetch('/hamcups.json');
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}, Failed to fetch /hamcups.json`); }
        try { allHamCupData = await response.json(); } catch (jsonError) { console.error("Failed to parse response as JSON:", jsonError); throw new Error("Received data is not valid JSON."); }
        console.log("HamCup data loaded:", allHamCupData);

        allPossibleQuestions = quiz.generateQuizQuestions(allHamCupData);
        console.log(`Total possible questions generated: ${allPossibleQuestions.length}`);

        if (allPossibleQuestions.length > 0) {
            // 通常のボタンを有効化
            startPracticeSequentialBtn.disabled = false;
            startPracticeSequentialBtn.textContent = '練習 (順番)';
            startPracticeRandomBtn.disabled = false;
            startPracticeRandomBtn.textContent = '練習 (ランダム)';
            mainQuizButtons.forEach(btn => { btn.disabled = false; btn.textContent = `${btn.dataset.questions}問`; });
            startTimeAttackBtn.disabled = false;
            startTimeAttackBtn.textContent = `タイムアタック (${startTimeAttackBtn.dataset.time / 60}分)`;

            // ↓↓↓ キャラクター選択ドロップダウンを生成する関数を呼び出す ↓↓↓
            populateCharacterDropdown();

        } else {
             throw new Error("No questions could be generated from the data.");
        }
    } catch (error) {
        console.error("Could not initialize app:", error);
        alert(`アプリの初期化に失敗しました: ${error.message}`);
        allStartButtons.forEach(btn => { btn.textContent = '読込失敗'; btn.disabled = true; });
        // throw error;
    }
}

// ↓↓↓ ★★★ 新しく追加する関数 ★★★ ↓↓↓
/** キャラクター選択ドロップダウンに選択肢を追加する関数 (ID順ソート対応版) */
function populateCharacterDropdown() {
    if (!characterSelect || !allHamCupData || allHamCupData.length === 0) {
        console.error("Character select dropdown or HamCup data not available.");
        return;
    }

    // 既存のオプションをクリア (最初の "--選択してください--" 以外)
    while (characterSelect.options.length > 1) {
        characterSelect.remove(1);
    }

    // 1. IDと名前を持つ有効なキャラクターデータのみをフィルタリング
    const validCharacters = allHamCupData.filter(h => h.id && h.name);

    // 2. ID (文字列として) でソートする
    validCharacters.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });

    // 3. ソートされたリストからオプションを追加
    validCharacters.forEach(hamcup => {
        const option = document.createElement('option');
        option.value = hamcup.name; // value は name のまま (フィルターで使うため)
        option.textContent = `${hamcup.id}: ${hamcup.name}`; // 表示テキストを "ID: 名前" に変更
        characterSelect.appendChild(option);
    });

    // ドロップダウンを有効化
    characterSelect.disabled = false;
}
// ↑↑↑ ★★★ ここまで追加 ★★★ ↑↑↑


// === Quiz Start Handlers ===
function handlePracticeStart(shuffle) {
    if (allPossibleQuestions.length === 0) { alert("出題できる練習問題がありません。"); return; }
    currentQuizMode = 'practice'; // 通常の練習モード
    currentQuizLength = allPossibleQuestions.length;
    currentQuizTimeLimit = 0;
    const questions = shuffle ? quiz.shuffleArray([...allPossibleQuestions]) : allPossibleQuestions;
    startQuiz(questions);
}

// ↓↓↓ ★★★ 新しく追加する関数 ★★★ ↓↓↓
/** キャラ別練習モードを開始するハンドラー */
function handleCharacterPracticeStart(shuffle) {
    if (!characterSelect) { alert("キャラクター選択要素が見つかりません。"); return; }
    const selectedCharacterName = characterSelect.value;

    if (!selectedCharacterName) {
        alert("キャラクターを選択してください。");
        return;
    }
    if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }

    // 選択されたキャラクターの問題のみを抽出
    const characterQuestions = allPossibleQuestions.filter(q => q.characterName === selectedCharacterName);

    if (characterQuestions.length === 0) {
        alert(`${selectedCharacterName} に関する問題が見つかりませんでした。`);
        return;
    }

    console.log(`Starting character practice for ${selectedCharacterName}. Questions found: ${characterQuestions.length}, Shuffle: ${shuffle}`);

    currentQuizMode = 'practiceCharacter'; // キャラ別練習モード
    currentQuizLength = characterQuestions.length;
    currentQuizTimeLimit = 0;

    // 順番またはランダムで問題リストを準備
    const questionsToStart = shuffle ? quiz.shuffleArray([...characterQuestions]) : characterQuestions;

    startQuiz(questionsToStart);
}
// ↑↑↑ ★★★ ここまで追加 ★★★ ↑↑↑


function handleMainQuizStart(numQuestions) {
    // 省略 (変更なし) ...
    if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
    currentQuizMode = 'main';
    currentQuizLength = numQuestions;
    currentQuizTimeLimit = 0;
    if (allPossibleQuestions.length < numQuestions) { currentQuizLength = allPossibleQuestions.length; }
    const mainQuizQuestions = selectRandomQuestions(allPossibleQuestions, currentQuizLength);
    if (mainQuizQuestions.length === 0) { alert("問題を選択できませんでした。"); return; }
    startQuiz(mainQuizQuestions);
}

function handleTimeAttackStart(timeLimit) {
     // 省略 (変更なし) ...
     if (allPossibleQuestions.length === 0) { alert("出題できる問題がありません。"); return; }
     currentQuizMode = 'timeAttack';
     currentQuizLength = allPossibleQuestions.length;
     currentQuizTimeLimit = timeLimit;
     const timeAttackQuestions = quiz.shuffleArray([...allPossibleQuestions]);
     startQuiz(timeAttackQuestions);
}

// === Core Quiz Initiation ===
function startQuiz(questions) {
    // 省略 (変更なし、quiz.initQuiz の呼び出しは修正済み) ...
    console.log(`Starting ${currentQuizMode} quiz. Length/Limit: ${currentQuizMode === 'timeAttack' ? currentQuizTimeLimit + 's' : questions.length + 'q'}`);
    quiz.initQuiz( questions, currentQuizMode, currentQuizTimeLimit, ui, { maybeSaveHighScore: maybeSaveHighScore, submitScore: submitScore });
    if (typeof ui.setQuizReference === 'function') { ui.setQuizReference(quiz); } else { console.error("ui.setQuizReference function is missing!"); }
    ui.showScreen('quiz-screen');
    quiz.loadQuestion();
}

// === High Score Handling ===
// 省略 (getHighScoreKey, loadHighScores, saveHighScores, maybeSaveHighScore は変更なし) ...
const HIGH_SCORE_PREFIX = 'hamCupHighScores_';
function getHighScoreKey() { /* ... */ }
function loadHighScores(key) { /* ... */ }
function saveHighScores(key, scores) { /* ... */ }
function maybeSaveHighScore(finalScore, timeTaken) { /* ... maybeSaveHighScore 内の ui.displayHighScores 呼び出しは修正済みのはず ... */
    const isOnlineMode = (currentQuizMode === 'main' || currentQuizMode === 'timeAttack');
    let shouldPromptAndSave = false;
    if (isOnlineMode) {
        const key = getHighScoreKey();
        const localHighScores = loadHighScores(key);
        const lowestTopScore = localHighScores.length < 3 ? -Infinity : localHighScores[localHighScores.length - 1].score;
        const lowestTopTime = localHighScores.length < 3 ? Infinity : localHighScores[localHighScores.length - 1].time;
        if (localHighScores.length < 3 || finalScore > lowestTopScore || (finalScore === lowestTopScore && currentQuizMode === 'main' && timeTaken < lowestTopTime) || (finalScore === lowestTopScore && currentQuizMode === 'timeAttack')) {
            shouldPromptAndSave = true;
        }
    } else { return; }

    if (shouldPromptAndSave) {
        setTimeout(() => {
            let userName = prompt(`ハイスコア達成！ (${finalScore}点) \nランキングに登録する名前を入力してください (10文字以内):`, "名無しさん");
            if (userName !== null) {
                userName = userName.substring(0, 10).trim();
                if (userName === "") userName = "名無しさん";
                const newScoreEntryLocal = { name: userName, score: finalScore, date: new Date().toLocaleDateString('ja-JP')};
                if (currentQuizMode === 'main') { newScoreEntryLocal.time = timeTaken; newScoreEntryLocal.total = currentQuizLength; }
                else if (currentQuizMode === 'timeAttack') { newScoreEntryLocal.timeLimit = currentQuizTimeLimit; }
                const key = getHighScoreKey();
                const localHighScores = loadHighScores(key);
                const updatedLocalScores = [...localHighScores, newScoreEntryLocal];
                saveHighScores(key, updatedLocalScores);
                submitScore(userName, finalScore, currentQuizMode, currentQuizMode === 'main' ? currentQuizLength : currentQuizTimeLimit, timeTaken);
                if (typeof ui.displayHighScores === 'function') { ui.displayHighScores(fetchOnlineHighScores); } // オンライン表示更新
            } else { console.log("User cancelled name prompt for high score."); }
        }, 100);
    } else { console.log("Score did not qualify for local high score top 3."); }
}

// === Helper Function (Random Selection) ===
function selectRandomQuestions(sourceArray, count) {
    // 省略 (変更なし) ...
    if (!sourceArray || sourceArray.length === 0) return [];
    const actualCount = Math.min(count, sourceArray.length);
    const shuffled = quiz.shuffleArray([...sourceArray]);
    return shuffled.slice(0, actualCount);
}

// === Supabase Score Submission ===
async function submitScore(name, score, mode, modeValue, timeTaken = null) {
    // 省略 (変更なし) ...
    console.log(`Submitting score to Supabase: ${name}, ${score}, ${mode}, ${modeValue}, time: ${timeTaken}`);
    const scoreData = { player_name: name, score: score, quiz_mode: mode, mode_value: modeValue, };
    if (mode === 'main' && timeTaken !== null) { scoreData.time_taken_seconds = timeTaken; }
    try {
        const { data, error } = await supabase.from('scores').insert([scoreData]);
        if (error) { console.error("Supabase score submission failed:", error); }
        else { console.log("Supabase score submission successful:", data); }
    } catch (error) { console.error("An unexpected error occurred during score submission:", error); }
}

// === Supabase High Score Fetching ===
async function fetchOnlineHighScores(mode, value, limit = 3) {
    // 省略 (変更なし) ...
    console.log(`Workspaceing online high scores for mode: ${mode}, value: ${value}, limit: ${limit}`);
    try {
        let query = supabase.from('scores').select('player_name, score, time_taken_seconds, created_at').eq('quiz_mode', mode).eq('mode_value', value);
        query = query.order('score', { ascending: false });
        if (mode === 'main') { query = query.order('time_taken_seconds', { ascending: true, nullsFirst: false }); }
        query = query.order('created_at', { ascending: false });
        query = query.limit(limit);
        const { data, error } = await query;
        if (error) { console.error(`Error fetching high scores for ${mode} ${value}:`, error); return []; }
        console.log(`Workspaceed scores for ${mode} ${value}:`, data);
        return data || [];
    } catch (err) { console.error("Unexpected error fetching high scores:", err); return []; }
}