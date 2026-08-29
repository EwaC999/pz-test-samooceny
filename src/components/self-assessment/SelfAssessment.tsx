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
const RESULT_STORAGE_KEY = "pz-self-assessment-result-v1";
const STORAGE_TTL = 24 * 60 * 60 * 1000;

type Stage = "questions" | "email" | "result";

type StoredProgress = {
  version: string;
  answers: Array<AnswerValue | null>;
  currentIndex: number;
  stage: Exclude<Stage, "result">;
  expiresAt: number;
};

type StoredResult = {
  version: string;
  score: number;
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
  const progress = Math.min(Math.max((score - 10) / 30, 0), 1);
  const arcLength = circumference * 0.75;
  const valueLength = Math.max(arcLength * progress, 0.001);

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
          strokeLinecap="round"
          strokeDasharray={[arcLength, circumference - arcLength].join(" ")}
        />
        <circle
          className={styles.gaugeValue}
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={[valueLength, circumference - valueLength].join(" ")}
        />
      </svg>
      <div className={styles.gaugeLabel}>
        <strong>{score}</strong>
        <span>na 40</span>
      </div>
      <div className={styles.gaugeScale} aria-hidden="true">
        <span>10</span>
        <span>40</span>
      </div>
    </div>
  );
}

function ResultScreen({
  score,
  onRestart,
}: {
  score: number;
  onRestart: () => void;
}) {
  return (
    <main className={styles.resultMain}>
      <section className={styles.resultHero} aria-labelledby="result-title">
        <div className={styles.resultHeroGrid}>
          <div className={styles.resultCopy}>
            <p className={styles.resultEyebrow}>
              Pracownia Życia · Test samooceny
            </p>
            <h1 id="result-title" tabIndex={-1}>
              Twój wynik to
              <span>{score} na 40 punktów</span>
            </h1>
            <p className={styles.resultIntro}>
              To zapis Twoich dzisiejszych odpowiedzi i punkt odniesienia do
              dalszej refleksji. Nie jest oceną Ciebie ani miarą Twojej wartości.
            </p>
          </div>

          <div className={styles.resultGaugePanel}>
            <ResultGauge score={score} />
            <p>Twój dzisiejszy punkt odniesienia</p>
          </div>
        </div>

        <div className={styles.resultDisclaimer}>
          <span className={styles.resultInfoMark} aria-hidden="true">
            i
          </span>
          <p>
            Test jest autorskim wskaźnikiem samooceny inspirowanym skalą
            Rosenberga. Nie jest narzędziem klinicznym ani diagnozą
            psychologiczną. Niezależnie od miejsca, z którego zaczynasz, możesz
            pracować nad relacją ze sobą.
          </p>
        </div>
      </section>

      <section
        className={styles.resultEducation}
        aria-labelledby="education-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Mini edukacja</p>
          <h2 id="education-title">Co warto wiedzieć o relacji ze sobą</h2>
        </div>

        <div className={styles.educationGrid}>
          <article className={styles.educationCard}>
            <span className={styles.educationNumber} aria-hidden="true">
              01
            </span>
            <h3>Pewność siebie i poczucie własnej wartości</h3>
            <p>
              Pewność siebie nie jest tym samym co poczucie własnej wartości.
              Pewność siebie jest zewnętrznym objawem wewnętrznego poczucia
              własnej wartości i skuteczności. Poczucie własnej wartości sięga
              głębiej: oznacza przekonanie, że masz nienaruszalną wartość i
              zasługujesz na szacunek także wtedy, gdy popełniasz błąd, czegoś
              nie potrafisz lub przeżywasz trudniejszy moment.
            </p>
          </article>

          <article className={styles.educationCard}>
            <span className={styles.educationNumber} aria-hidden="true">
              02
            </span>
            <h3>Poczucie własnej wartości nie jest ustalone raz na zawsze</h3>
            <p>
              Na sposób, w jaki dziś myślisz o sobie, wpłynęły między innymi
              doświadczenia z dzieciństwa, pierwsze relacje oraz komunikaty,
              które otrzymywałaś od ważnych osób. Jako dziecko nie miałaś wpływu
              na wiele z tych doświadczeń ani możliwości spojrzenia na nie z
              dorosłej perspektywy. Nie oznacza to jednak, że dzieciństwo musi
              na zawsze określać Twój stosunek do siebie.
            </p>
            <p>
              Jako dorosła osoba możesz przejąć odpowiedzialność za swoje życie
              i wzmacniać swoją pewność siebie poprzez budowanie zdrowego
              poczucia własnej wartości. Wzmacnianie poczucia własnej wartości
              nie polega na przekonywaniu siebie, że zawsze jesteś doskonała.
              Chodzi o rozwijanie zaufania do własnego umysłu i możliwości oraz
              traktowanie siebie jako osoby, której potrzeby, granice i cele
              mają znaczenie.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.exerciseSection} aria-labelledby="exercise-title">
        <div className={styles.exerciseInner}>
          <div className={styles.exerciseHeader}>
            <div>
              <p className={styles.sectionEyebrow}>
                Ćwiczenie do wielokrotnego wykorzystania
              </p>
              <h2 id="exercise-title">Potrafię / Mogę</h2>
            </div>
            <p>
              Kiedy stoisz przed nowym wyzwaniem, uwaga łatwo skupia się na
              ryzyku i Twoich brakach. Wtedy zrób to ćwiczenie.
            </p>
          </div>

          <ol className={styles.exerciseSteps}>
            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                1
              </span>
              <div>
                <h3>Wybierz jedno wydarzenie albo sytuację</h3>
                <p>
                  Przypomnij sobie jedną rzecz, która Ci się udała. Może to być
                  coś niewielkiego: ugotowanie dobrego obiadu, napisanie trudnej
                  wiadomości albo załatwienie sprawy. Może to być również
                  większe osiągnięcie: zdanie prawa jazdy lub matury, uzyskanie
                  dyplomu, znalezienie pracy, urządzenie mieszkania albo
                  doprowadzenie dużego projektu do końca.
                </p>
                <p>
                  Nie musi to być nic wielkiego. Ważne, abyś czuła wtedy swoją
                  sprawczość.
                </p>
              </div>
            </li>

            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                2
              </span>
              <div>
                <h3>Przypomnij sobie</h3>
                <p>
                  Gdzie byłaś? Co widziałaś wokół siebie? Co czułaś — radość,
                  dumę, a może satysfakcję? Jaka umiejętność, decyzja, cecha albo
                  sposób działania Ci pomogły?
                </p>
                <p>
                  Nazwij choć jedną swoją cechę, dzięki której udało Ci się tego
                  dokonać.
                </p>
              </div>
            </li>

            <li className={styles.exerciseStep}>
              <span className={styles.stepNumber} aria-hidden="true">
                3
              </span>
              <div>
                <h3>
                  Wracaj do tego wspomnienia zawsze, kiedy stoisz przed nowym
                  wyzwaniem
                </h3>
                <p>
                  Nie po to, by przekonywać siebie, że kolejna rzecz na pewno się
                  uda. Po to, żeby obok obaw zobaczyć również fakty o tym, co już
                  potrafisz i z czego możesz skorzystać.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.wellenaSection} aria-labelledby="wellena-title">
        <div className={styles.wellenaInner}>
          <div className={styles.wellenaVisual}>
            <Image
              src="/brand/wellena-spokojna-sprawczosc.png"
              alt="Kobieta porządkująca notatki przed podjęciem działania"
              fill
              sizes="(max-width: 960px) 100vw, 46vw"
            />
            <p>Przygotowanie. Decyzja. Działanie.</p>
          </div>

          <div className={styles.wellenaCopy}>
            <p className={styles.wellenaLabel}>
              Wellena — program Pracowni Życia
            </p>
            <h2 id="wellena-title">
              Nie zawsze brakuje Ci kompetencji. Czasem najbardziej zatrzymuje
              Cię brak zaufania do siebie.
            </h2>
            <p className={styles.wellenaSummary}>
              <strong>
                Wellena to 30-dniowy indywidualny program budowania pewności
                siebie z osobistą przewodniczką AI.
              </strong>
            </p>
            <p>
              Pomaga Ci lepiej poznać siebie, zobaczyć realne podstawy zaufania
              do siebie i przekładać wnioski na małe działania w codziennym
              życiu.
            </p>

            <div className={styles.wellenaDetails}>
              <h3>Podczas 30-dniowego programu:</h3>
              <ul className={styles.wellenaList}>
                <li>lepiej poznajesz swoje mocne strony, wartości i zasoby,</li>
                <li>
                  przyjrzysz się przekonaniom i reakcjom, które zatrzymują Cię
                  przed działaniem,
                </li>
                <li>nauczysz się dbać o swoje potrzeby i granice,</li>
                <li>
                  zobaczysz, jak przełożyć wnioski na małe działania w realnym
                  życiu,
                </li>
                <li>
                  będziesz budować zaufanie do siebie poprzez własne
                  doświadczenia i małe kroki.
                </li>
              </ul>
              <p className={styles.wellenaPurpose}>
                Celem nie jest stworzenie „nowej Ciebie”. Chodzi o to, żebyś
                wyraźniej zobaczyła to, na czym już możesz się oprzeć, i zrobiła
                krok, który do tej pory odkładałaś.
              </p>
              <a
                className={[styles.primaryButton, styles.wellenaCta].join(" ")}
                href="https://wellena.pl"
              >
                Zobacz, jak działa Wellena
              </a>
              <p className={styles.wellenaMeta}>
                30 dni · indywidualny proces · program rozwojowy, nie terapia
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.resultFooter}>
        <button
          type="button"
          className={styles.restartButton}
          onClick={onRestart}
        >
          Wypełnij test ponownie
        </button>
      </footer>
    </main>
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
        const rawResult = window.sessionStorage.getItem(RESULT_STORAGE_KEY);
        if (rawResult) {
          const storedResult = JSON.parse(rawResult) as StoredResult;
          const validScore =
            Number.isInteger(storedResult.score) &&
            storedResult.score >= 10 &&
            storedResult.score <= 40;

          if (storedResult.version === TEST_VERSION && validScore) {
            setScore(storedResult.score);
            setStage("result");
            window.localStorage.removeItem(STORAGE_KEY);
            return;
          }

          window.sessionStorage.removeItem(RESULT_STORAGE_KEY);
        }

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

  useEffect(() => {
    if (!hydrated || stage !== "result") return;

    window.scrollTo({ top: 0, behavior: "auto" });
    document
      .getElementById("result-title")
      ?.focus({ preventScroll: true });
  }, [hydrated, stage]);

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
    const calculatedScore = scoreAnswers(answers);

    try {
      const storedResult: StoredResult = {
        version: TEST_VERSION,
        score: calculatedScore,
      };
      window.sessionStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify(storedResult),
      );
    } catch {}

    setScore(calculatedScore);
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
    window.sessionStorage.removeItem(RESULT_STORAGE_KEY);
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

      {stage === "result" && score !== null ? (
        <ResultScreen score={score} onRestart={restart} />
      ) : (
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
              <div className={styles.card}>
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

            </div>

              <p className={styles.disclaimer}>
                Test nie jest narzędziem klinicznym ani diagnozą psychologiczną.
                Wynik nie jest oceną Ciebie ani miarą Twojej wartości — to punkt
                odniesienia do samorefleksji.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
