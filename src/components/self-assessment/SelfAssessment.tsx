"use client";

import Image from "next/image";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ANSWER_OPTIONS,
  QUESTIONS,
  TEST_VERSION,
} from "@/domain/self-esteem-v1/questions";
import {
  isAnswerValue,
  scoreAnswers,
} from "@/domain/self-esteem-v1/score";
import type { AnswerValue } from "@/domain/self-esteem-v1/types";
import styles from "./SelfAssessment.module.css";

const STORAGE_KEY = "pz-self-assessment-v1";
const STORAGE_TTL = 24 * 60 * 60 * 1000;

type Stage = "questions" | "email" | "result";

type StoredProgress = {
  version: string;
  answers: Array<AnswerValue | null>;
  currentIndex: number;
  stage: Exclude<Stage, "result">;
  expiresAt: number;
};

const emptyAnswers = (): Array<AnswerValue | null> =>
  Array.from({ length: QUESTIONS.length }, () => null);

function hasCompleteAnswers(
  answers: Array<AnswerValue | null>,
): answers is AnswerValue[] {
  return answers.length === QUESTIONS.length && answers.every(isAnswerValue);
}

function ResultGauge({ score }: { score: number }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const progress = (score - 10) / 30;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={styles.gauge}
      role="img"
      aria-label={`Twój wynik: ${score} na 40`}
    >
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle
          className={styles.gaugeTrack}
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="11"
        />
        <circle
          className={styles.gaugeValue}
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.gaugeLabel}>
        <strong>{score}</strong>
        <span>na 40</span>
      </div>
    </div>
  );
}

export function SelfAssessment() {
  const [answers, setAnswers] = useState<Array<AnswerValue | null>>(
    emptyAnswers,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("questions");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionRef = useRef<HTMLLegendElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const stored = JSON.parse(raw) as StoredProgress;
        const validAnswers =
          Array.isArray(stored.answers) &&
          stored.answers.length === QUESTIONS.length &&
          stored.answers.every(
            (answer) => answer === null || isAnswerValue(answer),
          );

        if (
          stored.version !== TEST_VERSION ||
          stored.expiresAt <= Date.now() ||
          !validAnswers
        ) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }

        setAnswers(stored.answers);
        setCurrentIndex(
          Math.min(Math.max(stored.currentIndex, 0), QUESTIONS.length - 1),
        );
        setStage(stored.stage === "email" ? "email" : "questions");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || stage === "result") return;

    const stored: StoredProgress = {
      version: TEST_VERSION,
      answers,
      currentIndex,
      stage,
      expiresAt: Date.now() + STORAGE_TTL,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [answers, currentIndex, hydrated, stage]);

  useEffect(() => {
    if (hydrated && stage === "questions") {
      questionRef.current?.focus({ preventScroll: true });
    }
  }, [currentIndex, hydrated, stage]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const selectAnswer = (value: AnswerValue) => {
    if (isAdvancing) return;

    setAnswers((current) => {
      const updated = [...current];
      updated[currentIndex] = value;
      return updated;
    });
    setIsAdvancing(true);

    advanceTimer.current = setTimeout(() => {
      if (currentIndex === QUESTIONS.length - 1) {
        setStage("email");
      } else {
        setCurrentIndex((index) => index + 1);
      }
      setIsAdvancing(false);
    }, 320);
  };

  const goBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setIsAdvancing(false);

    if (stage === "email") {
      setStage("questions");
      setCurrentIndex(QUESTIONS.length - 1);
      return;
    }

    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasCompleteAnswers(answers) || !marketingConsent) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setScore(scoreAnswers(answers));
    setStage("result");
    setIsSubmitting(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const restart = () => {
    setAnswers(emptyAnswers());
    setCurrentIndex(0);
    setStage("questions");
    setEmail("");
    setMarketingConsent(false);
    setScore(null);
  };

  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  const currentQuestion = QUESTIONS[currentIndex];

  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <a
          href="https://www.pracowniazycia.pl/"
          aria-label="Pracownia Życia — strona główna"
        >
          <Image
            src="/brand/logotyp-poziomy-deskryptor--grafit-krem.svg"
            alt="Pracownia Życia — Mental Fitness"
            width={300}
            height={66}
            priority
          />
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="page-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Bezpłatny test samooceny</p>
            <h1 id="page-title">Jak oceniasz siebie?</h1>
            <p className={styles.leadStatement}>
              To, jak oceniasz siebie, wiąże się z tym, na ile sobie ufasz.
            </p>
            <p className={styles.lead}>
              Dziesięć krótkich pytań pomoże Ci zobaczyć, jak wygląda Twoja
              relacja ze sobą. Po zakończeniu otrzymasz wynik, kontekst i
              praktyczne ćwiczenie, które pomogą Ci budować większą pewność
              siebie.
            </p>
            <p className={styles.meta}>
              <span>2–3 minuty</span>
              <span aria-hidden="true">·</span>
              <span>bezpłatnie</span>
              <span aria-hidden="true">·</span>
              <span>wynik od razu na adres e-mail</span>
            </p>
            <div className={styles.guidance}>
              <span className={styles.guidanceMark} aria-hidden="true">
                i
              </span>
              <p>
                Odpowiadaj tak, jak jest, nie tak, jak „powinno być”. Nie ma
                dobrych ani złych odpowiedzi.
              </p>
            </div>
          </div>

          <div className={styles.testColumn}>
            <div
              className={`${styles.card} ${stage === "result" ? styles.resultCard : ""}`}
            >
              {stage === "questions" && (
                <div className={styles.questionView}>
                  <div className={styles.progressHeader}>
                    <span>
                      Pytanie {currentIndex + 1} z {QUESTIONS.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-label="Postęp testu"
                    aria-valuemin={1}
                    aria-valuemax={QUESTIONS.length}
                    aria-valuenow={currentIndex + 1}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <fieldset className={styles.fieldset} disabled={isAdvancing}>
                    <legend
                      ref={questionRef}
                      className={styles.question}
                      tabIndex={-1}
                    >
                      {currentQuestion.text}
                    </legend>

                    <div className={styles.answers}>
                      {ANSWER_OPTIONS.map((option) => {
                        const checked = answers[currentIndex] === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`${styles.answer} ${checked ? styles.answerSelected : ""}`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option.value}
                              checked={checked}
                              onChange={() => selectAnswer(option.value)}
                            />
                            <span className={styles.radioMark} aria-hidden="true" />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={goBack}
                      disabled={currentIndex === 0 || isAdvancing}
                    >
                      <span aria-hidden="true">←</span> Wstecz
                    </button>
                    <span className={styles.autoAdvance}>Przejdziesz dalej automatycznie</span>
                  </div>
                </div>
              )}

              {stage === "email" && (
                <div className={styles.emailView}>
                  <p className={styles.cardEyebrow}>Wynik jest gotowy</p>
                  <h2>Gdzie wysłać Twój wynik?</h2>
                  <p className={styles.cardLead}>
                    Podaj adres e-mail, na który otrzymasz wynik testu.
                  </p>

                  <form onSubmit={submitEmail} className={styles.emailForm}>
                    <label className={styles.emailLabel} htmlFor="email">
                      Adres e-mail
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="twoj@email.pl"
                    />

                    <div className={styles.consent}>
                      <input
                        id="marketing-consent"
                        name="marketingConsent"
                        type="checkbox"
                        required
                        checked={marketingConsent}
                        onChange={(event) =>
                          setMarketingConsent(event.target.checked)
                        }
                      />
                      <label htmlFor="marketing-consent">
                        Wyrażam zgodę na otrzymywanie od Pracowni Życia drogą
                        e-mail treści o pewności siebie oraz informacji
                        marketingowych o programie Wellena. Zgoda jest wymagana,
                        aby otrzymać wynik testu. Mogę ją wycofać w każdej chwili.{" "}
                        <a
                          href="https://pracowniazycia.pl/polityka-prywatnosci-bezpieczenstwa-i-cookies/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Polityka prywatności
                        </a>
                        .
                      </label>
                    </div>

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Przygotowuję wynik…" : "Pokaż mój wynik"}
                    </button>

                  </form>

                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={goBack}
                  >
                    <span aria-hidden="true">←</span> Wróć do ostatniego pytania
                  </button>
                </div>
              )}

              {stage === "result" && score !== null && (
                <div className={styles.resultView}>
                  <p className={styles.cardEyebrow}>Twój dzisiejszy wynik</p>
                  <h2>{score} na 40 punktów</h2>
                  <ResultGauge score={score} />
                  <p className={styles.resultIntro}>
                    To zapis Twoich dzisiejszych odpowiedzi i punkt odniesienia
                    do dalszej refleksji. Nie jest oceną Ciebie ani miarą Twojej
                    wartości.
                  </p>

                  <div className={styles.resultSection}>
                    <h3>Pewność siebie i poczucie własnej wartości</h3>
                    <p>
                      Pewność siebie i poczucie własnej wartości nie są tym
                      samym. Pewność siebie widać w konkretnych sytuacjach i
                      działaniach. Poczucie własnej wartości sięga głębiej —
                      dotyczy sposobu, w jaki traktujesz siebie także wtedy, gdy
                      popełniasz błąd albo czegoś jeszcze nie potrafisz.
                    </p>
                  </div>

                  <div className={styles.exercise}>
                    <p className={styles.exerciseLabel}>Ćwiczenie do powrotów</p>
                    <h3>Potrafię / Mogę</h3>
                    <p>
                      Przypomnij sobie jedną rzecz, która Ci się udała — małą
                      albo dużą. Co zrobiłaś? Jaka cecha, decyzja lub umiejętność
                      Ci pomogła? Nazwij ją i wróć do tego wspomnienia, kiedy
                      staniesz przed kolejnym wyzwaniem.
                    </p>
                  </div>

                  <div className={styles.wellenaBox}>
                    <p className={styles.wellenaLabel}>
                      Wellena — program Pracowni Życia
                    </p>
                    <h3>Zaufaj sobie i zrób krok, który odkładałaś</h3>
                    <p>
                      Wellena to 30-dniowy indywidualny program budowania
                      pewności siebie, który pomaga przełożyć refleksję na małe
                      działania w codziennym życiu.
                    </p>
                    <a className={styles.primaryButton} href="https://wellena.pl">
                      Zobacz, jak działa Wellena
                    </a>
                  </div>

                  <button
                    type="button"
                    className={styles.restartButton}
                    onClick={restart}
                  >
                    Wypełnij test ponownie
                  </button>
                </div>
              )}
            </div>

            {stage !== "result" && (
              <p className={styles.disclaimer}>
                Test nie jest narzędziem klinicznym ani diagnozą psychologiczną.
                Wynik nie jest oceną Ciebie ani miarą Twojej wartości — to punkt
                odniesienia do samorefleksji.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
