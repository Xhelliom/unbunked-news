import type { SeedArticle } from "./seed-articles-data";

// A longer demo article (9 paragraphs, 7 claims) kept separate so
// seed-articles-data.ts stays under the 500-line cap. Two paragraphs carry
// several claims of different statuses at once, to exercise the gradient bar
// and multiple inline highlights inside a single paragraph.

export const EXTRA_ARTICLES: SeedArticle[] = [
  {
    slug: "voiture-electrique-pollue-plus-thermique",
    sourceName: "Capital",
    sourceUrl: "https://capital.fr/auto/voiture-electrique-pollution",
    tagSlug: "environment",
    verdict: "nuanced",
    reliabilityScore: 59,
    factualityScore: 64,
    sourcingScore: 55,
    neutralityScore: 42,
    completenessScore: 50,
    transparencyScore: 60,
    recencyScore: 72,
    publishedAt: "2026-06-02",
    title:
      "La voiture électrique pollue-t-elle plus qu'une thermique ? Le détail des chiffres",
    originalTitle:
      "La grande arnaque de la voiture électrique, plus polluante qu'un diesel",
    summary:
      "Sur la durée de vie et dans un pays à l'électricité décarbonée, l'électrique émet bien moins qu'une thermique — mais l'article empile un point d'équilibre présenté comme universel, un recyclage nié à tort et une pénurie datée sans fondement. Le vrai et le faux y voisinent dans les mêmes paragraphes.",
    originalSummary:
      "Capital présente la voiture électrique comme une « arnaque » écologique : sa batterie émettrait 7 tonnes de CO2 à la fabrication, elle ne serait pas réellement plus propre selon l'électricité de recharge, ses batteries finiraient en décharge, et une pénurie de lithium dès 2030 condamnerait la filière. L'article met en avant les impacts miniers — eau, cobalt — comme preuve d'une imposture écologique.",
    body: [
      {
        text: "« La grande arnaque de la voiture électrique » : le titre de Capital ne s'embarrasse pas de nuances, et l'article qui suit accumule les chiffres sans toujours préciser d'où ils viennent. Certains sont exacts, d'autres sont sortis de leur contexte, et plusieurs reposent sur une confusion entre la fabrication d'un véhicule et son usage sur toute sa durée de vie. Démêler les uns des autres demande de prendre chaque affirmation séparément.",
      },
      {
        text: "L'article part d'un constat juste : fabriquer une voiture électrique émet davantage de CO2 qu'une thermique équivalente, à cause de la batterie. Il avance que la seule production d'une batterie de 60 kWh représente environ 7 tonnes de CO2, un ordre de grandeur conforme aux analyses de cycle de vie publiées par l'ADEME et par plusieurs revues scientifiques. Sur ce point de départ, rien à redire.",
        claim: {
          claimText:
            "La production d'une batterie de 60 kWh représente environ 7 tonnes de CO2",
          status: "supported",
          explanation:
            "L'ordre de grandeur est cohérent avec les analyses de cycle de vie de l'ADEME (2022) et la synthèse de l'ICCT : entre 6 et 9 tonnes de CO2 selon la chimie de la batterie et le mix électrique de production. Le chiffre de 7 tonnes se situe au centre de cette fourchette.",
          anchor:
            "la seule production d'une batterie de 60 kWh représente environ 7 tonnes de CO2",
          sources: [
            {
              title: "ADEME — Analyse de cycle de vie des véhicules électriques",
              url: "https://ademe.fr/acv-vehicules",
            },
            {
              title: "ICCT — Lifecycle GHG emissions of cars, 2021",
              url: "https://theicct.org/lifecycle-ghg",
            },
          ],
        },
      },
      {
        // One paragraph, two claims of different statuses → gradient bar + two
        // inline highlights (amber "partly_true" + orange "misleading").
        text: "C'est ensuite que le raisonnement dérape, et il dérape dans une seule phrase : l'article affirme coup sur coup qu'une électrique « compense sa dette carbone dès 15 000 kilomètres » et qu'elle reste « de toute façon plus propre, quelle que soit l'électricité utilisée pour la recharger ». Les deux propositions sont présentées comme également solides ; elles ne le sont pas du tout.",
        claims: [
          {
            claimText:
              "Une électrique compense sa dette carbone dès 15 000 kilomètres",
            status: "partly_true",
            explanation:
              "Vrai pour le mix électrique français, très décarboné : le point d'équilibre se situe autour de 15 000 à 30 000 km. Mais ce chiffre dépend entièrement du pays de recharge ; sur un mix très carboné, il grimpe à 60 000 km ou davantage. Le présenter comme une constante valable partout est trompeur.",
            anchor: "compense sa dette carbone dès 15 000 kilomètres",
            sources: [
              {
                title: "ICCT — Break-even mileage by electricity mix",
                url: "https://theicct.org/break-even",
              },
            ],
          },
          {
            claimText: "Plus propre quelle que soit l'électricité utilisée",
            status: "misleading",
            explanation:
              "Faux comme énoncé absolu. Sur un réseau dominé par le charbon, le bilan carbone d'une électrique peut rejoindre, voire dépasser, celui d'une thermique récente sur les premières dizaines de milliers de kilomètres. L'avantage n'est pas inconditionnel : il dépend directement du mix électrique de recharge.",
            anchor:
              "plus propre, quelle que soit l'électricité utilisée pour la recharger",
            sources: [
              {
                title: "IEA — Global EV Outlook 2025",
                url: "https://iea.org/global-ev-outlook",
              },
            ],
          },
        ],
      },
      {
        text: "Tout l'enjeu tient donc à l'électricité de recharge, que l'article élude soigneusement. En France, où le nucléaire et l'hydraulique dominent, l'avantage de l'électrique est massif et rapide. En Pologne ou en Inde, où le charbon pèse encore lourd, il se réduit fortement et met bien plus de kilomètres à se matérialiser. Parler d'un chiffre unique « valable partout » n'a tout simplement pas de sens physique.",
      },
      {
        text: "Plus loin, l'article assène que « les batteries ne se recyclent pas et finissent en décharge ». L'affirmation est catégorique — et fausse. Les filières industrielles de recyclage récupèrent aujourd'hui plus de 90 % des métaux d'une batterie lithium-ion dans les usines européennes les plus avancées, et la réglementation impose des taux de collecte croissants d'année en année.",
        claim: {
          claimText: "Les batteries ne se recyclent pas et finissent en décharge",
          status: "false",
          explanation:
            "Les procédés hydrométallurgiques récupèrent plus de 90 % du lithium, du nickel et du cobalt d'une batterie en fin de vie. Le règlement européen sur les batteries (2023) fixe des objectifs de collecte et de matière recyclée juridiquement contraignants. L'idée d'une mise en décharge généralisée ne correspond à aucune donnée.",
          anchor: "les batteries ne se recyclent pas et finissent en décharge",
          sources: [
            {
              title: "Règlement (UE) 2023/1542 relatif aux batteries",
              url: "https://eur-lex.europa.eu/batteries-2023",
            },
            {
              title: "Nature — Recycling lithium-ion batteries, 2024",
              url: "https://nature.com/li-ion-recycling",
            },
          ],
        },
      },
      {
        text: "Tout n'est pas faux pour autant, et c'est ce qui rend le sujet délicat. L'article rappelle à juste titre que l'extraction du lithium dans les salars d'Amérique du Sud consomme d'énormes quantités d'eau, dans des régions déjà arides. Le chiffre avancé — de l'ordre de 2 millions de litres d'eau par tonne de lithium — correspond aux estimations documentées pour l'extraction par évaporation de saumure.",
        claim: {
          claimText:
            "L'extraction du lithium consomme environ 2 millions de litres d'eau par tonne",
          status: "supported",
          explanation:
            "Le chiffre est cohérent avec les études sur l'extraction par évaporation de saumure dans le triangle du lithium (Chili, Argentine, Bolivie). C'est un impact local réel, distinct du bilan carbone, et l'article a raison de le mentionner.",
          anchor: "de l'ordre de 2 millions de litres d'eau par tonne de lithium",
          sources: [
            {
              title: "Friends of the Earth — Lithium and water use",
              url: "https://foe.org/lithium-water",
            },
          ],
        },
      },
      {
        // Second multi-claim paragraph → grey "unverifiable" + amber
        // "partly_true" side by side.
        text: "Le dernier paragraphe de l'article mêle de nouveau le solide et le fragile : il prédit une « pénurie mondiale de lithium dès 2030 » qui rendrait la transition impossible, et affirme dans la même phrase que « la majorité du cobalt des batteries provient de mines employant des enfants ». La première prévision ne repose sur aucun consensus ; la seconde déforme une réalité pourtant préoccupante.",
        claims: [
          {
            claimText: "Pénurie mondiale de lithium dès 2030",
            status: "unverifiable",
            explanation:
              "Les projections de l'offre et de la demande de lithium divergent fortement selon les hypothèses de recyclage, d'ouverture de nouvelles mines et de chimies alternatives (sodium-ion). Aucune source ne permet d'affirmer une pénurie datée à 2030 : c'est une hypothèse parmi d'autres, présentée ici comme une certitude.",
            anchor: "pénurie mondiale de lithium dès 2030",
            sources: [],
          },
          {
            claimText:
              "La majorité du cobalt des batteries provient de mines employant des enfants",
            status: "partly_true",
            explanation:
              "Une part du cobalt de République démocratique du Congo provient de mines artisanales où le travail des enfants est documenté, ce qui est un vrai problème. Mais « la majorité » est faux : l'essentiel du cobalt congolais sort de mines industrielles, la part artisanale étant estimée entre 15 et 30 %. L'enjeu est réel, le quantificateur est exagéré.",
            anchor:
              "la majorité du cobalt des batteries provient de mines employant des enfants",
            sources: [
              {
                title: "Amnesty International — Cobalt et droits humains",
                url: "https://amnesty.org/cobalt",
              },
              {
                title: "OCDE — Devoir de diligence sur les minerais",
                url: "https://oecd.org/minerais-diligence",
              },
            ],
          },
        ],
      },
      {
        text: "Ce mélange n'est pas anodin. En alignant des faits exacts — l'eau du lithium, le coût carbone de la batterie — et des affirmations fausses ou invérifiables — la décharge, la pénurie datée —, l'article emprunte la crédibilité des premiers pour faire passer les seconds. C'est un procédé classique, et c'est précisément ce que la vérification cherche à désamorcer en séparant chaque affirmation.",
      },
      {
        text: "Le bilan honnête tient en une phrase : sur la durée de vie et dans un pays à l'électricité décarbonée, la voiture électrique émet nettement moins qu'une thermique, mais cet avantage n'est ni instantané, ni universel, et ses impacts miniers sont réels. « Arnaque » est un mot qui ferme le débat ; les chiffres, eux, l'ouvrent.",
      },
    ],
  },
];
