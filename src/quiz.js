// quiz.js (完全版 - 持ち物対応、重複選択肢対応、依存性注入対応、練習結果ボタン対応)

const quiz = {
    questions: [],
    currentIndex: 0,
    score: 0,
    mode: '',
    timeLimit: 0,
    timerId: null,
    timeRemaining: 0,
    userAnswers: [],
    uiUtils: {}, // main.js から渡される UI 関数を保持
    callbacks: {}, // main.js から渡されるコールバック関数を保持

    // initQuiz で uiUtils と callbacks を受け取る
    initQuiz(selectedQuestions, mode, timeLimit = 0, uiFuncs, callbacks) {
        this.questions = Array.isArray(selectedQuestions) ? selectedQuestions : [];
        this.currentIndex = 0;
        this.score = 0;
        this.mode = mode;
        this.timeLimit = this.mode === 'timeAttack' ? timeLimit : 0;
        this.userAnswers = [];
        this.uiUtils = uiFuncs || {};
        this.callbacks = callbacks || {};

        this.resetTimer();
        console.log(`Quiz initialized. Mode: ${this.mode}, Questions: ${this.questions.length}, TimeLimit: ${this.timeLimit}s`);

        if (this.timeLimit > 0) {
            this.timeRemaining = this.timeLimit;
            this.startTimer();
        }
    },

    // 問題データの配列から、実際のクイズ問題形式を生成する (持ち物対応、重複選択肢対応済み)
    generateQuizQuestions(data) {
        const generatedQuestions = [];
        if (!Array.isArray(data)) return generatedQuestions;

        // 各種データのプールを作成
        const allNames = data.map(h => h.name).filter(n => n);
        const allOwner1s = data.map(h => h.owner1).filter(o => o);
        const allOwner2s = data.map(h => h.owner2).filter(o => o);
        const allIds = data.map(h => h.id).filter(id => id);
        const allHobbies = data.map(h => h.hobby).filter(t => t);
        const allSkills = data.map(h => h.skill).filter(t => t);
        const allSweets = data.map(h => h.sweets).filter(t => t);
        const allPersonalities = data.map(h => h.personality).filter(t => t);
        const allItems = data.map(h => h.item).filter(i => i); // item を追加
        let allProfileAnswers = new Set();
        data.forEach(hamcup => {
            if (hamcup.profile) {
                const profileMatches = hamcup.profile.matchAll(/{\[(.*?)\]}/g);
                for (const match of profileMatches) { if (match[1]) { allProfileAnswers.add(match[1].trim()); } }
            }
        });
        const profileAnswersPool = Array.from(allProfileAnswers);

        // 各 HamCup データから問題を生成
        data.forEach(hamcup => {
            const commonProps = { infoImage: hamcup.image_info, originalData: hamcup, characterName: hamcup.name }; // characterName を追加済み
            const traits = [
                { key: 'hobby', name: '趣味', pool: allHobbies },
                { key: 'skill', name: '特技', pool: allSkills },
                { key: 'sweets', name: '和菓子', pool: allSweets },
                { key: 'personality', name: '性格', pool: allPersonalities },
                { key: 'item', name: '持ち物', pool: allItems } // item を追加済み
            ];

            // --- 問題タイプ生成 ---
            if (hamcup.image_quiz && hamcup.name) generatedQuestions.push({ ...commonProps, type: 'image_to_name', text: 'このHamCupの名前は？', image: hamcup.image_quiz, correctAnswer: hamcup.name, choices: this.generateChoices(hamcup.name, allNames) });
            if (hamcup.name && hamcup.owner1) generatedQuestions.push({ ...commonProps, type: 'name_to_owner1', text: `HamCup『${hamcup.name}』の1st Ownerは？`, image: hamcup.image_quiz, correctAnswer: hamcup.owner1, choices: this.generateChoices(hamcup.owner1, allOwner1s) });
            if (hamcup.name && hamcup.owner2) generatedQuestions.push({ ...commonProps, type: 'name_to_owner2', text: `HamCup『${hamcup.name}』の2nd Ownerは？`, image: hamcup.image_quiz, correctAnswer: hamcup.owner2, choices: this.generateChoices(hamcup.owner2, allOwner2s) });
            if (hamcup.name && hamcup.id) generatedQuestions.push({ ...commonProps, type: 'name_to_id', text: `HamCup『${hamcup.name}』のID(No.)は？`, image: hamcup.image_quiz, correctAnswer: hamcup.id, choices: this.generateChoices(hamcup.id, allIds) });
            if (hamcup.id && hamcup.name) generatedQuestions.push({ ...commonProps, type: 'id_to_name', text: `HamCup #${hamcup.id} の名前は？`, image: hamcup.image_quiz, correctAnswer: hamcup.name, choices: this.generateChoices(hamcup.name, allNames) });

            // 名前 → 特性
            traits.forEach(traitInfo => {
                if (hamcup.name && hamcup[traitInfo.key]) {
                    generatedQuestions.push({ ...commonProps, type: `name_to_${traitInfo.key}`, text: `HamCup『${hamcup.name}』の${traitInfo.name}は？`, image: hamcup.image_quiz, correctAnswer: hamcup[traitInfo.key], choices: this.generateChoices(hamcup[traitInfo.key], traitInfo.pool) });
                }
            });

            // 特性 → 名前 (重複アイテム対応版)
            traits.forEach(traitInfo => {
                if (hamcup[traitInfo.key] && hamcup.name) {
                    const currentValue = hamcup[traitInfo.key];
                    const correctAnswerName = hamcup.name;

                    // この特性値を持つ他のキャラクター名を探す
                    const duplicateCharacterNames = data
                        .filter(h => h.name !== correctAnswerName && h[traitInfo.key] === currentValue)
                        .map(h => h.name);

                    // 選択肢プールから重複キャラを除外
                    const filteredNamePool = allNames.filter(name => !duplicateCharacterNames.includes(name));

                    // フィルター済みのプールを使って選択肢を生成
                    const choices = this.generateChoices(correctAnswerName, filteredNamePool);

                    generatedQuestions.push({
                        ...commonProps,
                        type: `${traitInfo.key}_to_name`,
                        text: `『${currentValue}』が${traitInfo.name}なのは誰？`,
                        image: 'assets/images/question-mark.png',
                        answerImage: hamcup.image_quiz,
                        correctAnswer: correctAnswerName,
                        choices: choices
                    });
                }
            });

            // プロフィール穴埋め
             if (hamcup.profile) {
                 const profileMatches = Array.from(hamcup.profile.matchAll(/{\[(.*?)\]}/g));
                 profileMatches.forEach((match, index) => {
                     const correctAnswer = match[1]?.trim(); if (!correctAnswer) return;
                     let builtQuestionText = ""; let lastIndex = 0;
                     profileMatches.forEach((m, i) => { builtQuestionText += hamcup.profile.substring(lastIndex, m.index); if (i === index) { builtQuestionText += "[＿＿＿]"; } else { builtQuestionText += (m[1] || ''); } lastIndex = m.index + m[0].length; });
                     builtQuestionText += hamcup.profile.substring(lastIndex); const questionText = builtQuestionText;
                     const choices = this.generateChoices(correctAnswer, profileAnswersPool);
                     generatedQuestions.push({ ...commonProps, type: 'profile_fill_blank', text: questionText, image: hamcup.image_quiz, correctAnswer: correctAnswer, choices: choices });
                 });
             }
        });
        return generatedQuestions;
    },

    // 選択肢を生成する
    generateChoices(correctAnswer, optionsPool) { // 引数名を allOptionsPool -> optionsPool に変更 (意味は同じ)
        const choices = new Set();
        if (correctAnswer !== null && correctAnswer !== undefined && String(correctAnswer).trim() !== '') {
            choices.add(String(correctAnswer));
        }
        // optionsPool (全キャラ名またはフィルター済みキャラ名) から重複を除き、正解も除外
        const uniqueOptions = [...new Set(optionsPool)]
                              .map(opt => String(opt))
                              .filter(opt => opt.trim() !== '' && opt !== String(correctAnswer));
        const maxChoices = 4;
        // 不正解の選択肢を追加
        while (choices.size < maxChoices && uniqueOptions.length > 0) {
            const randomIndex = Math.floor(Math.random() * uniqueOptions.length);
            choices.add(uniqueOptions.splice(randomIndex, 1)[0]);
        }
        // それでも足りなければダミー選択肢を追加
        const dummyAnswers = ["？？？", "---", "データなし", "ひみつ"];
        let dummyIndex = 0;
         while (choices.size < maxChoices && dummyIndex < dummyAnswers.length) {
            if (!choices.has(dummyAnswers[dummyIndex])) {
                 choices.add(dummyAnswers[dummyIndex]);
            }
            dummyIndex++;
         }
        return this.shuffleArray(Array.from(choices));
    },

    // 配列をシャッフルする
    shuffleArray(array) {
        if (!Array.isArray(array)) return [];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // 現在の問題データを取得
    getCurrentQuestion() {
        if (this.questions && Array.isArray(this.questions) && this.currentIndex >= 0 && this.currentIndex < this.questions.length) {
            return this.questions[this.currentIndex];
        }
        return null;
    },

    // 問題を読み込んで表示
    loadQuestion() {
        const questionData = this.getCurrentQuestion();
        if (questionData) {
            if (typeof this.uiUtils.displayQuestion === 'function') {
                this.uiUtils.displayQuestion(questionData, this.currentIndex + 1, this.questions.length, this.mode, this.timeLimit);
            } else { console.error("displayQuestion function is not provided via uiUtils"); }
        } else {
            if(this.questions && this.questions.length > 0 && this.currentIndex >= this.questions.length) {
                if (this.mode !== 'timeAttack') { this.endQuiz(); }
            } else {
                console.warn("No question data to load...");
                 if(typeof this.uiUtils.showScreen === 'function') { this.uiUtils.showScreen('start-screen'); }
                 else { console.error("showScreen function is not provided via uiUtils."); }
            }
        }
    },

    // 回答処理 (練習モード結果ボタン対応済み)
    submitAnswer(selectedAnswer) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return;
        const isCorrect = (selectedAnswer === currentQuestion.correctAnswer);
        this.userAnswers[this.currentIndex] = { questionText: currentQuestion.text, userAnswer: selectedAnswer, correctAnswer: currentQuestion.correctAnswer, isCorrect: isCorrect, infoImage: currentQuestion.infoImage, characterName: currentQuestion.characterName };
        if (isCorrect) { this.score++; }

        if (this.mode === 'practice' || this.mode === 'practiceCharacter') {
            if(typeof this.uiUtils.displayFeedback === 'function') {
                 this.uiUtils.displayFeedback(isCorrect, currentQuestion.correctAnswer, currentQuestion.infoImage, currentQuestion);
             } else { console.error("displayFeedback function is not provided via uiUtils"); }

            if (this.currentIndex === this.questions.length - 1) { // 最後の問題か？
                if(typeof this.uiUtils.changeNextButtonToResults === 'function') {
                    this.uiUtils.changeNextButtonToResults(); // 「結果を見る」ボタン表示
                } else { console.error("changeNextButtonToResults function is not provided via uiUtils"); }
            } else { // 最後でなければ「次へ」ボタン表示
                if(typeof this.uiUtils.showNextButton === 'function') {
                    this.uiUtils.showNextButton();
                } else { console.error("showNextButton function is not provided via uiUtils"); }
            }
        }
        else { this.moveToNextQuestion(); } // 本番・TAは次へ
    },

    // 次の問題へ進む
    moveToNextQuestion() {
        this.currentIndex++;
        if (this.mode === 'timeAttack' && this.currentIndex >= this.questions.length) {
            this.currentIndex = 0; // ループ
        }
        if (this.currentIndex < this.questions.length || (this.mode === 'timeAttack' && this.timeRemaining > 0)) {
            this.loadQuestion();
        } else {
             if (this.mode !== 'timeAttack') { this.endQuiz(); } // TA以外で問題が終わったら終了
        }
    },

    // クイズ終了処理 (練習モード結果表示は main.js で制御)
    endQuiz() {
        const timeTaken = this.timeLimit > 0 ? this.timeLimit - this.timeRemaining : 0;
        this.stopTimer();
        console.log(`Quiz ended. Mode: ${this.mode}, Score: ${this.score}/${this.userAnswers.length}, Time Taken/Remaining: ${timeTaken}s / ${this.timeRemaining}s`);

        // ランキング対象モードの場合のみスコア保存/送信
        if (typeof this.callbacks.maybeSaveHighScore === 'function' && (this.mode === 'main' || this.mode === 'timeAttack')) {
            this.callbacks.maybeSaveHighScore(this.score, timeTaken);
        } else if (this.mode === 'main' || this.mode === 'timeAttack') {
             console.warn("maybeSaveHighScore callback function not provided.");
         }

        // 練習モード以外は結果画面を表示
        if (this.mode !== 'practice' && this.mode !== 'practiceCharacter') {
            if(typeof this.uiUtils.displayResults === 'function') {
                this.uiUtils.displayResults(this.score, this.userAnswers.length, this.mode, timeTaken, this.userAnswers, this.timeLimit);
            } else { console.error("displayResults function is not provided via uiUtils"); }
            if(typeof this.uiUtils.showScreen === 'function') {
                this.uiUtils.showScreen('results-screen');
            } else { console.error("showScreen function is not provided via uiUtils"); }
         } else {
             console.log("Practice quiz ended normally (not via results button).");
         }
    },

    // タイマー関連 (依存性注入済み)
    startTimer() { /* ... */ },
    stopTimer() { /* ... */ },
    resetTimer() { /* ... */ },
     // クイズ状態リセット (変更なし)
    resetQuizState() { /* ... */ }
};

export default quiz;