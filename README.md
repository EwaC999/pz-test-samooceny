# PŻ Test samooceny

Publiczny, bezpłatny test samooceny Pracowni Życia prowadzący do 30-dniowego programu Wellena.

## Status

Pierwsza działająca wersja aplikacji jest gotowa lokalnie. Zawiera:

- responsywny ekran startowy i 10 pytań;
- automatyczne przechodzenie między pytaniami i zapamiętywanie postępu przez 24 godziny;
- formularz adresu e-mail oraz ekran wyniku ze wskaźnikiem kołowym;
- treść edukacyjną, ćwiczenie i przejście do 30-dniowego programu Wellena;
- testy mechaniki punktacji.

Wysyłka wyniku na adres e-mail jest na razie symulowana w interfejsie. Integracja z dostawcą poczty i analityka zostaną dodane przed publikacją.

## Uruchomienie lokalne

```bash
pnpm install
pnpm dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

Kontrola jakości:

```bash
pnpm lint
pnpm test
pnpm build
```

## Zatwierdzony kierunek techniczny

- adres: `test-samooceny.pracowniazycia.pl`;
- aplikacja: Next.js + TypeScript;
- hosting: Vercel;
- repozytorium: GitHub;
- baza danych: bez Supabase w MVP;
- analityka: GA4/GTM z pomiarem przejścia do `wellena.pl`;
- wynik: `10–40`, z neutralnym wskaźnikiem kołowym;
- Wellena: 30-dniowy program Pracowni Życia.

## Dokumentacja

- [`SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md`](./SPECYFIKACJA_WDROZENIOWA_TESTU_v1.md) — przebieg, architektura i kryteria odbioru;
- [`TEST_SAMOOCENY_MECHANIKA_v1.md`](./TEST_SAMOOCENY_MECHANIKA_v1.md) — pytania i źródło prawdy dla punktacji;
- [`TEST SAMOOCENY PŻ.txt`](./TEST%20SAMOOCENY%20PŻ.txt) — robocza treść landingu;
- [`TEKST_EKRAN_STARTOWY_v1.md`](./TEKST_EKRAN_STARTOWY_v1.md) — rekomendowany tekst pierwszego ekranu i pytania 1;
- [`WYNIK TESTU.txt`](./WYNIK%20TESTU.txt) — robocza treść wyniku;
- [`Kontekst/`](./Kontekst/) — strategia oraz zasady marki i języka.
