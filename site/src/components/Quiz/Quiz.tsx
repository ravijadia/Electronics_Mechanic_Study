import React, {useState} from 'react';
import styles from './styles.module.css';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizProps {
  title?: string;
  questions: QuizQuestion[];
  passPercent?: number;
}

export default function Quiz({title, questions, passPercent = 60}: QuizProps): JSX.Element {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);

  const score = submitted
    ? answers.reduce<number>(
        (sum, a, i) => sum + (a === questions[i].correctIndex ? 1 : 0),
        0,
      )
    : 0;
  const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passed = percent >= passPercent;

  function selectOption(qIndex: number, oIndex: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = oIndex;
      return next;
    });
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleRetry() {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  }

  return (
    <div className={styles.quiz}>
      {title && <h2>{title}</h2>}

      {submitted && (
        <div className={`${styles.resultBanner} ${passed ? styles.pass : styles.fail}`}>
          <strong>
            તમારો સ્કોર (Score): {score} / {questions.length} ({percent}%)
          </strong>
          <div>{passed ? 'પાસ! 🎉' : 'ફરી પ્રયત્ન કરો (Try again)'}</div>
        </div>
      )}

      {questions.map((q, qIndex) => {
        const selected = answers[qIndex];
        return (
          <div key={qIndex} className={styles.question}>
            <p className={styles.questionText}>
              {qIndex + 1}. {q.question}
            </p>
            <div className={styles.options}>
              {q.options.map((option, oIndex) => {
                let optionClass = styles.option;
                if (submitted) {
                  if (oIndex === q.correctIndex) {
                    optionClass += ` ${styles.correct}`;
                  } else if (oIndex === selected) {
                    optionClass += ` ${styles.incorrect}`;
                  }
                } else if (oIndex === selected) {
                  optionClass += ` ${styles.selected}`;
                }
                return (
                  <label key={oIndex} className={optionClass}>
                    <input
                      type="radio"
                      name={`quiz-q${qIndex}`}
                      checked={selected === oIndex}
                      disabled={submitted}
                      onChange={() => selectOption(qIndex, oIndex)}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className={styles.explanation}>💡 {q.explanation}</p>
            )}
          </div>
        );
      })}

      <div className={styles.actions}>
        {!submitted ? (
          <button
            className={styles.submitButton}
            disabled={!allAnswered}
            onClick={handleSubmit}
          >
            સબમિટ કરો (Submit)
          </button>
        ) : (
          <button className={styles.submitButton} onClick={handleRetry}>
            ફરી પ્રયત્ન કરો (Retry)
          </button>
        )}
      </div>
    </div>
  );
}
