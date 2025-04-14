// UIの更新（画面表示切り替え、問題・結果表示、ハイスコア表示など）

const ui = {
    // DOM要素
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultsScreen: document.getElementById('results-screen'),
    questionCounter: document.getElementById('question-counter'),
    timerDisplay: document.getElementById('timer'), // タイマー表示用
    quizImage: document.getElementById('quiz-image'),
    questionText: document.getElementById('question-text'),
    answerOptionsContainer: document.getElementById('answer-options'),
    feedbackText: document.getElementById('feedback-text'),
    infoImage: document.getElementById('info-image'), // 詳細情報用
    nextQuestionBtn: document.getElementById('next-question-btn'), // 「次の問題へ」/「結果を見る」ボタン
    scoreDisplay: document.getElementById('score'),
    timeTakenDisplay: document.getElementById('time-taken'),
    resultsDetailsContainer: document.getElementById('results-details'),
    highScoresArea: document.getElementById('high-scores-area'), // ハイスコア表示エリア
    quizRef: null, // quiz オブジェクトへの参照を保持

    // quiz オブジェクトへの参照を受け取るメソッド
    setQuizReference(quizObject) {
        this.quizRef = quizObject;
    },

    // スクリーン表示切り替え
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
    },

    // 問題表示
    displayQuestion(questionData, currentNum, totalNum, mode) {
        // ↓↓↓ ボタンの状態をリセットする処理を追加 ↓↓↓
        if (this.nextQuestionBtn) {
            this.nextQuestionBtn.textContent = '次の問題へ'; // ボタンテキストをデフォルトに戻す
            this.nextQuestionBtn.style.display = 'none';     // 一旦非表示に
        }
        // ↑↑↑ リセット処理終了 ↑↑↑

        this.feedbackText.textContent = ''; this.feedbackText.className = '';
        this.infoImage.style.display = 'none'; this.infoImage.src = '';
        // this.nextQuestionBtn.style.display = 'none'; // 上でリセットしているので不要

        const questionTotalDisplay = (mode === 'timeAttack') ? '∞' : totalNum;
        this.questionCounter.textContent = `問題 ${currentNum} / ${questionTotalDisplay}`;

        // タイマー表示ロジック (quizRef 参照)
        const timeLimit = (this.quizRef && this.quizRef.timeLimit !== undefined) ? this.quizRef.timeLimit : 0;
        const shouldShowTimer = timeLimit > 0;
        if (this.timerDisplay) {
            this.timerDisplay.style.display = shouldShowTimer ? 'block' : 'none';
            console.log(`>>> displayQuestion: quizRef.timeLimit=${timeLimit}, Setting timer display to: ${this.timerDisplay.style.display}`);
            if (!shouldShowTimer) { this.updateTimerDisplay(null); }
        } else {
            console.error("Timer display element (#timer) not found!");
        }

        // 画像表示
        if (questionData.image) {
            if (this.quizImage) {
                 this.quizImage.src = questionData.image; this.quizImage.style.display = 'block';
                 this.quizImage.onerror = () => { this.quizImage.alt = '画像読込失敗'; this.quizImage.style.display = 'none'; };
                 this.quizImage.alt = `HamCup ${questionData?.originalData?.name || ''} Image`;
             }
        } else {
             if(this.quizImage) { this.quizImage.style.display = 'none'; this.quizImage.src = ''; this.quizImage.alt = ''; }
        }

        // 質問文表示
        if(this.questionText) { this.questionText.textContent = questionData.text; }

        // 回答選択肢表示
        if(this.answerOptionsContainer) {
            this.answerOptionsContainer.innerHTML = '';
             if (!questionData.choices || questionData.choices.length === 0) { this.answerOptionsContainer.innerHTML = '<p>選択肢の生成に失敗しました。</p>'; return; }
            questionData.choices.forEach(choice => {
                const button = document.createElement('button'); button.textContent = choice; button.classList.add('answer-btn');
                button.addEventListener('click', () => {
                    this.disableAnswerButtons();
                    if (this.quizRef && typeof this.quizRef.submitAnswer === 'function') {
                        this.quizRef.submitAnswer(choice);
                    } else {
                        console.error("Quiz reference or submitAnswer method is not set correctly in ui object.");
                    }
                });
                this.answerOptionsContainer.appendChild(button);
            });
        }
    },

    // 回答ボタン無効化
    disableAnswerButtons() {
        if (this.answerOptionsContainer) {
            const buttons = this.answerOptionsContainer.querySelectorAll('.answer-btn');
            buttons.forEach(button => { button.disabled = true; button.classList.add('disabled'); });
        }
    },

    // 正誤フィードバック表示 (練習モード用) (quizRef 参照)
    // quiz.js 側で currentQuestion を渡すように修正した前提
    displayFeedback(isCorrect, correctAnswer, infoImageUrl, currentQuestionData) {
        console.log("--- displayFeedback called ---");
        if(this.feedbackText) {
            this.feedbackText.textContent = isCorrect ? '正解！' : `不正解... 正解は: ${correctAnswer}`;
            this.feedbackText.className = isCorrect ? 'correct' : 'incorrect';
        }

        // const currentQuestionData = (this.quizRef && typeof this.quizRef.getCurrentQuestion === 'function') ? this.quizRef.getCurrentQuestion() : null;
        console.log("displayFeedback: Current question data:", currentQuestionData);
        if (currentQuestionData) {
             const correctImageToShow = currentQuestionData.answerImage || currentQuestionData.image;
             console.log(`displayFeedback: Image path determined for #quiz-image: ${correctImageToShow}`);
             if (correctImageToShow && this.quizImage) {
                 this.quizImage.src = correctImageToShow;
                 this.quizImage.alt = `正解: ${currentQuestionData.correctAnswer || ''} の画像`;
                 this.quizImage.style.display = 'block';
                 this.quizImage.onerror = () => { console.error(`displayFeedback: ERROR loading image for #quiz-image: ${correctImageToShow}`); this.quizImage.alt = '画像読込失敗'; this.quizImage.style.display = 'none'; };
                 this.quizImage.onload = () => { console.log(`displayFeedback: Successfully loaded image for #quiz-image: ${correctImageToShow}`); };
             } else {
                 if(this.quizImage) this.quizImage.style.display = 'none';
             }
         } else {
              console.warn("displayFeedback: Could not get currentQuestionData.");
         }

        if (infoImageUrl && this.infoImage) {
            this.infoImage.src = infoImageUrl;
            this.infoImage.style.display = 'block';
            this.infoImage.onerror = () => { this.infoImage.style.display = 'none'; this.infoImage.alt = '情報画像読込失敗'; };
            this.infoImage.alt = `詳細情報: ${correctAnswer}`;
        } else {
            if(this.infoImage) { this.infoImage.style.display = 'none'; this.infoImage.src = ''; this.infoImage.alt = ''; }
        }

        if(this.answerOptionsContainer){
            const buttons = this.answerOptionsContainer.querySelectorAll('.answer-btn');
            buttons.forEach(button => { if (button.textContent === correctAnswer) button.classList.add('correct'); });
        }
        console.log("--- displayFeedback finished ---");
    },

    // 「次の問題へ」ボタン表示 (練習モード用)
    showNextButton() {
        if(this.nextQuestionBtn) {
            this.nextQuestionBtn.textContent = '次の問題へ'; // テキストを確実に設定
            this.nextQuestionBtn.style.display = 'inline-block';
        }
    },

    // ↓↓↓ ★★★ 新しいメソッドを追加 ★★★ ↓↓↓
    /** 練習モード最後の問題で「次の問題へ」ボタンを「結果を見る」に変える */
    changeNextButtonToResults() {
        if(this.nextQuestionBtn) {
            this.nextQuestionBtn.textContent = '結果を見る'; // テキスト変更
            this.nextQuestionBtn.style.display = 'inline-block'; // 表示する
        } else {
             console.error("nextQuestionBtn not found, cannot change to results button.");
         }
    },
    // ↑↑↑ ここまで追加 ↑↑↑

    // タイマー表示更新
    updateTimerDisplay(seconds) {
        if (!this.timerDisplay) return;
        if (seconds === null || typeof seconds === 'undefined' || seconds < 0) {
             this.timerDisplay.textContent = '';
             return;
        }
       const minutes = Math.floor(seconds / 60);
       const remainingSeconds = seconds % 60;
       const timerText = `残り時間: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
       this.timerDisplay.textContent = timerText;
    },

    // 結果表示 (quizRef 参照を削除し timeLimit を引数で受け取る)
    // quiz.js 側で timeLimit を渡すように修正した前提
    displayResults(score, attemptedQuestionsCount, mode, timeTaken, userAnswers, timeLimit) {
        if(this.scoreDisplay) {
            let scoreText = `スコア: ${score}`;
            if (mode === 'main' || mode === 'practice' || mode === 'practiceCharacter') { // 練習モードでも合計問題数を表示
                scoreText += ` / ${attemptedQuestionsCount}`;
            }
            else if (mode === 'timeAttack') {
                const limit = timeLimit !== undefined ? timeLimit : '??';
                scoreText += ` 点 (${limit}秒)`;
            }
            this.scoreDisplay.textContent = scoreText;
        }

        if(this.timeTakenDisplay){
            if (mode === 'main') {
                 const minutes = Math.floor(timeTaken / 60); const seconds = timeTaken % 60;
                 this.timeTakenDisplay.textContent = `解答時間: ${minutes}分 ${seconds}秒`;
                 this.timeTakenDisplay.style.display = 'block';
            } else {
                 this.timeTakenDisplay.style.display = 'none'; // 練習、TAでは非表示
            }
        }

        if(this.resultsDetailsContainer) {
            this.resultsDetailsContainer.innerHTML = '<h3>解答履歴:</h3>';
            const list = document.createElement('ul');
            if(userAnswers && userAnswers.length > 0) {
                userAnswers.forEach((answer, index) => {
                     if (!answer) return; // 不完全な解答データはスキップ
                    const li = document.createElement('li');
                    const charName = answer.characterName ? ` (${answer.characterName})` : '';
                    // テキストが長すぎる場合があるので調整 (例: 50文字)
                    const questionTextShort = answer.questionText ? answer.questionText.substring(0, 50) + (answer.questionText.length > 50 ? '...' : '') : '質問不明';
                    const correctAnswerText = answer.correctAnswer ?? '正解不明'; // null/undefinedの場合の表示
                    const userAnswerText = answer.userAnswer ?? '未解答'; // null/undefinedの場合の表示
                    const correctnessMark = answer.isCorrect === true ? '✓' : (answer.isCorrect === false ? '✗' : '?'); // boolean以外も考慮

                    let answerDetailHTML = `<span>問題 ${index + 1}:${charName} ${questionTextShort}</span> <span class="correct-answer">正解: ${correctAnswerText}</span> <span class="user-answer ${answer.isCorrect ? 'correct' : 'incorrect'}">あなたの回答: ${userAnswerText} ${correctnessMark}</span>`;
                    li.innerHTML = answerDetailHTML;
                    list.appendChild(li);
                });
            } else { list.innerHTML = '<li>解答履歴はありません。</li>'; }
            this.resultsDetailsContainer.appendChild(list);
        }
    },

    // getHighScoreKeyForMode (変更なし)
    getHighScoreKeyForMode(mode, value) {
        const HIGH_SCORE_PREFIX = 'hamCupHighScores_';
        if (mode === 'main') { return `${HIGH_SCORE_PREFIX}main_${value}`; }
        else if (mode === 'timeAttack') { return `${HIGH_SCORE_PREFIX}timeAttack_${value}`; }
        return null;
    },

    // displayHighScores (オンライン対応済み)
    async displayHighScores(fetchScoresFunc) {
        console.log("Updating ONLINE high scores display...");
        if (!this.highScoresArea) { return; }
        if (typeof fetchScoresFunc !== 'function') { /* ... */ return; }
        this.highScoresArea.innerHTML = '<h2>ハイスコア Top 3</h2>';
        const scoreCategories = [
            { mode: 'main', value: 10, title: '本番 (10問)' }, { mode: 'main', value: 30, title: '本番 (30問)' },
            { mode: 'main', value: 50, title: '本番 (50問)' }, { mode: 'main', value: 100, title: '本番 (100問)' },
            { mode: 'main', value: 350, title: '本番 (350問)' }, { mode: 'timeAttack', value: 120, title: `タイムアタック (${120 / 60}分)` }
        ];
        for (const category of scoreCategories) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'highscore-category';
            categoryDiv.innerHTML = `<h3>${category.title}</h3><ol><li>読込中...</li></ol>`;
            this.highScoresArea.appendChild(categoryDiv);
            try {
                const scores = await fetchScoresFunc(category.mode, category.value, 3);
                const ol = categoryDiv.querySelector('ol'); ol.innerHTML = '';
                if (scores && scores.length > 0) {
                    scores.forEach((entry, index) => {
                        const li = document.createElement('li'); let details = '';
                        const scoreDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString('ja-JP') : '日付不明';
                        if (category.mode === 'main') {
                            const timeStr = entry.time_taken_seconds !== null && entry.time_taken_seconds !== undefined ? `${entry.time_taken_seconds}秒` : '- 秒';
                            details = `(${entry.score}点, ${timeStr}, ${scoreDate})`;
                        } else if (category.mode === 'timeAttack') { details = `(${entry.score}点 / ${category.value}秒, ${scoreDate})`; }
                        else { details = `(${entry.score}点, ${scoreDate})`; }
                        li.innerHTML = `<span class="rank">${index + 1}.</span> <span class="score-name">${entry.player_name || '名無し'}</span> <span class="score-details">${details}</span>`;
                        ol.appendChild(li);
                    });
                } else { ol.innerHTML = '<li>まだ記録はありません</li>'; }
             } catch (error) {
                 console.error(`Failed to load scores for ${category.title}:`, error);
                 const ol = categoryDiv.querySelector('ol'); if (ol) { ol.innerHTML = '<li>読込失敗</li>'; }
            }
        }
    }
};

export default ui;